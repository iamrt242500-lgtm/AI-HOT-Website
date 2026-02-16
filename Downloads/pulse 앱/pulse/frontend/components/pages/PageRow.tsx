"use client";

import { PageItem } from "@/lib/hooks/useTopPages";

interface PageRowProps {
  item: PageItem;
  onClick?: () => void;
}

function fmtCurrency(n: number): string {
  return `$${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function PageRow({ item, onClick }: PageRowProps) {
  const trend = item.trend_percent;
  const hasTrend = trend !== null && trend !== undefined;
  const isUp = hasTrend && trend > 0;
  const isDown = hasTrend && trend < 0;

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4 active:scale-[0.98] transition-transform"
    >
      {/* URL (ellipsis) */}
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate mb-2">
        {item.page_url}
      </p>

      {/* Metrics row */}
      <div className="flex items-center justify-between gap-3">
        {/* Revenue */}
        <div className="min-w-0">
          <p className="text-xs text-slate-400 dark:text-slate-500">Revenue</p>
          <p className="text-base font-bold text-primary">
            {fmtCurrency(item.revenue)}
          </p>
        </div>

        {/* RPM */}
        <div className="min-w-0 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">RPM</p>
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {fmtCurrency(item.rpm)}
          </p>
        </div>

        {/* Trend chip */}
        <div className="flex-shrink-0">
          {hasTrend ? (
            <span
              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
                isUp
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                  : isDown
                    ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
              }`}
            >
              <span className="material-icons-round text-[14px]">
                {isUp ? "trending_up" : isDown ? "trending_down" : "trending_flat"}
              </span>
              {Math.abs(trend).toFixed(1)}%
            </span>
          ) : (
            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
              —
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
