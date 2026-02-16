import { randomUUID } from "node:crypto";
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

interface SessionInfo {
  siteId: string;
  userId: string;
  sessionSeq: number;
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

function isBotUserAgent(userAgent: string | null, botPattern: string): boolean {
  if (!userAgent) return false;

  try {
    return new RegExp(botPattern, "i").test(userAgent);
  } catch {
    return false;
  }
}

function isPagePathStep(step: string): boolean {
  return step.startsWith("/");
}

function matchesFunnelStep(event: StoredEvent, step: string): boolean {
  if (isPagePathStep(step)) {
    return parsePathFromProperties(event.properties_json) === step;
  }

  return event.event_name === step;
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

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function findStepEvent(
  events: StoredEvent[],
  step: string,
  startIndex: number,
  minTs: number,
  maxTs: number,
): number {
  for (let index = startIndex; index < events.length; index += 1) {
    const event = events[index];
    const eventTs = event.event_ts.getTime();
    if (eventTs < minTs) continue;
    if (eventTs > maxTs) break;

    if (matchesFunnelStep(event, step)) {
      return index;
    }
  }

  return -1;
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

export class InMemoryEventRepository implements EventRepository {
  readonly events: StoredEvent[] = [];
  readonly cohortSnapshots: CohortRefreshResult[] = [];

  private readonly dedupKeys = new Set<string>();
  private readonly funnelDefinitions = new Map<string, FunnelDefinitionRecord>();
  private readonly cohortDefinitions = new Map<string, CohortDefinitionRecord>();

  async isDuplicate(siteId: string, idempotencyKey: string): Promise<boolean> {
    return this.dedupKeys.has(`${siteId}:${idempotencyKey}`);
  }

  async insertEvent(event: StoredEvent): Promise<void> {
    this.events.push(event);
    this.dedupKeys.add(`${event.site_id}:${event.idempotency_key}`);
  }

  async queryPageMetrics(query: PageMetricsQuery): Promise<PageMetricsAggregate[]> {
    const filteredEvents = this.events
      .filter((event) => event.event_ts >= query.from && event.event_ts < query.to)
      .filter((event) => !query.siteId || event.site_id === query.siteId)
      .filter((event) => !isBotUserAgent(event.user_agent, query.botUserAgentPattern))
      .sort((a, b) => {
        if (a.site_id !== b.site_id) return a.site_id.localeCompare(b.site_id);
        if (a.user_id !== b.user_id) return a.user_id.localeCompare(b.user_id);
        return a.event_ts.getTime() - b.event_ts.getTime();
      });

    const sessionByEventId = new Map<string, SessionInfo>();
    const lastByUser = new Map<string, { ts: number; sessionSeq: number }>();

    for (const event of filteredEvents) {
      const userKey = `${event.site_id}:${event.user_id}`;
      const last = lastByUser.get(userKey);
      const nowTs = event.event_ts.getTime();
      const timeoutMs = query.sessionInactivityMinutes * 60 * 1000;

      const sessionSeq =
        !last || nowTs - last.ts >= timeoutMs ? (last?.sessionSeq ?? 0) + 1 : last.sessionSeq;

      lastByUser.set(userKey, { ts: nowTs, sessionSeq });
      sessionByEventId.set(event.event_id, {
        siteId: event.site_id,
        userId: event.user_id,
        sessionSeq,
      });
    }

    const byPath = new Map<string, PageMetricsAggregate>();
    const sessionKeysByPath = new Map<string, Set<string>>();

    for (const event of filteredEvents) {
      const pagePath = parsePathFromProperties(event.properties_json);
      const row = byPath.get(pagePath) ?? {
        page_path: pagePath,
        page_views: 0,
        sessions: 0,
        active_attention_ms_total: 0,
        scroll_read_events: 0,
        scroll_base_events: 0,
        micro_conversions: 0,
        bot_page_views: 0,
      };

      if (event.event_name === "page_view") {
        row.page_views += 1;
        row.scroll_base_events += 1;

        const session = sessionByEventId.get(event.event_id);
        if (session) {
          const sessionKey = `${session.siteId}:${session.userId}:${session.sessionSeq}`;
          const known = sessionKeysByPath.get(pagePath) ?? new Set<string>();
          known.add(sessionKey);
          sessionKeysByPath.set(pagePath, known);
        }
      }

      if (event.event_name === "active_attention_ms") {
        row.active_attention_ms_total += query.attentionHeartbeatMs;
      }

      if (event.event_name === "scroll_depth_75" || event.event_name === "scroll_depth_100") {
        row.scroll_read_events += 1;
      }

      if (
        event.event_name === "form_submit" ||
        event.event_name === "file_download" ||
        event.event_name === "outbound_click"
      ) {
        row.micro_conversions += 1;
      }

      byPath.set(pagePath, row);
    }

    for (const [pagePath, sessions] of sessionKeysByPath.entries()) {
      const row = byPath.get(pagePath);
      if (row) {
        row.sessions = sessions.size;
      }
    }

    return Array.from(byPath.values()).sort((a, b) => a.page_path.localeCompare(b.page_path));
  }

  async upsertFunnelDefinition(input: FunnelDefinitionInput): Promise<FunnelDefinitionRecord> {
    const funnelId = input.funnel_id?.trim() || `funnel_${randomUUID()}`;
    const key = `${input.site_id}:${funnelId}`;
    const existing = this.funnelDefinitions.get(key);
    const now = new Date();

    const record: FunnelDefinitionRecord = {
      funnel_id: funnelId,
      site_id: input.site_id,
      name: input.name,
      steps: input.steps,
      conversion_window_minutes: input.conversion_window_minutes,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    this.funnelDefinitions.set(key, record);
    return record;
  }

  async listFunnelDefinitions(siteId?: string): Promise<FunnelDefinitionRecord[]> {
    return Array.from(this.funnelDefinitions.values())
      .filter((item) => !siteId || item.site_id === siteId)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  async getFunnelDefinition(funnelId: string, siteId?: string): Promise<FunnelDefinitionRecord | null> {
    if (siteId) {
      return this.funnelDefinitions.get(`${siteId}:${funnelId}`) ?? null;
    }

    const found = Array.from(this.funnelDefinitions.values()).find(
      (item) => item.funnel_id === funnelId,
    );
    return found ?? null;
  }

  async queryFunnelAggregate(query: FunnelAggregateQuery): Promise<FunnelAggregateResult> {
    const steps = query.funnel.steps;
    const windowMs = Math.max(1, query.funnel.conversion_window_minutes) * 60 * 1000;
    const siteId = query.siteId ?? query.funnel.site_id;

    const bySession = new Map<string, StoredEvent[]>();

    for (const event of this.events) {
      if (event.site_id !== siteId) continue;
      if (event.event_ts < query.from || event.event_ts >= query.to) continue;

      const list = bySession.get(event.session_id) ?? [];
      list.push(event);
      bySession.set(event.session_id, list);
    }

    const stepSessions = new Array<number>(steps.length).fill(0);
    let baseSessions = 0;
    let convertedSessions = 0;
    let revenueTotal = 0;

    for (const sessionEvents of bySession.values()) {
      sessionEvents.sort((a, b) => a.event_ts.getTime() - b.event_ts.getTime());

      const firstStepIndex = findStepEvent(
        sessionEvents,
        steps[0],
        0,
        Number.NEGATIVE_INFINITY,
        Number.POSITIVE_INFINITY,
      );

      if (firstStepIndex < 0) continue;

      const firstStepTs = sessionEvents[firstStepIndex].event_ts.getTime();
      const deadlineTs = firstStepTs + windowMs;

      baseSessions += 1;
      stepSessions[0] += 1;

      let previousIndex = firstStepIndex;
      let fullyConverted = true;

      for (let stepIndex = 1; stepIndex < steps.length; stepIndex += 1) {
        const previousEvent = sessionEvents[previousIndex];
        const matchedIndex = findStepEvent(
          sessionEvents,
          steps[stepIndex],
          previousIndex,
          previousEvent.event_ts.getTime(),
          deadlineTs,
        );

        if (matchedIndex < 0) {
          fullyConverted = false;
          break;
        }

        stepSessions[stepIndex] += 1;
        previousIndex = matchedIndex;
      }

      if (!fullyConverted) continue;

      convertedSessions += 1;

      const sessionRevenue = sessionEvents
        .filter((event) => {
          const ts = event.event_ts.getTime();
          return ts >= firstStepTs && ts <= deadlineTs;
        })
        .reduce((sum, event) => sum + revenueDeltaFromStoredEvent(event), 0);

      revenueTotal += sessionRevenue;
    }

    return {
      step_sessions: stepSessions,
      base_sessions: baseSessions,
      converted_sessions: convertedSessions,
      revenue_total: round4(revenueTotal),
      revenue_avg: convertedSessions > 0 ? round4(revenueTotal / convertedSessions) : 0,
    };
  }

  async upsertCohortDefinition(input: CohortDefinitionInput): Promise<CohortDefinitionRecord> {
    const cohortId = input.cohort_id?.trim() || `cohort_${randomUUID()}`;
    const key = `${input.site_id}:${cohortId}`;
    const existing = this.cohortDefinitions.get(key);
    const now = new Date();

    const record: CohortDefinitionRecord = {
      cohort_id: cohortId,
      site_id: input.site_id,
      name: input.name,
      dsl: input.dsl,
      created_at: existing?.created_at ?? now,
      updated_at: now,
    };

    this.cohortDefinitions.set(key, record);
    return record;
  }

  async listCohortDefinitions(siteId?: string): Promise<CohortDefinitionRecord[]> {
    return Array.from(this.cohortDefinitions.values())
      .filter((item) => !siteId || item.site_id === siteId)
      .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
  }

  async getCohortDefinition(cohortId: string, siteId?: string): Promise<CohortDefinitionRecord | null> {
    if (siteId) {
      return this.cohortDefinitions.get(`${siteId}:${cohortId}`) ?? null;
    }

    const found = Array.from(this.cohortDefinitions.values()).find(
      (item) => item.cohort_id === cohortId,
    );

    return found ?? null;
  }

  async refreshCohortSnapshot(query: CohortRefreshQuery): Promise<CohortRefreshResult> {
    const siteId = query.cohort.site_id;
    const grouped = new Map<string, StoredEvent[]>();

    for (const event of this.events) {
      if (event.site_id !== siteId) continue;
      if (event.event_ts < query.from || event.event_ts >= query.to) continue;

      const current = grouped.get(event.session_id) ?? [];
      current.push(event);
      grouped.set(event.session_id, current);
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

    const previousVersion = this.cohortSnapshots
      .filter((snapshot) => snapshot.snapshot.cohort_id === query.cohort.cohort_id)
      .reduce((max, snapshot) => Math.max(max, snapshot.snapshot.snapshot_version), 0);

    const snapshotResult: CohortRefreshResult = {
      snapshot: {
        cohort_id: query.cohort.cohort_id,
        site_id: query.cohort.site_id,
        snapshot_version: previousVersion + 1,
        from: query.from,
        to: query.to,
        built_at: new Date(),
        member_count: matchedSessions.length,
      },
      session_ids: matchedSessions,
    };

    this.cohortSnapshots.push(snapshotResult);

    return snapshotResult;
  }

  async queryTopPaths(query: PathQuery): Promise<PathReportRow[]> {
    const sessions = new Map<string, StoredEvent[]>();

    for (const event of this.events) {
      if (event.site_id !== query.site_id) continue;
      if (event.event_ts < query.from || event.event_ts >= query.to) continue;

      if (deterministicSample(event.session_id) > query.sample_rate) {
        continue;
      }

      const current = sessions.get(event.session_id) ?? [];
      current.push(event);
      sessions.set(event.session_id, current);
    }

    const aggregates = new Map<string, SessionPathAggregate>();

    for (const sessionEvents of sessions.values()) {
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
    const before = this.events.length;
    const ruleMap = new Map(rules.map((rule) => [rule.siteId, rule.retentionDays]));
    const now = Date.now();

    const keep = this.events.filter((event) => {
      const retentionDays = ruleMap.get(event.site_id) ?? defaultRetentionDays;
      const cutoff = now - retentionDays * 24 * 60 * 60 * 1000;
      return event.ingested_at.getTime() >= cutoff;
    });

    this.events.length = 0;
    this.events.push(...keep);

    this.dedupKeys.clear();
    for (const event of this.events) {
      this.dedupKeys.add(`${event.site_id}:${event.idempotency_key}`);
    }

    return before - this.events.length;
  }
}
