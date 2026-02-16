import { performance } from "node:perf_hooks";
import { InMemoryEventRepository } from "../src/repositories/in-memory-event-repository.js";
import { generateSeedEvents } from "../tests/helpers/seed-generator.js";

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, rank)];
}

async function main() {
  const repository = new InMemoryEventRepository();
  const seedEvents = generateSeedEvents({
    siteId: "perf_site",
    sessionCount: 12000,
    days: 30,
  });

  const insertStart = performance.now();
  for (const event of seedEvents) {
    await repository.insertEvent({
      event_id: `${event.session_id}:${event.idempotency_key}`,
      site_id: event.site_id,
      event_name: event.event_name,
      event_ts: new Date(event.ts),
      ingested_at: new Date(event.ts),
      properties_json: JSON.stringify(event.properties),
      consent_state: event.consent_state,
      policy_template: "balanced",
      denied_behavior: "minimal",
      user_kind: "anonymous",
      user_id: `anon:${event.session_id}`,
      session_id: event.session_id,
      stable_id_hash: null,
      idempotency_key: event.idempotency_key || "",
      user_agent: null,
      asn: null,
      ip_masked: null,
      ip_hash: null,
      revenue_amount:
        event.event_name === "purchase"
          ? Number((event.properties.amount as number | undefined) ?? 0)
          : event.event_name === "refund"
            ? -Math.abs(Number((event.properties.amount as number | undefined) ?? 0))
            : null,
      revenue_currency: typeof event.properties.currency === "string" ? event.properties.currency : null,
      product: typeof event.properties.product === "string" ? event.properties.product : null,
      payment_provider:
        typeof event.properties.payment_provider === "string"
          ? event.properties.payment_provider
          : null,
    });
  }
  const insertEnd = performance.now();

  const insertSeconds = (insertEnd - insertStart) / 1000;
  const eventsPerSecond = seedEvents.length / insertSeconds;

  const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const to = new Date();

  await repository.upsertFunnelDefinition({
    funnel_id: "perf_funnel",
    site_id: "perf_site",
    name: "perf funnel",
    steps: ["page_view", "form_submit", "purchase"],
    conversion_window_minutes: 60,
  });

  const funnelDurations: number[] = [];
  const pathDurations: number[] = [];

  for (let i = 0; i < 30; i += 1) {
    const funnelStart = performance.now();
    await repository.queryFunnelAggregate({
      funnel: {
        funnel_id: "perf_funnel",
        site_id: "perf_site",
        name: "perf funnel",
        steps: ["page_view", "form_submit", "purchase"],
        conversion_window_minutes: 60,
        created_at: new Date(),
        updated_at: new Date(),
      },
      from,
      to,
      siteId: "perf_site",
    });
    funnelDurations.push(performance.now() - funnelStart);

    const pathStart = performance.now();
    await repository.queryTopPaths({
      site_id: "perf_site",
      from,
      to,
      start_event: "page_view",
      end_event: "purchase",
      top_n: 20,
      max_path_length: 8,
      sample_rate: 0.5,
      event_fetch_limit: 300000,
    });
    pathDurations.push(performance.now() - pathStart);
  }

  const funnelP95 = percentile(funnelDurations, 0.95);
  const pathP95 = percentile(pathDurations, 0.95);

  console.log("=== Performance Benchmark ===");
  console.log(`seed_events: ${seedEvents.length}`);
  console.log(`insert_events_per_sec: ${eventsPerSecond.toFixed(2)}`);
  console.log(`funnel_query_p95_ms: ${funnelP95.toFixed(2)}`);
  console.log(`path_query_p95_ms: ${pathP95.toFixed(2)}`);
  console.log("target_insert_events_per_sec: >= 1000");
  console.log("target_30d_query_p95_ms: <= 1500");
}

main().catch((error) => {
  console.error("benchmark_failed", error);
  process.exit(1);
});
