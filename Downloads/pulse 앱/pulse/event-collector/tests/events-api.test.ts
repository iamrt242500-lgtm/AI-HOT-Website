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

describe("POST /v1/events", () => {
  let app: FastifyInstance;
  let repository: InMemoryEventRepository;

  beforeEach(async () => {
    repository = new InMemoryEventRepository();

    app = await buildApp({
      config: makeTestConfig(),
      repository,
      policyStore: new InMemoryPolicyStore({
        test_site_drop: {
          template: "strict",
          denied_behavior: "drop",
        },
        test_site_minimal: {
          template: "balanced",
          denied_behavior: "minimal",
        },
      }),
    });
  });

  afterEach(async () => {
    await app.close();
  });

  it("returns 400 when required field is missing", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        site_id: "test_site_drop",
        event_name: "page_view",
        ts: new Date().toISOString(),
        consent_state: "granted",
      },
    });

    expect(response.statusCode).toBe(400);
    const body = response.json();
    expect(body.error.code).toBe("invalid_payload");
  });

  it("drops event when consent denied and policy is strict(drop)", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        site_id: "test_site_drop",
        session_id: "sess-drop-1",
        event_name: "page_view",
        ts: new Date().toISOString(),
        properties: { url: "/home" },
        consent_state: "denied",
        idempotency_key: "drop-1",
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.status).toBe("dropped");
    expect(repository.events.length).toBe(0);
  });

  it("stores minimal payload when consent denied and policy is minimal", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        site_id: "test_site_minimal",
        session_id: "sess-minimal-1",
        event_name: "purchase",
        ts: new Date().toISOString(),
        properties: { amount: 120, currency: "USD" },
        consent_state: "denied",
        idempotency_key: "minimal-1",
      },
    });

    expect(response.statusCode).toBe(202);
    const body = response.json();
    expect(body.status).toBe("stored");
    expect(repository.events.length).toBe(1);
    expect(repository.events[0].properties_json).toBe("{}");
  });

  it("prevents duplicate insertion with idempotency_key", async () => {
    const payload = {
      site_id: "test_site_minimal",
      session_id: "sess-dup-1",
      event_name: "click",
      ts: new Date().toISOString(),
      properties: { button: "cta" },
      consent_state: "granted",
      idempotency_key: "dup-1",
    };

    const first = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload,
    });

    const second = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload,
    });

    expect(first.statusCode).toBe(202);
    expect(second.statusCode).toBe(202);

    expect(first.json().status).toBe("stored");
    expect(second.json().status).toBe("duplicate");
    expect(repository.events.length).toBe(1);
  });

  it("stores only hashed stable_id for authenticated users", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        site_id: "test_site_minimal",
        session_id: "sess-stable-1",
        event_name: "login",
        ts: new Date().toISOString(),
        properties: { method: "password" },
        consent_state: "granted",
        idempotency_key: "stable-1",
        user: {
          stable_user_id: "user-123",
          is_authenticated: true,
        },
      },
    });

    expect(response.statusCode).toBe(202);
    expect(repository.events.length).toBe(1);

    const event = repository.events[0];
    expect(event.user_kind).toBe("stable");
    expect(event.stable_id_hash).toMatch(/^[a-f0-9]{64}$/);
    expect(event.user_id).toContain("stable:");
    expect(event.user_id).not.toContain("user-123");
    expect(event.session_id).toBe("sess-stable-1");
  });

  it("validates revenue payload for purchase events", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/v1/events",
      payload: {
        site_id: "test_site_minimal",
        session_id: "sess-revenue-invalid-1",
        event_name: "purchase",
        ts: new Date().toISOString(),
        properties: { product: "pro" },
        consent_state: "granted",
        idempotency_key: "revenue-invalid-1",
      },
    });

    expect(response.statusCode).toBe(400);
    expect(response.json().error.code).toBe("invalid_payload");
  });
});
