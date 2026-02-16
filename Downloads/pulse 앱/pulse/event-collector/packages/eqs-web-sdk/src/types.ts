export type ConsentState = "granted" | "denied" | "unknown";

export type EqsEventName =
  | "page_view"
  | "scroll_depth_0"
  | "scroll_depth_25"
  | "scroll_depth_50"
  | "scroll_depth_75"
  | "scroll_depth_100"
  | "active_attention_ms"
  | "outbound_click"
  | "file_download"
  | "form_start"
  | "form_submit";

export interface EventProperties {
  path: string;
  referrer: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  device: "mobile" | "tablet" | "desktop";
  country?: string;
}

export interface EqsEventPayload {
  site_id: string;
  session_id: string;
  event_name: EqsEventName;
  ts: string;
  properties: EventProperties;
  consent_state: ConsentState;
  idempotency_key: string;
  user: {
    anonymous_session_id: string;
    is_authenticated: false;
  };
}

export interface EqsTrackerOptions {
  siteId: string;
  endpoint: string;
  consentState?: ConsentState;
  country?: string;
  heartbeatMs?: number;
  idleTimeoutMs?: number;
  useBeacon?: boolean;
  enableSpaRouting?: boolean;
  fetchImpl?: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
}

export interface EqsTracker {
  trackPageView: () => void;
  track: (eventName: EqsEventName) => void;
  setConsentState: (state: ConsentState) => void;
  destroy: () => void;
}
