import {
  ConsentState,
  EqsEventName,
  EqsEventPayload,
  EqsTracker,
  EqsTrackerOptions,
  EventProperties,
} from "./types.js";

const SCROLL_THRESHOLDS: Array<0 | 25 | 50 | 75 | 100> = [0, 25, 50, 75, 100];
const FILE_DOWNLOAD_EXTENSIONS =
  /\.(pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar|7z|csv|txt|mp4|mp3)$/i;

function getDeviceType(userAgent: string): EventProperties["device"] {
  const ua = userAgent.toLowerCase();
  if (/ipad|tablet|playbook|silk/.test(ua)) return "tablet";
  if (/mobi|android|iphone|ipod/.test(ua)) return "mobile";
  return "desktop";
}

function createAnonymousSessionId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const random = Math.random().toString(36).slice(2);
  return `sess_${Date.now()}_${random}`;
}

function createIdempotencyKey(eventName: string): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `${eventName}_${Date.now()}_${random}`;
}

function normalizeReferrer(referrer: string): string {
  if (!referrer) return "direct";

  try {
    const refUrl = new URL(referrer);
    if (refUrl.origin === window.location.origin) {
      return refUrl.pathname || "/";
    }

    return refUrl.origin;
  } catch {
    return "direct";
  }
}

function getUtmValues(): Partial<EventProperties> {
  const params = new URLSearchParams(window.location.search);

  type UtmField =
    | "utm_source"
    | "utm_medium"
    | "utm_campaign"
    | "utm_term"
    | "utm_content";

  const utm: Partial<Record<UtmField, string>> = {};
  const fields: UtmField[] = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
  ];

  for (const field of fields) {
    const value = params.get(field);
    if (value) {
      utm[field] = value;
    }
  }

  return utm;
}

class PulseEqsTracker implements EqsTracker {
  private readonly anonymousSessionId = createAnonymousSessionId();
  private readonly seenScrollDepth = new Set<number>();
  private readonly startedForms = new WeakSet<HTMLFormElement>();
  private readonly listeners: Array<() => void> = [];

  private consentState: ConsentState;
  private lastActivityAt = Date.now();
  private heartbeatTimer: number | undefined;
  private isDestroyed = false;
  private originalPushState: History["pushState"] | undefined;
  private originalReplaceState: History["replaceState"] | undefined;

  constructor(private readonly options: Required<Omit<EqsTrackerOptions, "country" | "consentState">> & {
    country?: string;
    consentState: ConsentState;
  }) {
    this.consentState = options.consentState;

    this.installEventListeners();
    this.installSpaRoutingHook();

    this.trackPageView();
    this.startAttentionHeartbeat();
  }

  trackPageView = (): void => {
    if (this.isDestroyed) return;

    this.seenScrollDepth.clear();
    this.track("page_view");
    this.track("scroll_depth_0");
    this.captureScrollDepth();
  };

  track = (eventName: EqsEventName): void => {
    if (this.isDestroyed) return;

    const payload: EqsEventPayload = {
      site_id: this.options.siteId,
      session_id: this.anonymousSessionId,
      event_name: eventName,
      ts: new Date().toISOString(),
      properties: this.buildProperties(),
      consent_state: this.consentState,
      idempotency_key: createIdempotencyKey(eventName),
      user: {
        anonymous_session_id: this.anonymousSessionId,
        is_authenticated: false,
      },
    };

    this.send(payload);
  };

  setConsentState = (state: ConsentState): void => {
    this.consentState = state;
  };

  destroy = (): void => {
    if (this.isDestroyed) return;

    this.isDestroyed = true;

    for (const remove of this.listeners) {
      remove();
    }
    this.listeners.length = 0;

    if (this.heartbeatTimer !== undefined) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }

    if (this.originalPushState) {
      window.history.pushState = this.originalPushState;
    }

