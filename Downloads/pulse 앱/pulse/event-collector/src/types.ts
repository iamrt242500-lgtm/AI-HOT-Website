export type ConsentState = "granted" | "denied" | "unknown";
export type DeniedBehavior = "drop" | "minimal";
export type PolicyTemplateName = "strict" | "balanced" | "marketing";
export type IpStorageMode = "none" | "mask24" | "hash";
export type UserKind = "anonymous" | "stable";

export type RevenueEventName = "purchase" | "subscription_start" | "donation";

export interface EqsWeights {
  attention: number;
  scroll: number;
  conversion: number;
  attentionNormalizationMs: number;
}

export interface EventApiPayload {
  site_id: string;
  session_id: string;
  event_name: string;
  ts: string | number;
  properties: Record<string, unknown>;
  consent_state: ConsentState;
  idempotency_key?: string;
  user?: {
    anonymous_session_id?: string;
    stable_user_id?: string;
    is_authenticated?: boolean;
  };
}

export interface EventRequestContext {
  clientIp?: string;
  userAgent?: string;
  asn?: number;
  isInternal?: boolean;
}

export interface ResolvedSitePolicy {
  siteId: string;
  template: PolicyTemplateName;
  deniedBehavior: DeniedBehavior;
  retentionDays: number;
  ipStorageMode: IpStorageMode;
}

export interface StoredEvent {
  event_id: string;
  site_id: string;
  event_name: string;
  event_ts: Date;
  ingested_at: Date;
  properties_json: string;
  consent_state: ConsentState;
  policy_template: PolicyTemplateName;
  denied_behavior: DeniedBehavior;
  user_kind: UserKind;
  user_id: string;
  session_id: string;
  stable_id_hash: string | null;
  idempotency_key: string;
  user_agent: string | null;
  asn: number | null;
  ip_masked: string | null;
  ip_hash: string | null;
  revenue_amount: number | null;
  revenue_currency: string | null;
  product: string | null;
  payment_provider: string | null;
}

export interface IngestionResult {
  status: "stored" | "dropped" | "duplicate";
  idempotency_key: string;
  reason?: string;
}

export interface TrafficFilterDecision {
  allowed: boolean;
  reason?: string;
}

export interface PageMetricsQuery {
  from: Date;
  to: Date;
  siteId?: string;
  sessionInactivityMinutes: number;
  attentionHeartbeatMs: number;
  botUserAgentPattern: string;
}

export interface PageMetricsAggregate {
  page_path: string;
  page_views: number;
  sessions: number;
  active_attention_ms_total: number;
  scroll_read_events: number;
  scroll_base_events: number;
  micro_conversions: number;
  bot_page_views: number;
}

export interface PageMetricsResponseRow {
  page_path: string;
  eqs: number;
  active_attention_ms_avg: number;
  scroll_readthrough_avg: number;
  conversion_rate: number;
  page_views: number;
  sessions: number;
}

export interface FunnelDefinitionInput {
  funnel_id?: string;
  site_id: string;
  name: string;
  steps: string[];
  conversion_window_minutes: number;
}

export interface FunnelDefinitionRecord {
  funnel_id: string;
  site_id: string;
  name: string;
  steps: string[];
  conversion_window_minutes: number;
  created_at: Date;
  updated_at: Date;
}

export interface FunnelAggregateQuery {
  funnel: FunnelDefinitionRecord;
  from: Date;
  to: Date;
  siteId?: string;
}

export interface FunnelAggregateResult {
  step_sessions: number[];
  base_sessions: number;
  converted_sessions: number;
  revenue_total: number;
  revenue_avg: number;
}

export interface FunnelStepReport {
  step_index: number;
  step: string;
  sessions: number;
  conversion_rate: number;
  drop_off: number;
}

export interface FunnelReport {
  funnel_id: string;
  site_id: string;
  name: string;
  from: string;
  to: string;
  conversion_window_minutes: number;
  steps: FunnelStepReport[];
  revenue_total: number;
  revenue_avg: number;
}

export type CohortCondition =
  | {
      type: "visit_count_gte";
      value: number;
    }
  | {
      type: "has_event";
      event_name: string;
    }
  | {
      type: "eqs_gte";
      value: number;
    }
  | {
      type: "utm_source_in";
      values: string[];
    };

export interface CohortDsl {
  all: CohortCondition[];
}

export interface CohortDefinitionInput {
  cohort_id?: string;
  site_id: string;
  name: string;
  dsl: CohortDsl;
}

export interface CohortDefinitionRecord {
  cohort_id: string;
  site_id: string;
  name: string;
  dsl: CohortDsl;
  created_at: Date;
  updated_at: Date;
}

export interface CohortRefreshQuery {
  cohort: CohortDefinitionRecord;
  from: Date;
  to: Date;
  metrics: {
    eqsWeights: EqsWeights;
    attentionHeartbeatMs: number;
  };
}

export interface CohortSnapshotRecord {
  cohort_id: string;
  site_id: string;
  snapshot_version: number;
  from: Date;
  to: Date;
  built_at: Date;
  member_count: number;
}

export interface CohortRefreshResult {
  snapshot: CohortSnapshotRecord;
  session_ids: string[];
}

export interface PathQuery {
  site_id: string;
  from: Date;
  to: Date;
  start_event: string;
  end_event: string;
  top_n: number;
  max_path_length: number;
  sample_rate: number;
  event_fetch_limit: number;
}

export interface PathReportRow {
  path: string;
  sessions: number;
  conversion_sessions: number;
  revenue_total: number;
  revenue_avg: number;
  conversion_contribution: number;
}
