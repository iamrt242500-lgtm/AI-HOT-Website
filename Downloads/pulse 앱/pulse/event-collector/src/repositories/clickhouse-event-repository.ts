import { randomUUID } from "node:crypto";
import { createClient, ClickHouseClient } from "@clickhouse/client";
import { revenueDeltaFromStoredEvent } from "../analytics/revenue.js";
import { calculateEqsScore } from "../metrics/eqs.js";
import {
  CohortCondition,
  CohortDefinitionInput,
  CohortDefinitionRecord,
  CohortRefreshQuery,
  CohortRefreshResult,
  FunnelAggregateQuery,
  FunnelAggregateResult,
  FunnelDefinitionInput,
  FunnelDefinitionRecord,
  PageMetricsAggregate,
  PageMetricsQuery,
  PathQuery,
  PathReportRow,
  StoredEvent,
} from "../types.js";
import { EventRepository, RetentionRule } from "./event-repository.js";

interface ClickHouseConfig {
  url: string;
  database: string;
  username: string;
  password: string;
}

interface SessionPathAggregate {
  path: string;
  sessions: number;
  conversion_sessions: number;
  revenue_total: number;
}

const MICRO_CONVERSION_EVENT_SET = new Set([
  "form_submit",
  "file_download",
  "outbound_click",
  "purchase",
  "subscription_start",
  "donation",
]);

const POSITIVE_REVENUE_EVENT_SET = new Set([
  "purchase",
  "subscription_start",
  "donation",
]);

function parseProperties(propertiesJson: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(propertiesJson) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parsePathFromProperties(propertiesJson: string): string {
  const parsed = parseProperties(propertiesJson);
  const path = parsed.path;
  if (typeof path === "string" && path.trim().length > 0) {
    return path;
  }

  return "/";
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function toDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "number") {
    return new Date(value);
  }

  if (typeof value === "string") {
    return new Date(value);
  }

  return new Date(0);
}

function parseArrayText(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === "string");
  }

  if (typeof raw !== "string") {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string");
    }
  } catch {
    return [];
  }

  return [];
}

function deterministicSample(sessionId: string): number {
  let hash = 2166136261;
  for (let i = 0; i < sessionId.length; i += 1) {
    hash ^= sessionId.charCodeAt(i);
    hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
  }

  const normalized = (hash >>> 0) / 0xffffffff;
  return Math.min(1, Math.max(0, normalized));
}

function evaluateCohortCondition(
  condition: CohortCondition,
  metrics: {
    visitCount: number;
    events: Set<string>;
    utmSources: Set<string>;
    eqs: number;
  },
): boolean {
  if (condition.type === "visit_count_gte") {
    return metrics.visitCount >= condition.value;
  }

  if (condition.type === "has_event") {
    return metrics.events.has(condition.event_name);
  }

  if (condition.type === "eqs_gte") {
    return metrics.eqs >= condition.value;
  }

  if (condition.type === "utm_source_in") {
    if (condition.values.length === 0) return false;
    return condition.values.some((value) => metrics.utmSources.has(value));
  }

  return false;
}

function isPagePathStep(step: string): boolean {
  return step.startsWith("/");
}

function stepPredicate(alias: string, index: number, step: string): string {
  if (isPagePathStep(step)) {
    return `${alias}.page_path = {step_${index}:String}`;
  }

  return `${alias}.event_name = {step_${index}:String}`;
}

