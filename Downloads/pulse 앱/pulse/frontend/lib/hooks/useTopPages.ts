"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

// ── Types (mirrors backend schemas/pages.py) ─────────────────────────
export interface PageItem {
  page_key: string;
  page_url: string;
  pageviews: number;
  revenue: number;
  rpm: number;
  trend_percent: number | null;
}

export interface PageListMeta {
  site_id: number;
  range_days: number;
  sort: string;
  search: string | null;
  page: number;
  limit: number;
  total: number;
}

export interface PageListResponse {
  data: PageItem[];
  meta: PageListMeta;
}

export type RangeDays = 7 | 30 | 90;
export type SortField = "revenue" | "rpm" | "pageviews";

// ── Hook ──────────────────────────────────────────────────────────────
export function useTopPages(
  siteId: number | null,
  range: RangeDays,
  sort: SortField = "revenue",
  search: string = "",
  page: number = 1,
  limit: number = 20,
) {
  const [items, setItems] = useState<PageItem[]>([]);
  const [meta, setMeta] = useState<PageListMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPages = useCallback(async () => {
    if (!siteId) {
      setItems([]);
      setMeta(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        site_id: String(siteId),
        range: String(range),
        sort,
        page: String(page),
        limit: String(limit),
      });
      if (search.trim()) {
        params.set("search", search.trim());
      }

      const res = await api.get<PageListResponse>(
        `/api/v1/pages/top?${params.toString()}`
      );

      setItems(res.data);
      setMeta(res.meta);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load pages";
      setError(message);
      setItems([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [siteId, range, sort, search, page, limit]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  return { items, meta, loading, error, refetch: fetchPages };
}
