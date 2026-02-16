"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSite } from "@/lib/site-context";
import { usePageDetail, RangeDays } from "@/lib/hooks/usePageDetail";
import RangeFilter from "@/components/home/RangeFilter";
import MiniLineChart from "@/components/detail/MiniLineChart";
import ChannelCard from "@/components/detail/ChannelCard";
import RpmCard from "@/components/detail/RpmCard";
import ActionCard from "@/components/detail/ActionCard";

function PageDetailPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentSite } = useSite();

  const pageKey = searchParams.get("page_key") ?? "";
  const siteIdParam = searchParams.get("site_id");
  const siteId = siteIdParam ? Number(siteIdParam) : currentSite?.id ?? null;

  const initialRange = ([7, 30, 90].includes(Number(searchParams.get("range")))
    ? Number(searchParams.get("range"))
    : 7) as RangeDays;
  const [range, setRange] = useState<RangeDays>(initialRange);

  const { data, loading, error } = usePageDetail(siteId, pageKey, range);

  if (!pageKey) {
    return (
      <div className="flex items-center justify-center h-[60vh] px-6 text-center">
        <div className="space-y-2">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Missing page key. Please go back and select a page again.
          </p>
          <button
            onClick={() => router.push("/app/pages")}
            className="px-3 py-2 rounded-lg bg-primary text-white text-sm font-semibold"
          >
            Back to pages
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-40 bg-background-light/80 dark:bg-background-dark/80 ios-blur border-b border-primary/10 px-4 pt-3 pb-3">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800"
          >
            <span className="material-icons-round text-lg">arrow_back</span>
          </button>
          <h1 className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate flex-1">
            {data?.page_url ?? "Loading..."}
          </h1>
        </div>
        <RangeFilter value={range} onChange={setRange} />
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-24">
        {loading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 animate-pulse"
              >
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
                <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded" />
              </div>
            ))}
          </div>
        )}

        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 text-center space-y-2">
            <span className="material-icons-round text-red-400 text-3xl">
              error_outline
            </span>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <MiniLineChart
              data={data.revenue_trend}
              label="Revenue"
              color="#6366f1"
              formatValue={(v) =>
                `$${v.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              }
            />

            <MiniLineChart
              data={data.pageviews_trend}
              label="Pageviews"
              color="#10b981"
              formatValue={(v) => v.toLocaleString()}
            />

            <ChannelCard channels={data.channel_summary} />
            <RpmCard rpm={data.rpm_summary} />

            {data.page_actions.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Recommended Actions
                </p>
                {data.page_actions.map((action) => (
                  <ActionCard key={action.action_id} action={action} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PageDetailFallback() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
    </div>
  );
}

export default function PageDetailPage() {
  return (
    <Suspense fallback={<PageDetailFallback />}>
      <PageDetailPageContent />
    </Suspense>
  );
}