function buildFunnelCommonCte(steps: string[]): string {
  const ctes: string[] = [];

  ctes.push(`
    filtered AS (
      SELECT
        session_id,
        event_ts,
        event_name,
        if(empty(JSONExtractString(properties_json, 'path')), '/', JSONExtractString(properties_json, 'path')) AS page_path,
        ifNull(
          toFloat64(revenue_amount),
          if(
            event_name = 'refund',
            -abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
            if(
              event_name IN ('purchase', 'subscription_start', 'donation'),
              abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
              0.0
            )
          )
        ) AS revenue_delta
      FROM events_raw
      WHERE site_id = {site_id:String}
        AND event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
        AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
    )
  `);

  ctes.push(`
    step_0 AS (
      SELECT
        session_id,
        min(event_ts) AS s0_ts
      FROM filtered f0
      WHERE ${stepPredicate("f0", 0, steps[0])}
      GROUP BY session_id
    )
  `);

  for (let index = 1; index < steps.length; index += 1) {
    const previousAlias = `s${index - 1}`;
    const selectedPrevColumns = Array.from({ length: index }, (_, colIndex) => {
      return `${previousAlias}.s${colIndex}_ts`;
    }).join(",\n        ");

    const groupedPrevColumns = Array.from({ length: index }, (_, colIndex) => {
      return `${previousAlias}.s${colIndex}_ts`;
    }).join(", ");

    ctes.push(`
      step_${index} AS (
        SELECT
          ${previousAlias}.session_id,
          ${selectedPrevColumns},
          min(f${index}.event_ts) AS s${index}_ts
        FROM step_${index - 1} ${previousAlias}
        LEFT JOIN filtered f${index}
          ON ${previousAlias}.session_id = f${index}.session_id
          AND ${previousAlias}.s${index - 1}_ts IS NOT NULL
          AND f${index}.event_ts >= ${previousAlias}.s${index - 1}_ts
          AND f${index}.event_ts <= ${previousAlias}.s0_ts + INTERVAL {window_minutes:Int32} MINUTE
          AND ${stepPredicate(`f${index}`, index, steps[index])}
        GROUP BY ${previousAlias}.session_id, ${groupedPrevColumns}
      )
    `);
  }

  return ctes.join(",\n");
}

export class ClickHouseEventRepository implements EventRepository {
  private readonly client: ClickHouseClient;

  constructor(config: ClickHouseConfig) {
    this.client = createClient({
      url: config.url,
      database: config.database,
      username: config.username,
      password: config.password,
    });
  }

  async isDuplicate(siteId: string, idempotencyKey: string): Promise<boolean> {
    const result = await this.client.query({
      query: `
        SELECT count() AS cnt
        FROM events_raw
        WHERE site_id = {site_id:String}
          AND idempotency_key = {idempotency_key:String}
        LIMIT 1
      `,
      query_params: {
        site_id: siteId,
        idempotency_key: idempotencyKey,
      },
      format: "JSONEachRow",
    });

    const rows = (await result.json()) as Array<{ cnt: string | number }>;
    const count = Number(rows[0]?.cnt ?? 0);
    return count > 0;
  }

  async insertEvent(event: StoredEvent): Promise<void> {
    await this.client.insert({
      table: "events_raw",
      format: "JSONEachRow",
      values: [
        {
          ...event,
          event_ts: event.event_ts.toISOString(),
          ingested_at: event.ingested_at.toISOString(),
        },
      ],
    });
  }

