"use client";

import { useEffect, useRef } from "react";
import { EqsTracker, initPulseEqs } from "@pulse/eqs-web-sdk";

export default function AnalyticsProvider() {
  const trackerRef = useRef<EqsTracker | null>(null);

  useEffect(() => {
    trackerRef.current = initPulseEqs({
      siteId: process.env.NEXT_PUBLIC_SITE_ID || "nextjs-demo-site",
      endpoint:
        process.env.NEXT_PUBLIC_COLLECTOR_ENDPOINT || "http://localhost:8081/v1/events",
      consentState: "granted",
      enableSpaRouting: true,
      heartbeatMs: 5000,
      idleTimeoutMs: 10000,
      useBeacon: true,
    });

    return () => {
      trackerRef.current?.destroy();
      trackerRef.current = null;
    };
  }, []);

  return null;
}
