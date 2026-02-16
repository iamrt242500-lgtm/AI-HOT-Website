"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

// ── Types (mirrors backend schemas/home.py) ─────────────────────────
export interface HomeKpiData {
  users: number;
  pageviews: number;
  revenue: number;
  rpm: number;
  ctr: number | null;
  last_synced_at: string | null;
}

export interface HomeKpiMeta {
  site_id: number;
  range_days: number;
  date_from: string;
  date_to: string;
}

export interface HomeKpiResponse {
  data: HomeKpiData;
  meta: HomeKpiMeta;
}

export type RangeDays = 7 | 30 | 90;

// ── Hook ─────────────────────────────────────────────────────────────
export function useHomeKpi(siteId: number | null, range: RangeDays) {
  const [data, setData] = useState<HomeKpiData | null>(null);
  const [meta, setMeta] = useState<HomeKpiMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchKpi = useCallback(async () => {
    if (!siteId) {
      setData(null);
      setMeta(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.get<HomeKpiResponse>(
        `/api/v1/home/kpis?site_id=${siteId}&range=${range}`
      );

      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load KPI data";
      setError(message);
      setData(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [siteId, range]);

  useEffect(() => {
    fetchKpi();
  }, [fetchKpi]);

  return { data, meta, loading, error, refetch: fetchKpi };
}
