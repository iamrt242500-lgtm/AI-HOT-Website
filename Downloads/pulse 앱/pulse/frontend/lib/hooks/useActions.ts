"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

// ── Types (mirrors backend schemas/actions.py) ──────────────────────

export interface ActionItem {
  action_id: string;
  title: string;
  reason: string;
  target_page_key: string | null;
  target_page_url: string | null;
  priority: number; // 1 = high, 2 = medium, 3 = low
}

export interface ActionsMeta {
  site_id: number;
  range_days: number;
  total: number;
}

export interface ActionsResponse {
  data: ActionItem[];
  meta: ActionsMeta;
}

export type RangeDays = 7 | 30 | 90;

// ── Hook ──────────────────────────────────────────────────────────────
export function useActions(siteId: number | null, range: RangeDays) {
  const [data, setData] = useState<ActionItem[]>([]);
  const [meta, setMeta] = useState<ActionsMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchActions = useCallback(async () => {
    if (!siteId) {
      setData([]);
      setMeta(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.get<ActionsResponse>(
        `/api/v1/actions?site_id=${siteId}&range=${range}`
      );

      setData(res.data);
      setMeta(res.meta);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load actions";
      setError(message);
      setData([]);
      setMeta(null);
    } finally {
      setLoading(false);
    }
  }, [siteId, range]);

  useEffect(() => {
    fetchActions();
  }, [fetchActions]);

  return { data, meta, loading, error, refetch: fetchActions };
}
