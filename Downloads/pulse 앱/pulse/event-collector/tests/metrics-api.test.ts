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

describe("GET /v1/metrics/pages", () => {
  let app: FastifyInstance;
  let repository: InMemoryEventRepository;

  beforeEach(async () => {
    repository = new InMemoryEventRepository();

    app = await buildApp({
      config: makeTestConfig(),
      repository,
      policyStore: new InMemoryPolicyStore({
        demo_site: {
          template: "balanced",
          denied_behavior: "minimal",
        },
      }),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns 400 for invalid from/to query", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/v1/metrics/pages?from=invalid&to=2026-02-14T00:00:00.000Z",
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("invalid_query");
  });

  it("aggregates page metrics and returns eqs", async () => {
    const now = Date.now();
    const baseTs = new Date(now - 60_000).toISOString();

    const common = {
      site_id: "demo_site",
      session_id: "sess-metrics-1",
      ts: baseTs,
      consent_state: "granted" as const,
      properties: {
        path: "/pricing",
        referrer: "direct",
        device: "desktop",
      },
    };

    await app.inject({ method: "POST", url: "/v1/events", payload: { ...common, event_name: "page_view", idempotency_key: "pv-1" } });
    await app.inject({ method: "POST", url: "/v1/events", payload: { ...common, event_name: "active_attention_ms", idempotency_key: "att-1" } });
    await app.inject({ method: "POST", url: "/v1/events", payload: { ...common, event_name: "active_attention_ms", idempotency_key: "att-2" } });
    await app.inject({ method: "POST", url: "/v1/events", payload: { ...common, event_name: "scroll_depth_100", idempotency_key: "scroll-1" } });
    await app.inject({ method: "POST", url: "/v1/events", payload: { ...common, event_name: "form_submit", idempotency_key: "conv-1" } });

    const from = new Date(now - 10 * 60_000).toISOString();
    const to = new Date(now + 10 * 60_000).toISOString();

    const response = await app.inject({
      method: "GET",
      url: `/v1/metrics/pages?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&site_id=demo_site`,
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(Array.isArray(body.rows)).toBe(true);
    expect(body.rows.length).toBe(1);

    const row = body.rows[0];
    expect(row.page_path).toBe("/pricing");
    expect(row.page_views).toBe(1);
    expect(row.active_attention_ms_avg).toBe(10000);
    expect(row.scroll_readthrough_avg).toBe(1);
    expect(row.conversion_rate).toBe(1);
    expect(row.eqs).toBeGreaterThan(0);
  });

  it("excludes bot traffic from metrics", async () => {
    const now = Date.now();
    const ts = new Date(now - 60_000).toISOString();

    await app.inject({
      method: "POST",
      url: "/v1/events",
      headers: {
        "user-agent": "Googlebot/2.1",
      },
      payload: {
        site_id: "demo_site",
        session_id: "sess-bot-1",
        event_name: "page_view",
        ts,
        consent_state: "granted",
        idempotency_key: "bot-pv-1",
        properties: {
          path: "/bot-only",
          referrer: "direct",
          device: "desktop",
        },
      },
    });

    const from = new Date(now - 10 * 60_000).toISOString();
    const to = new Date(now + 10 * 60_000).toISOString();

    const response = await app.inject({
      method: "GET",
      url: `/v1/metrics/pages?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&site_id=demo_site`,
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().rows).toEqual([]);
  });
});
