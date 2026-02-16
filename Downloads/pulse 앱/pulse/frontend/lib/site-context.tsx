"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useCallback } from "react";
import { api, ApiError, ApiListResponse } from "./api";
import { useAuth } from "./auth-context";

interface Site {
  id: number;
  user_id: number;
  name: string;
  domain: string;
  currency: string;
  created_at: string;
  updated_at?: string;
}

interface SiteContextType {
  sites: Site[];
  currentSite: Site | null;
  loading: boolean;
  error: string | null;
  fetchSites: () => Promise<void>;
  createSite: (data: { name: string; domain: string; currency?: string }) => Promise<Site>;
  setCurrentSite: (site: Site) => void;
}

const CURRENT_SITE_KEY = "currentSiteId";
const SiteContext = createContext<SiteContextType | undefined>(undefined);

export function SiteProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [currentSite, setCurrentSiteState] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const restoreCurrentSite = (nextSites: Site[]) => {
    if (nextSites.length === 0) {
      setCurrentSiteState(null);
      localStorage.removeItem(CURRENT_SITE_KEY);
      return;
    }

    const savedSiteId = localStorage.getItem(CURRENT_SITE_KEY);
    if (savedSiteId) {
      const restored = nextSites.find((site) => site.id === parseInt(savedSiteId, 10));
      if (restored) {
        setCurrentSiteState(restored);
        return;
      }
    }

    const fallback = nextSites[0];
    setCurrentSiteState(fallback);
    localStorage.setItem(CURRENT_SITE_KEY, fallback.id.toString());
  };

  const fetchSites = useCallback(async () => {
    if (!isAuthenticated) {
      setSites([]);
      setCurrentSiteState(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await api.get<ApiListResponse<Site>>("/api/v1/sites");
      setSites(response.data);
      restoreCurrentSite(response.data);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to fetch sites";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const createSite = async (data: {
    name: string;
    domain: string;
    currency?: string;
  }): Promise<Site> => {
    try {
      setLoading(true);
      setError(null);
      const newSite = await api.post<Site>("/api/v1/sites", data);
      setSites((prev) => [...prev, newSite]);
      setCurrentSiteState(newSite);
      localStorage.setItem(CURRENT_SITE_KEY, newSite.id.toString());
      return newSite;
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "Failed to create site";
      setError(message);
      throw new Error(message);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentSite = (site: Site) => {
    setCurrentSiteState(site);
    localStorage.setItem(CURRENT_SITE_KEY, site.id.toString());
  };

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      setSites([]);
      setCurrentSiteState(null);
      setError(null);
      setLoading(false);
      return;
    }

    fetchSites();
  }, [isAuthenticated, authLoading, fetchSites]);

  return (
    <SiteContext.Provider
      value={{
        sites,
        currentSite,
        loading,
        error,
        fetchSites,
        createSite,
        setCurrentSite,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
}

export function useSite() {
  const context = useContext(SiteContext);
  if (context === undefined) {
    throw new Error("useSite must be used within a SiteProvider");
  }
  return context;
}
