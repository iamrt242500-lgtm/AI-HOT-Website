import { createHash, randomUUID } from "node:crypto";
import { parseRevenueFields } from "../analytics/revenue.js";
import { PolicyStore } from "../policies/policy-store.js";
import { ConsentPolicyEngine } from "../policies/engine.js";
import { buildUserIdentity } from "../privacy/identity.js";
import { processIp } from "../privacy/ip.js";
import { EventRepository } from "../repositories/event-repository.js";
import {
  EventApiPayload,
  EventRequestContext,
  IngestionResult,
  ResolvedSitePolicy,
  StoredEvent,
} from "../types.js";

function parseEventTs(ts: string | number): Date {
  if (typeof ts === "number") {
    const millis = ts < 10_000_000_000 ? ts * 1000 : ts;
    const parsed = new Date(millis);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid ts value");
    }
    return parsed;
  }

  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Invalid ts value");
  }
  return parsed;
}

function makeFallbackIdempotencyKey(payload: EventApiPayload): string {
  const keyBase = JSON.stringify({
    site_id: payload.site_id,
    session_id: payload.session_id,
    event_name: payload.event_name,
    ts: payload.ts,
    properties: payload.properties,
    consent_state: payload.consent_state,
    user: payload.user,
  });

  return createHash("sha256").update(keyBase).digest("hex");
}

export interface EventIngestionServiceOptions {
  repository: EventRepository;
  policyStore: PolicyStore;
  policyEngine: ConsentPolicyEngine;
  stableIdSalt: string;
  ipHashSalt: string;
}

export interface EventIngestionOutcome extends IngestionResult {
  policy_template: string;
  denied_behavior: string;
}

export class EventIngestionService {
  constructor(private readonly options: EventIngestionServiceOptions) {}

  async ingest(payload: EventApiPayload, context: EventRequestContext): Promise<EventIngestionOutcome> {
    const policy = this.options.policyStore.getPolicy(payload.site_id);

    const idempotencyKey = payload.idempotency_key?.trim() || makeFallbackIdempotencyKey(payload);

    const alreadyInserted = await this.options.repository.isDuplicate(payload.site_id, idempotencyKey);
    if (alreadyInserted) {
      return {
        status: "duplicate",
        idempotency_key: idempotencyKey,
        reason: "idempotency_key_exists",
        policy_template: policy.template,
        denied_behavior: policy.deniedBehavior,
      };
    }

    const policyDecision = this.options.policyEngine.evaluate(payload.consent_state, policy);
    if (policyDecision.action === "drop") {
      return {
        status: "dropped",
        idempotency_key: idempotencyKey,
        reason: policyDecision.reason,
        policy_template: policy.template,
        denied_behavior: policy.deniedBehavior,
      };
    }

    const event = this.toStoredEvent(
      payload,
      context,
      policy,
      idempotencyKey,
      policyDecision.minimalPayload,
    );

    await this.options.repository.insertEvent(event);

    return {
      status: "stored",
      idempotency_key: idempotencyKey,
      reason: policyDecision.reason,
      policy_template: policy.template,
      denied_behavior: policy.deniedBehavior,
    };
  }

  private toStoredEvent(
    payload: EventApiPayload,
    context: EventRequestContext,
    policy: ResolvedSitePolicy,
    idempotencyKey: string,
    minimalPayload: boolean,
  ): StoredEvent {
    const eventTs = parseEventTs(payload.ts);
    const ingestedAt = new Date();
    const sourceProperties = minimalPayload ? {} : payload.properties;

    const userIdentity = buildUserIdentity(
      payload.user,
      this.options.stableIdSalt,
      payload.session_id,
    );
    const processedIp = processIp(context.clientIp, policy.ipStorageMode, this.options.ipHashSalt);
    const revenueFields = parseRevenueFields(payload.event_name, sourceProperties);

    return {
      event_id: randomUUID(),
      site_id: payload.site_id,
      event_name: payload.event_name,
      event_ts: eventTs,
      ingested_at: ingestedAt,
      properties_json: JSON.stringify(sourceProperties),
      consent_state: payload.consent_state,
      policy_template: policy.template,
      denied_behavior: policy.deniedBehavior,
      user_kind: userIdentity.userKind,
      user_id: userIdentity.userId,
      session_id: userIdentity.sessionId,
      stable_id_hash: userIdentity.stableIdHash,
      idempotency_key: idempotencyKey,
      user_agent: context.userAgent ?? null,
      asn: context.asn ?? null,
      ip_masked: processedIp.ipMasked,
      ip_hash: processedIp.ipHashed,
      revenue_amount: revenueFields.revenue_amount,
      revenue_currency: revenueFields.revenue_currency,
      product: revenueFields.product,
      payment_provider: revenueFields.payment_provider,
    };
  }
}