    if (this.originalReplaceState) {
      window.history.replaceState = this.originalReplaceState;
    }
  };

  private buildProperties(): EventProperties {
    return {
      path: window.location.pathname || "/",
      referrer: normalizeReferrer(document.referrer),
      device: getDeviceType(window.navigator.userAgent),
      country: this.options.country,
      ...getUtmValues(),
    };
  }

  private send(payload: EqsEventPayload): void {
    const body = JSON.stringify(payload);

    if (this.options.useBeacon && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      const sent = navigator.sendBeacon(this.options.endpoint, blob);
      if (sent) return;
    }

    void this.options.fetchImpl(this.options.endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body,
      keepalive: true,
    }).catch(() => {
      // Intentionally swallow transport errors to avoid impacting app UX.
    });
  }

  private installEventListeners(): void {
    const onUserActivity = () => {
      this.lastActivityAt = Date.now();
    };

    const onScroll = () => {
      onUserActivity();
      this.captureScrollDepth();
    };

    const onClick = (event: MouseEvent) => {
      onUserActivity();

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a") as HTMLAnchorElement | null;
      if (!anchor?.href) return;

      let parsed: URL;
      try {
        parsed = new URL(anchor.href, window.location.href);
      } catch {
        return;
      }

      if (FILE_DOWNLOAD_EXTENSIONS.test(parsed.pathname)) {
        this.track("file_download");
      }

      if (
        (parsed.protocol === "http:" || parsed.protocol === "https:") &&
        parsed.origin !== window.location.origin
      ) {
        this.track("outbound_click");
      }
    };

    const onFocusIn = (event: FocusEvent) => {
      onUserActivity();

      const target = event.target as HTMLElement | null;
      const form = target?.closest("form") as HTMLFormElement | null;
      if (!form) return;

      if (!this.startedForms.has(form)) {
        this.startedForms.add(form);
        this.track("form_start");
      }
    };

    const onSubmit = (event: Event) => {
      onUserActivity();

      const form = event.target as HTMLFormElement | null;
      if (form?.tagName === "FORM") {
        this.track("form_submit");
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        this.lastActivityAt = Date.now();
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("click", onClick, true);
    window.addEventListener("focusin", onFocusIn, true);
    window.addEventListener("submit", onSubmit, true);
    document.addEventListener("visibilitychange", onVisibilityChange);

    const activeEvents: Array<keyof WindowEventMap> = [
      "keydown",
      "pointerdown",
      "mousemove",
      "touchstart",
      "wheel",
    ];

    for (const eventName of activeEvents) {
      window.addEventListener(eventName, onUserActivity, { passive: true });
      this.listeners.push(() => window.removeEventListener(eventName, onUserActivity));
    }

    this.listeners.push(() => window.removeEventListener("scroll", onScroll));
    this.listeners.push(() => window.removeEventListener("click", onClick, true));
    this.listeners.push(() => window.removeEventListener("focusin", onFocusIn, true));
    this.listeners.push(() => window.removeEventListener("submit", onSubmit, true));
    this.listeners.push(() => document.removeEventListener("visibilitychange", onVisibilityChange));
  }

  private installSpaRoutingHook(): void {
    if (!this.options.enableSpaRouting) return;

    const onRouteChange = () => {
      this.lastActivityAt = Date.now();
      window.setTimeout(() => this.trackPageView(), 0);
    };

    this.originalPushState = window.history.pushState;
    this.originalReplaceState = window.history.replaceState;

    window.history.pushState = ((...args: Parameters<History["pushState"]>) => {
      this.originalPushState?.apply(window.history, args);
      onRouteChange();
    }) as History["pushState"];

    window.history.replaceState = ((...args: Parameters<History["replaceState"]>) => {
      this.originalReplaceState?.apply(window.history, args);
      onRouteChange();
    }) as History["replaceState"];

    window.addEventListener("popstate", onRouteChange);
    this.listeners.push(() => window.removeEventListener("popstate", onRouteChange));
  }

  private startAttentionHeartbeat(): void {
    this.heartbeatTimer = window.setInterval(() => {
      if (this.isDestroyed) return;
      if (document.visibilityState !== "visible") return;

      const inactiveMs = Date.now() - this.lastActivityAt;
      if (inactiveMs > this.options.idleTimeoutMs) return;

      this.track("active_attention_ms");
    }, this.options.heartbeatMs);
  }

  private captureScrollDepth(): void {
    const doc = document.documentElement;
    const scrollTop = window.scrollY || doc.scrollTop || 0;
    const maxScrollable = Math.max(0, doc.scrollHeight - window.innerHeight);
    const depthPercent =
      maxScrollable === 0 ? 100 : Math.min(100, Math.round((scrollTop / maxScrollable) * 100));

    for (const threshold of SCROLL_THRESHOLDS) {
      if (depthPercent < threshold || this.seenScrollDepth.has(threshold)) {
        continue;
      }

      this.seenScrollDepth.add(threshold);
      if (threshold === 0) continue;
      this.track(`scroll_depth_${threshold}` as EqsEventName);
    }
  }
}

export function initPulseEqs(options: EqsTrackerOptions): EqsTracker {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("Pulse EQS SDK must run in a browser environment");
  }

  if (!options.siteId?.trim()) {
    throw new Error("siteId is required");
  }

  if (!options.endpoint?.trim()) {
    throw new Error("endpoint is required");
  }

  const normalized: Required<Omit<EqsTrackerOptions, "country" | "consentState">> & {
    country?: string;
    consentState: ConsentState;
  } = {
    siteId: options.siteId,
    endpoint: options.endpoint,
    country: options.country,
    consentState: options.consentState ?? "unknown",
    heartbeatMs: options.heartbeatMs ?? 5000,
    idleTimeoutMs: options.idleTimeoutMs ?? 10000,
    useBeacon: options.useBeacon ?? true,
    enableSpaRouting: options.enableSpaRouting ?? true,
    fetchImpl: options.fetchImpl ?? window.fetch.bind(window),
  };

  return new PulseEqsTracker(normalized);
}
