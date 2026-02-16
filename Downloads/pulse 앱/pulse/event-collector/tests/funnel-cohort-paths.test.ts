import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { FastifyInstance } from "fastify";
import { buildApp } from "../src/app.js";
import { AppConfig } from "../src/config.js";
import { InMemoryPolicyStore } from "../src/policies/policy-store.js";
import { InMemoryEventRepository } from "../src/repositories/in-memory-event-repository.js";

function makeTestConfig(): AppConfig {
  return {
    host: "127.0.0.1",
    port: 0,
    clickhouse: {
      enabled: false,
      url: "",
      database: "",
      username: "",
      password: "",
    },
    policy: {
      defaultTemplate: "balanced",
      configPath: "",
    },
    privacy: {
      stableIdSalt: "stable-test-salt",
      ipHashSalt: "ip-test-salt",
    },
    trafficFilter: {
      uaDenyPatterns: [],
      uaAllowPatterns: [],
      ipDenylist: [],
      ipAllowlist: [],
      asnDenylist: [],
      asnAllowlist: [],
      blockInternalTraffic: false,
    },
    retention: {
      cron: "0 3 * * *",
      jobEnabled: false,
      defaultRetentionDays: 180,
    },
    metrics: {
      sessionInactivityMinutes: 30,
      attentionHeartbeatMs: 5000,
      botUserAgentPattern: "(bot|crawler|spider|headless)",
      eqs: {
        attention: 0.5,
        scroll: 0.3,
        conversion: 0.2,
        attentionNormalizationMs: 30000,
      },
    },
    cohort: {
      refreshCron: "25 3 * * *",
      refreshEnabled: false,
      refreshLookbackDays: 30,
    },
    paths: {
      defaultTopN: 20,
      defaultMaxPathLength: 8,
      defaultSampleRate: 1,
      defaultEventFetchLimit: 300000,
    },
  };
}