  async queryPageMetrics(query: PageMetricsQuery): Promise<PageMetricsAggregate[]> {
    const result = await this.client.query({
      query: `
        WITH filtered AS (
          SELECT
            site_id,
            if(empty(JSONExtractString(properties_json, 'path')), '/', JSONExtractString(properties_json, 'path')) AS page_path,
            event_name,
            event_ts,
            user_id,
            user_agent
          FROM events_raw
          WHERE event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
            AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
            AND ({has_site_filter:UInt8} = 0 OR site_id = {site_id:String})
            AND NOT match(lowerUTF8(ifNull(user_agent, '')), {bot_pattern:String})
        ),
        marked AS (
          SELECT
            site_id,
            page_path,
            event_name,
            event_ts,
            user_id,
            if(
              lagInFrame(event_ts) OVER (PARTITION BY site_id, user_id ORDER BY event_ts) IS NULL
                OR dateDiff(
                  'minute',
                  lagInFrame(event_ts) OVER (PARTITION BY site_id, user_id ORDER BY event_ts),
                  event_ts
                ) >= {session_gap_minutes:Int32},
              1,
              0
            ) AS new_session
          FROM filtered
        ),
        sessionized AS (
          SELECT
            site_id,
            page_path,
            event_name,
            user_id,
            sum(new_session) OVER (
              PARTITION BY site_id, user_id
              ORDER BY event_ts
              ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
            ) AS session_seq
          FROM marked
        )
        SELECT
          page_path,
          countIf(event_name = 'page_view') AS page_views,
          countDistinctIf(tuple(site_id, user_id, session_seq), event_name = 'page_view') AS sessions,
          countIf(event_name = 'active_attention_ms') * {attention_heartbeat_ms:Int32} AS active_attention_ms_total,
          countIf(event_name IN ('scroll_depth_75', 'scroll_depth_100')) AS scroll_read_events,
          countIf(event_name = 'page_view') AS scroll_base_events,
          countIf(event_name IN ('form_submit', 'file_download', 'outbound_click')) AS micro_conversions,
          0 AS bot_page_views
        FROM sessionized
        GROUP BY page_path
        ORDER BY page_path ASC
      `,
      query_params: {
        from: query.from.toISOString(),
        to: query.to.toISOString(),
        has_site_filter: query.siteId ? 1 : 0,
        site_id: query.siteId ?? "",
        session_gap_minutes: query.sessionInactivityMinutes,
        attention_heartbeat_ms: query.attentionHeartbeatMs,
        bot_pattern: query.botUserAgentPattern,
      },
      format: "JSONEachRow",
    });

    const rows = (await result.json()) as Array<Record<string, string | number>>;

    return rows.map((row) => ({
      page_path: String(row.page_path ?? "/"),
      page_views: Number(row.page_views ?? 0),
      sessions: Number(row.sessions ?? 0),
      active_attention_ms_total: Number(row.active_attention_ms_total ?? 0),
      scroll_read_events: Number(row.scroll_read_events ?? 0),
      scroll_base_events: Number(row.scroll_base_events ?? 0),
      micro_conversions: Number(row.micro_conversions ?? 0),
      bot_page_views: Number(row.bot_page_views ?? 0),
    }));
  }

