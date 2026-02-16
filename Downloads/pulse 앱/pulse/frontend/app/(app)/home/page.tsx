"use client";

import { useState } from "react";
import Link from "next/link";
import { useSite } from "@/lib/site-context";
import { useHomeKpi, RangeDays } from "@/lib/hooks/useHomeKpi";
import KpiCard from "@/components/home/KpiCard";
import RangeFilter from "@/components/home/RangeFilter";
import SiteSelector from "@/components/home/SiteSelector";

// ── Helpers ──────────────────────────────────────────────────────────
function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function fmtPercent(n: number | null): string {
  if (n === null || n === undefined) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function timeAgo(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Component ────────────────────────────────────────────────────────
export default function HomePage() {
  const { currentSite, sites, loading: sitesLoading } = useSite();
  const [range, setRange] = useState<RangeDays>(7);

  const { data, loading, error } = useHomeKpi(currentSite?.id ?? null, range);

  // ── Loading state (sites still loading) ───────────────────────────
  if (sitesLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  // ── Empty state (no sites registered) ─────────────────────────────
  if (sites.length === 0) {
    return (
      <div className="p-6 space-y-6">
        <Header />
        <div className="bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-8 border border-primary/20 text-center space-y-4">
          <span className="material-icons-round text-primary text-5xl">
            add_circle_outline
          </span>
          <h2 className="text-xl font-bold">No sites yet</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
            Create your first site to start tracking revenue data.
          </p>
          <Link
            href="/onboarding/step1"
            className="inline-flex items-center gap-1 px-4 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          >
            Create Site
            <span className="material-icons-round text-base">arrow_forward</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Header />

      {/* Site Selector + Range Filter */}
      <div className="flex items-center justify-between">
        <SiteSelector />
        <RangeFilter value={range} onChange={setRange} />
      </div>

      {/* KPI Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      )}

      {/* KPI Error */}
      {!loading && error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-5 flex items-start gap-3">
          <span className="material-icons-round text-red-500">error</span>
          <div>
            <p className="font-semibold text-sm text-red-600 dark:text-red-400">
              Failed to load KPIs
            </p>
            <p className="text-xs text-slate-500 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {!loading && !error && data && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              icon="group"
              label="Users"
              value={fmtNumber(data.users)}
              subtitle={`Last ${range} days`}
            />
            <KpiCard
              icon="visibility"
              label="Pageviews"
              value={fmtNumber(data.pageviews)}
              subtitle={`Last ${range} days`}
            />
            <KpiCard
              icon="attach_money"
              label="Revenue"
              value={fmtCurrency(data.revenue)}
              iconColor="text-emerald-500"
            />
            <KpiCard
              icon="speed"
              label="RPM"
              value={fmtCurrency(data.rpm)}
              subtitle="Revenue per 1K views"
            />
            <KpiCard
              icon="ads_click"
              label="CTR"
              value={fmtPercent(data.ctr)}
              subtitle="Click-through rate"
            />
            <KpiCard
              icon="sync"
              label="Last Sync"
              value={timeAgo(data.last_synced_at)}
              subtitle={
                data.last_synced_at
                  ? new Date(data.last_synced_at).toLocaleDateString()
                  : "No sync yet"
              }
            />
          </div>

          {/* Empty data hint */}
          {data.users === 0 && data.pageviews === 0 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3">
              <span className="material-icons-round text-amber-500 text-sm">
                info
              </span>
              <p className="text-xs text-slate-600 dark:text-slate-400">
                No data for this period. Run a data sync from Settings or the Dev panel.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ── Sticky Header ────────────────────────────────────────────────────
function Header() {
  return (
    <header className="sticky top-0 z-50 bg-background-light/80 dark:bg-background-dark/80 backdrop-blur-lg border-b border-primary/10 -mx-6 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="material-icons-round text-white text-xl">
              insights
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">
              Dashboard
            </span>
            <span className="text-sm font-semibold">Pulse Home</span>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-slate-200 dark:bg-card-dark flex items-center justify-center">
          <span className="material-icons-round text-xl">
            notifications_none
          </span>
        </button>
      </div>
    </header>
  );
}