describe("funnel/cohort/paths analytics", () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await buildApp({
      config: makeTestConfig(),
      repository: new InMemoryEventRepository(),
      policyStore: new InMemoryPolicyStore({
        analytics_site: {
          template: "balanced",
          denied_behavior: "minimal",
        },
      }),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("computes funnel step rates with conversion window and refund-aware revenue", async () => {
    const funnelRes = await app.inject({
      method: "POST",
      url: "/v1/funnels",
      payload: {
        site_id: "analytics_site",
        name: "signup to purchase",
        steps: ["page_view", "form_submit", "purchase"],
        conversion_window_minutes: 30,
      },
    });

    expect(funnelRes.statusCode).toBe(200);
    const funnelId = funnelRes.json().funnel_id as string;

    const base = new Date("2026-02-14T00:00:00.000Z").getTime();

    const events = [
      ["s1", "page_view", 0, { path: "/pricing" }],
      ["s1", "form_submit", 2, { path: "/pricing" }],
      ["s1", "purchase", 5, { path: "/pricing", amount: 100, currency: "USD" }],

      ["s2", "page_view", 10, { path: "/pricing" }],
      ["s2", "form_submit", 12, { path: "/pricing" }],

      ["s3", "page_view", 20, { path: "/pricing" }],
      ["s3", "form_submit", 25, { path: "/pricing" }],
      ["s3", "purchase", 80, { path: "/pricing", amount: 90, currency: "USD" }],

      ["s4", "page_view", 30, { path: "/pricing" }],
      ["s4", "form_submit", 31, { path: "/pricing" }],
      ["s4", "purchase", 32, { path: "/pricing", amount: 120, currency: "USD" }],
      ["s4", "refund", 35, { path: "/pricing", amount: 20, currency: "USD" }],
    ] as const;

    let sequence = 0;
    for (const [sessionId, eventName, minuteOffset, properties] of events) {
      const ts = new Date(base + minuteOffset * 60_000).toISOString();
      const response = await app.inject({
        method: "POST",
        url: "/v1/events",
        payload: {
          site_id: "analytics_site",
          session_id: sessionId,
          event_name: eventName,
          ts,
          properties,
          consent_state: "granted",
          idempotency_key: `funnel-${sessionId}-${eventName}-${sequence}`,
        },
      });
      sequence += 1;
      expect(response.statusCode).toBe(202);
    }

    const reportRes = await app.inject({
      method: "POST",
      url: `/v1/funnels/${funnelId}/report`,
      payload: {
        site_id: "analytics_site",
        from: "2026-02-13T23:00:00.000Z",
        to: "2026-02-14T03:00:00.000Z",
      },
    });

    expect(reportRes.statusCode).toBe(200);
    const report = reportRes.json();

    expect(report.steps.map((item: { sessions: number }) => item.sessions)).toEqual([4, 4, 2]);
    expect(report.steps[2].drop_off).toBe(2);
    expect(report.revenue_total).toBe(200);
    expect(report.revenue_avg).toBe(100);
  });

  it("refreshes cohort snapshots with version increments", async () => {
    const cohortRes = await app.inject({
      method: "POST",
      url: "/v1/cohorts",
      payload: {
        site_id: "analytics_site",
        name: "high intent",
        dsl: {
          all: [
            { type: "visit_count_gte", value: 2 },
            { type: "has_event", event_name: "purchase" },
          ],
        },
      },
    });

    expect(cohortRes.statusCode).toBe(200);
    const cohortId = cohortRes.json().cohort_id as string;

    const base = new Date("2026-02-14T10:00:00.000Z").getTime();

    const events = [
      ["c1", "page_view", 0],
      ["c1", "page_view", 1],
      ["c1", "purchase", 2, { amount: 40, currency: "USD" }],
      ["c2", "page_view", 0],
      ["c2", "purchase", 1, { amount: 20, currency: "USD" }],
      ["c3", "page_view", 0],
      ["c3", "page_view", 1],
    ] as const;

    let idx = 0;
    for (const row of events) {
      const [sessionId, eventName, minuteOffset, rawProps] = row;
      const response = await app.inject({
        method: "POST",
        url: "/v1/events",
        payload: {
          site_id: "analytics_site",
          session_id: sessionId,
          event_name: eventName,
          ts: new Date(base + minuteOffset * 60_000).toISOString(),
          properties: rawProps ?? { path: "/" },
          consent_state: "granted",
          idempotency_key: `cohort-${idx}`,
        },
      });
      idx += 1;
      expect(response.statusCode).toBe(202);
    }

    const firstRefresh = await app.inject({
      method: "POST",
      url: `/v1/cohorts/${cohortId}/refresh`,
      payload: {
        site_id: "analytics_site",
        from: "2026-02-14T09:00:00.000Z",
        to: "2026-02-14T12:00:00.000Z",
      },
    });

    expect(firstRefresh.statusCode).toBe(200);
    expect(firstRefresh.json().snapshot.member_count).toBe(1);
    expect(firstRefresh.json().snapshot.snapshot_version).toBe(1);
    expect(firstRefresh.json().session_ids).toEqual(["c1"]);

    const secondRefresh = await app.inject({
      method: "POST",
      url: `/v1/cohorts/${cohortId}/refresh`,
      payload: {
        site_id: "analytics_site",
        from: "2026-02-14T09:00:00.000Z",
        to: "2026-02-14T12:00:00.000Z",
      },
    });

    expect(secondRefresh.statusCode).toBe(200);
    expect(secondRefresh.json().snapshot.snapshot_version).toBe(2);
  });

  it("returns top paths with conversion/revenue contribution", async () => {
    const base = new Date("2026-02-14T14:00:00.000Z").getTime();

    const events = [
      ["p1", "page_view", 0, { path: "/" }],
      ["p1", "product_view", 1, { path: "/product/1" }],
      ["p1", "purchase", 2, { amount: 50, currency: "USD" }],

      ["p2", "page_view", 0, { path: "/" }],
      ["p2", "product_view", 1, { path: "/product/2" }],
      ["p2", "purchase", 2, { amount: 30, currency: "USD" }],

      ["p3", "page_view", 0, { path: "/" }],
      ["p3", "signup", 1, { path: "/signup" }],
      ["p3", "purchase", 2, { amount: 70, currency: "USD" }],
    ] as const;

    let seq = 0;
    for (const [sessionId, eventName, minuteOffset, properties] of events) {
      const response = await app.inject({
        method: "POST",
        url: "/v1/events",
        payload: {
          site_id: "analytics_site",
          session_id: sessionId,
          event_name: eventName,
          ts: new Date(base + minuteOffset * 60_000).toISOString(),
          properties,
          consent_state: "granted",
          idempotency_key: `path-${seq}`,
        },
      });
      seq += 1;
      expect(response.statusCode).toBe(202);
    }

    const pathRes = await app.inject({
      method: "POST",
      url: "/v1/paths/query",
      payload: {
        site_id: "analytics_site",
        from: "2026-02-14T13:00:00.000Z",
        to: "2026-02-14T16:00:00.000Z",
        start_event: "page_view",
        end_event: "purchase",
        top_n: 2,
        sample_rate: 1,
      },
    });

    expect(pathRes.statusCode).toBe(200);
    const rows = pathRes.json().rows;

    expect(rows.length).toBe(2);
    expect(rows[0].path).toBe("page_view > product_view > purchase");
    expect(rows[0].sessions).toBe(2);
    expect(rows[0].revenue_total).toBe(80);
    expect(rows[0].conversion_sessions).toBe(2);
  });
});
