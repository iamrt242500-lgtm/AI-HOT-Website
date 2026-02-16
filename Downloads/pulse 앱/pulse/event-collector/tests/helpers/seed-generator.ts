import { randomUUID } from "node:crypto";
import { EventApiPayload } from "../../src/types.js";

export interface SeedGeneratorOptions {
  siteId: string;
  sessionCount: number;
  days: number;
  startAt?: Date;
}

const SOURCES = ["google", "newsletter", "direct", "naver", "x"];

function randomInt(maxExclusive: number): number {
  return Math.floor(Math.random() * maxExclusive);
}

export function generateSeedEvents(options: SeedGeneratorOptions): EventApiPayload[] {
  const startAt = options.startAt ?? new Date(Date.now() - options.days * 24 * 60 * 60 * 1000);
  const events: EventApiPayload[] = [];

  for (let index = 0; index < options.sessionCount; index += 1) {
    const sessionId = `seed-${index}-${randomUUID()}`;
    const startMs = startAt.getTime() + randomInt(options.days * 24 * 60 * 60 * 1000);

    const pagePath = index % 3 === 0 ? "/pricing" : index % 3 === 1 ? "/product" : "/blog";
    const utmSource = SOURCES[index % SOURCES.length];

    const timeline: Array<{ minute: number; event: string; properties: Record<string, unknown> }> = [
      {
        minute: 0,
        event: "page_view",
        properties: {
          path: pagePath,
          utm_source: utmSource,
          device: index % 2 === 0 ? "desktop" : "mobile",
          referrer: "direct",
        },
      },
      {
        minute: 1,
        event: "scroll_depth_50",
        properties: {
          path: pagePath,
          utm_source: utmSource,
          device: index % 2 === 0 ? "desktop" : "mobile",
          referrer: "direct",
        },
      },
      {
        minute: 2,
        event: "active_attention_ms",
        properties: {
          path: pagePath,
          utm_source: utmSource,
          device: index % 2 === 0 ? "desktop" : "mobile",
          referrer: "direct",
        },
      },
    ];

    if (index % 2 === 0) {
      timeline.push({
        minute: 3,
        event: "form_submit",
        properties: {
          path: pagePath,
          utm_source: utmSource,
          device: index % 2 === 0 ? "desktop" : "mobile",
          referrer: "direct",
        },
      });
    }

    if (index % 3 === 0) {
      timeline.push({
        minute: 4,
        event: "purchase",
        properties: {
          path: pagePath,
          utm_source: utmSource,
          device: index % 2 === 0 ? "desktop" : "mobile",
          referrer: "direct",
          amount: 100 + (index % 5) * 20,
          currency: "USD",
          product: "pro",
          payment_provider: "stripe",
        },
      });

      if (index % 9 === 0) {
        timeline.push({
          minute: 10,
          event: "refund",
          properties: {
            path: pagePath,
            utm_source: utmSource,
            amount: 20,
            currency: "USD",
            payment_provider: "stripe",
          },
        });
      }
    }

    for (const entry of timeline) {
      events.push({
        site_id: options.siteId,
        session_id: sessionId,
        event_name: entry.event,
        ts: new Date(startMs + entry.minute * 60_000).toISOString(),
        properties: entry.properties,
        consent_state: "granted",
        idempotency_key: `seed-${index}-${entry.event}-${entry.minute}`,
      });
    }
  }

  return events;
}