  async upsertFunnelDefinition(input: FunnelDefinitionInput): Promise<FunnelDefinitionRecord> {
    const funnelId = input.funnel_id?.trim() || `funnel_${randomUUID()}`;
    const now = new Date();

    await this.client.insert({
      table: "funnel_definitions",
      format: "JSONEachRow",
      values: [
        {
          funnel_id: funnelId,
          site_id: input.site_id,
          name: input.name,
          steps_json: JSON.stringify(input.steps),
          conversion_window_minutes: input.conversion_window_minutes,
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ],
    });

    return {
      funnel_id: funnelId,
      site_id: input.site_id,
      name: input.name,
      steps: input.steps,
      conversion_window_minutes: input.conversion_window_minutes,
      created_at: now,
      updated_at: now,
    };
  }

  async listFunnelDefinitions(siteId?: string): Promise<FunnelDefinitionRecord[]> {
    const result = await this.client.query({
      query: `
        SELECT
          funnel_id,
          site_id,
          argMax(name, updated_at) AS name,
          argMax(steps_json, updated_at) AS steps_json,
          argMax(conversion_window_minutes, updated_at) AS conversion_window_minutes,
          min(created_at) AS created_at,
          max(updated_at) AS updated_at
        FROM funnel_definitions
        WHERE ({has_site_filter:UInt8} = 0 OR site_id = {site_id:String})
        GROUP BY funnel_id, site_id
        ORDER BY updated_at DESC
      `,
      query_params: {
        has_site_filter: siteId ? 1 : 0,
        site_id: siteId ?? "",
      },
      format: "JSONEachRow",
    });

    const rows = (await result.json()) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      funnel_id: String(row.funnel_id),
      site_id: String(row.site_id),
      name: String(row.name),
      steps: parseArrayText(row.steps_json),
      conversion_window_minutes: Number(row.conversion_window_minutes ?? 30),
      created_at: toDate(row.created_at),
      updated_at: toDate(row.updated_at),
    }));
  }

  async getFunnelDefinition(funnelId: string, siteId?: string): Promise<FunnelDefinitionRecord | null> {
    const list = await this.listFunnelDefinitions(siteId);
    return list.find((item) => item.funnel_id === funnelId) ?? null;
  }

  async queryFunnelAggregate(query: FunnelAggregateQuery): Promise<FunnelAggregateResult> {
    const siteId = query.siteId ?? query.funnel.site_id;
    const steps = query.funnel.steps;
    const commonCte = buildFunnelCommonCte(steps);
    const finalStepAlias = `step_${steps.length - 1}`;

    const queryParams: Record<string, string | number> = {
      site_id: siteId,
      from: query.from.toISOString(),
      to: query.to.toISOString(),
      window_minutes: query.funnel.conversion_window_minutes,
    };

    for (let index = 0; index < steps.length; index += 1) {
      queryParams[`step_${index}`] = steps[index];
    }

    const countColumns = steps
      .map((_, index) => `countIf(s${index}_ts IS NOT NULL) AS step_${index}_sessions`)
      .join(",\n          ");

    const countsResult = await this.client.query({
      query: `
        WITH
        ${commonCte}
        SELECT
          ${countColumns}
        FROM ${finalStepAlias}
      `,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    const countRows = (await countsResult.json()) as Array<Record<string, string | number>>;
    const countRow = countRows[0] ?? {};

    const stepSessions = steps.map((_, index) => Number(countRow[`step_${index}_sessions`] ?? 0));

    const revenueResult = await this.client.query({
      query: `
        WITH
        ${commonCte}
        SELECT
          ifNull(sum(session_revenue), 0) AS revenue_total,
          ifNull(avg(session_revenue), 0) AS revenue_avg
        FROM (
          SELECT
            s.session_id,
            sum(f.revenue_delta) AS session_revenue
          FROM ${finalStepAlias} s
          LEFT JOIN filtered f
            ON f.session_id = s.session_id
            AND f.event_ts >= s.s0_ts
            AND f.event_ts <= s.s0_ts + INTERVAL {window_minutes:Int32} MINUTE
          WHERE s.s${steps.length - 1}_ts IS NOT NULL
          GROUP BY s.session_id
        )
      `,
      query_params: queryParams,
      format: "JSONEachRow",
    });

    const revenueRows = (await revenueResult.json()) as Array<Record<string, string | number>>;
    const revenueRow = revenueRows[0] ?? {};

    return {
      step_sessions: stepSessions,
      base_sessions: stepSessions[0] ?? 0,
      converted_sessions: stepSessions[steps.length - 1] ?? 0,
      revenue_total: round4(Number(revenueRow.revenue_total ?? 0)),
      revenue_avg: round4(Number(revenueRow.revenue_avg ?? 0)),
    };
  }

  async upsertCohortDefinition(input: CohortDefinitionInput): Promise<CohortDefinitionRecord> {
    const cohortId = input.cohort_id?.trim() || `cohort_${randomUUID()}`;
    const now = new Date();

    await this.client.insert({
      table: "cohort_definitions",
      format: "JSONEachRow",
      values: [
        {
          cohort_id: cohortId,
          site_id: input.site_id,
          name: input.name,
          dsl_json: JSON.stringify(input.dsl),
          created_at: now.toISOString(),
          updated_at: now.toISOString(),
        },
      ],
    });

    return {
      cohort_id: cohortId,
      site_id: input.site_id,
      name: input.name,
      dsl: input.dsl,
      created_at: now,
      updated_at: now,
    };
  }

  async listCohortDefinitions(siteId?: string): Promise<CohortDefinitionRecord[]> {
    const result = await this.client.query({
      query: `
        SELECT
          cohort_id,
          site_id,
          argMax(name, updated_at) AS name,
          argMax(dsl_json, updated_at) AS dsl_json,
          min(created_at) AS created_at,
          max(updated_at) AS updated_at
        FROM cohort_definitions
        WHERE ({has_site_filter:UInt8} = 0 OR site_id = {site_id:String})
        GROUP BY cohort_id, site_id
        ORDER BY updated_at DESC
      `,
      query_params: {
        has_site_filter: siteId ? 1 : 0,
        site_id: siteId ?? "",
      },
      format: "JSONEachRow",
    });

    const rows = (await result.json()) as Array<Record<string, unknown>>;

    return rows.map((row) => {
      const dslParsed = parseProperties(String(row.dsl_json ?? "{}"));
      const all = Array.isArray(dslParsed.all) ? dslParsed.all : [];

      return {
        cohort_id: String(row.cohort_id),
        site_id: String(row.site_id),
        name: String(row.name),
        dsl: {
          all: all as CohortCondition[],
        },
        created_at: toDate(row.created_at),
        updated_at: toDate(row.updated_at),
      };
    });
  }

  async getCohortDefinition(cohortId: string, siteId?: string): Promise<CohortDefinitionRecord | null> {
    const list = await this.listCohortDefinitions(siteId);
    return list.find((item) => item.cohort_id === cohortId) ?? null;
  }

  async refreshCohortSnapshot(query: CohortRefreshQuery): Promise<CohortRefreshResult> {
    const eventsResult = await this.client.query({
      query: `
        SELECT
          site_id,
          session_id,
          event_name,
          event_ts,
          properties_json,
          ifNull(toFloat64(revenue_amount), 0.0) AS revenue_amount
        FROM events_raw
        WHERE site_id = {site_id:String}
          AND event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
          AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
        ORDER BY session_id ASC, event_ts ASC
      `,
      query_params: {
        site_id: query.cohort.site_id,
        from: query.from.toISOString(),
        to: query.to.toISOString(),
      },
      format: "JSONEachRow",
    });

    const rows = (await eventsResult.json()) as Array<Record<string, string | number>>;
    const grouped = new Map<string, StoredEvent[]>();

    for (const row of rows) {
      const sessionId = String(row.session_id ?? "");
      if (!sessionId) continue;

      const stored: StoredEvent = {
        event_id: "",
        site_id: String(row.site_id ?? query.cohort.site_id),
        event_name: String(row.event_name ?? ""),
        event_ts: toDate(row.event_ts),
        ingested_at: toDate(row.event_ts),
        properties_json: String(row.properties_json ?? "{}"),
        consent_state: "unknown",
        policy_template: "balanced",
        denied_behavior: "minimal",
        user_kind: "anonymous",
        user_id: `anon:${sessionId}`,
        session_id: sessionId,
        stable_id_hash: null,
        idempotency_key: "",
        user_agent: null,
        asn: null,
        ip_masked: null,
        ip_hash: null,
        revenue_amount: Number(row.revenue_amount ?? 0),
        revenue_currency: null,
        product: null,
        payment_provider: null,
      };

      const list = grouped.get(sessionId) ?? [];
      list.push(stored);
      grouped.set(sessionId, list);
    }

    const matchedSessions: string[] = [];

    for (const [sessionId, sessionEvents] of grouped.entries()) {
      sessionEvents.sort((a, b) => a.event_ts.getTime() - b.event_ts.getTime());

      const visitCount = sessionEvents.filter((event) => event.event_name === "page_view").length;
      const eventSet = new Set(sessionEvents.map((event) => event.event_name));

      const utmSources = new Set<string>();
      for (const event of sessionEvents) {
        const props = parseProperties(event.properties_json);
        if (typeof props.utm_source === "string") {
          utmSources.add(props.utm_source);
        }
      }

      const attentionMs =
        sessionEvents.filter((event) => event.event_name === "active_attention_ms").length *
        query.metrics.attentionHeartbeatMs;
      const scrollRead = sessionEvents.filter(
        (event) => event.event_name === "scroll_depth_75" || event.event_name === "scroll_depth_100",
      ).length;
      const conversions = sessionEvents.filter((event) => MICRO_CONVERSION_EVENT_SET.has(event.event_name))
        .length;

      const eqs = calculateEqsScore(
        {
          pageViews: visitCount,
          activeAttentionMsAvg: visitCount > 0 ? attentionMs / visitCount : 0,
          scrollReadthroughAvg: visitCount > 0 ? scrollRead / visitCount : 0,
          conversionRate: visitCount > 0 ? conversions / visitCount : 0,
        },
        query.metrics.eqsWeights,
      );

      const passed = query.cohort.dsl.all.every((condition) =>
        evaluateCohortCondition(condition, {
          visitCount,
          events: eventSet,
          utmSources,
          eqs,
        }),
      );

      if (passed) {
        matchedSessions.push(sessionId);
      }
    }

    matchedSessions.sort();

    const versionResult = await this.client.query({
      query: `
        SELECT ifNull(max(snapshot_version), 0) + 1 AS next_version
        FROM cohort_snapshots
        WHERE site_id = {site_id:String}
          AND cohort_id = {cohort_id:String}
      `,
      query_params: {
        site_id: query.cohort.site_id,
        cohort_id: query.cohort.cohort_id,
      },
      format: "JSONEachRow",
    });

    const versionRows = (await versionResult.json()) as Array<Record<string, string | number>>;
    const nextVersion = Number(versionRows[0]?.next_version ?? 1);
    const builtAt = new Date();

    await this.client.insert({
      table: "cohort_snapshots",
      format: "JSONEachRow",
      values: [
        {
          cohort_id: query.cohort.cohort_id,
          site_id: query.cohort.site_id,
          snapshot_version: nextVersion,
          from_ts: query.from.toISOString(),
          to_ts: query.to.toISOString(),
          built_at: builtAt.toISOString(),
          member_count: matchedSessions.length,
        },
      ],
    });

    if (matchedSessions.length > 0) {
      await this.client.insert({
        table: "cohort_memberships",
        format: "JSONEachRow",
        values: matchedSessions.map((sessionId) => ({
          cohort_id: query.cohort.cohort_id,
          site_id: query.cohort.site_id,
          snapshot_version: nextVersion,
          session_id: sessionId,
          built_at: builtAt.toISOString(),
        })),
      });
    }

    return {
      snapshot: {
        cohort_id: query.cohort.cohort_id,
        site_id: query.cohort.site_id,
        snapshot_version: nextVersion,
        from: query.from,
        to: query.to,
        built_at: builtAt,
        member_count: matchedSessions.length,
      },
      session_ids: matchedSessions,
    };
  }

  async queryTopPaths(query: PathQuery): Promise<PathReportRow[]> {
    const sampleRate = Math.min(1, Math.max(0, query.sample_rate));
    const sampleThreshold = Math.floor(sampleRate * 1_000_000);

    const result = await this.client.query({
      query: `
        SELECT
          session_id,
          event_name,
          event_ts,
          properties_json,
          ifNull(
            toFloat64(revenue_amount),
            if(
              event_name = 'refund',
              -abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
              if(
                event_name IN ('purchase', 'subscription_start', 'donation'),
                abs(ifNull(JSONExtractFloat(properties_json, 'amount'), 0.0)),
                0.0
              )
            )
          ) AS revenue_amount
        FROM events_raw
        WHERE site_id = {site_id:String}
          AND event_ts >= parseDateTime64BestEffort({from:String}, 3, 'UTC')
          AND event_ts < parseDateTime64BestEffort({to:String}, 3, 'UTC')
          AND cityHash64(session_id) % 1000000 < {sample_threshold:UInt64}
        ORDER BY session_id ASC, event_ts ASC
        LIMIT {event_fetch_limit:UInt32}
      `,
      query_params: {
        site_id: query.site_id,
        from: query.from.toISOString(),
        to: query.to.toISOString(),
        sample_threshold: sampleThreshold,
        event_fetch_limit: query.event_fetch_limit,
      },
      format: "JSONEachRow",
    });

    const rows = (await result.json()) as Array<Record<string, string | number>>;
    const grouped = new Map<string, StoredEvent[]>();

    for (const row of rows) {
      const sessionId = String(row.session_id ?? "");
      if (!sessionId) continue;

      if (deterministicSample(sessionId) > query.sample_rate) {
        continue;
      }

      const stored: StoredEvent = {
        event_id: "",
        site_id: query.site_id,
        event_name: String(row.event_name ?? ""),
        event_ts: toDate(row.event_ts),
        ingested_at: toDate(row.event_ts),
        properties_json: String(row.properties_json ?? "{}"),
        consent_state: "unknown",
        policy_template: "balanced",
        denied_behavior: "minimal",
        user_kind: "anonymous",
        user_id: `anon:${sessionId}`,
        session_id: sessionId,
        stable_id_hash: null,
        idempotency_key: "",
        user_agent: null,
        asn: null,
        ip_masked: null,
        ip_hash: null,
        revenue_amount: Number(row.revenue_amount ?? 0),
        revenue_currency: null,
        product: null,
        payment_provider: null,
      };

      const list = grouped.get(sessionId) ?? [];
      list.push(stored);
      grouped.set(sessionId, list);
    }

    const aggregates = new Map<string, SessionPathAggregate>();

    for (const sessionEvents of grouped.values()) {
      sessionEvents.sort((a, b) => a.event_ts.getTime() - b.event_ts.getTime());

      const startIndex = sessionEvents.findIndex((event) => event.event_name === query.start_event);
      if (startIndex < 0) continue;

      let endIndex = -1;
      for (let index = startIndex; index < sessionEvents.length; index += 1) {
        if (sessionEvents[index].event_name === query.end_event) {
          endIndex = index;
          break;
        }
      }

      if (endIndex < 0) continue;

      const segment = sessionEvents.slice(startIndex, endIndex + 1);
      if (segment.length === 0) continue;

      const truncated =
        segment.length > query.max_path_length
          ? [...segment.slice(0, query.max_path_length - 1), segment[segment.length - 1]]
          : segment;

      const path = truncated.map((event) => event.event_name).join(" > ");
      const revenue = segment.reduce((sum, event) => sum + revenueDeltaFromStoredEvent(event), 0);
      const isConversion = segment.some((event) => POSITIVE_REVENUE_EVENT_SET.has(event.event_name));

      const row = aggregates.get(path) ?? {
        path,
        sessions: 0,
        conversion_sessions: 0,
        revenue_total: 0,
      };

      row.sessions += 1;
      if (isConversion) {
        row.conversion_sessions += 1;
      }
      row.revenue_total += revenue;

      aggregates.set(path, row);
    }

    const totalConversionSessions = Array.from(aggregates.values()).reduce(
      (sum, row) => sum + row.conversion_sessions,
      0,
    );

    return Array.from(aggregates.values())
      .map<PathReportRow>((row) => ({
        path: row.path,
        sessions: row.sessions,
        conversion_sessions: row.conversion_sessions,
        revenue_total: round4(row.revenue_total),
        revenue_avg: row.sessions > 0 ? round4(row.revenue_total / row.sessions) : 0,
        conversion_contribution:
          totalConversionSessions > 0 ? round4(row.conversion_sessions / totalConversionSessions) : 0,
      }))
      .sort((a, b) => b.sessions - a.sessions || b.revenue_total - a.revenue_total)
      .slice(0, query.top_n);
  }

  async deleteExpired(rules: RetentionRule[], defaultRetentionDays: number): Promise<number> {
    let queryCount = 0;

    for (const rule of rules) {
      const retentionDays = Math.max(1, Math.floor(rule.retentionDays));

      await this.client.command({
        query: `
          ALTER TABLE events_raw
          DELETE WHERE site_id = {site_id:String}
            AND ingested_at < now() - INTERVAL ${retentionDays} DAY
        `,
        query_params: {
          site_id: rule.siteId,
        },
      });

      queryCount += 1;
    }

    const defaultDays = Math.max(1, Math.floor(defaultRetentionDays));

    if (rules.length > 0) {
      await this.client.command({
        query: `
          ALTER TABLE events_raw
          DELETE WHERE site_id NOT IN {site_ids:Array(String)}
            AND ingested_at < now() - INTERVAL ${defaultDays} DAY
        `,
        query_params: {
          site_ids: rules.map((rule) => rule.siteId),
        },
      });
    } else {
      await this.client.command({
        query: `
          ALTER TABLE events_raw
          DELETE WHERE ingested_at < now() - INTERVAL ${defaultDays} DAY
        `,
      });
    }

    queryCount += 1;

    return queryCount;
  }

  async close(): Promise<void> {
    await this.client.close();
  }
}
