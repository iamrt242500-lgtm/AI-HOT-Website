"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

// ── Types (mirrors backend schemas/pages.py detail section) ──────────

export interface TrendPoint {
  date: string;
  value: number;
}

export interface ChannelItem {
  channel: string;
  users: number;
  percent: number;
}

export interface RpmSummary {
  current: number;
  previous: number | null;
  change_percent: number | null;
}

export interface PageAction {
  action_id: string;
  title: string;
  reason: string;
}

export interface PageDetailData {
  page_key: string;
  page_url: string;
  revenue_trend: TrendPoint[];
  pageviews_trend: TrendPoint[];
  channel_summary: ChannelItem[];
  rpm_summary: RpmSummary;
  page_actions: PageAction[];
}

export interface PageDetailMeta {
  site_id: number;
  range_days: number;
  date_from: string;
  date_to: string;
}

export interface PageDetailResponse {
  data: PageDetailData;
  meta: PageDetailMeta;
}

export type RangeDays = 7 | 30 | 90;

// ── Hook ──────────────────────────────────────────────────────────────
export function usePageDetail(
  siteId: number | null,
  pageKey: string | null,
  range: RangeDays,
) {
  const [data, setData] = useState<PageDetailData | null>(null);
  const [meta, setMeta] = useState<PageDetailMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!siteId || !pageKey) {
      setData(null);
      setMeta(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        site_id: String(siteId),
        page_key: pageKey,
        range: String(range),
      });

      const res = await api.get<PageDetailResponse>(
        `/api/v1/pages/detail?${params.toString()}`
      );

      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load page detail";
      setError(message);
      setData(null);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [siteId, pageKey, range]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { data, meta, loading, error, refetch: fetchDetail };
}
