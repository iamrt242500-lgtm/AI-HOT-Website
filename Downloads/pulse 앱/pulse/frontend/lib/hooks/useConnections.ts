"use client";

import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "@/lib/api";

// ── Types (mirrors backend schemas/connection.py) ────────────────────

export interface ConnectionItem {
  id: number;
  site_id: number;
  provider: string; // "ga4" | "adsense"
  property_id: string | null;
  property_name: string | null;
  connected_at: string;
  last_synced_at: string | null;
}

export interface ConnectionListResponse {
  data: ConnectionItem[];
  meta: { site_id: number; total: number };
}

// ── Hook ──────────────────────────────────────────────────────────────
export function useConnections(siteId: number | null) {
  const [data, setData] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!siteId) {
      setData([]);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await api.get<ConnectionListResponse>(
        `/api/v1/connections?site_id=${siteId}`
      );

      setData(res.data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to load connections";
      setError(message);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [siteId]);

  useEffect(() => {
    fetchConnections();
  }, [fetchConnections]);

  const disconnect = useCallback(
    async (connectionId: number) => {
      try {
        await api.delete(`/api/v1/connections/${connectionId}`);
        setData((prev) => prev.filter((c) => c.id !== connectionId));
      } catch (err) {
        const message =
          err instanceof ApiError ? err.message : "Failed to disconnect";
        throw new Error(message);
      }
    },
    []
  );

  return { data, loading, error, refetch: fetchConnections, disconnect };
}
