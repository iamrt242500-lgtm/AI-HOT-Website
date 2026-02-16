"use client";

import { RpmSummary } from "@/lib/hooks/usePageDetail";

interface RpmCardProps {
  rpm: RpmSummary;
}

export default function RpmCard({ rpm }: RpmCardProps) {
  const hasChange = rpm.change_percent !== null && rpm.change_percent !== undefined;
  const isUp = hasChange && rpm.change_percent! > 0;
  const isDown = hasChange && rpm.change_percent! < 0;

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
        RPM Summary
      </p>

      <div className="flex items-end justify-between">
        <div>
          <p className="text-2xl font-bold text-primary">
            ${rpm.current.toFixed(2)}
          </p>
          <p className="text-xs text-slate-400 mt-0.5">current period</p>
        </div>

        <div className="text-right">
          {rpm.previous !== null ? (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                prev: ${rpm.previous.toFixed(2)}
              </p>
              {hasChange && (
                <span
                  className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold mt-1 ${
                    isUp
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                      : isDown
                        ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <span className="material-icons-round text-[14px]">
                    {isUp ? "trending_up" : isDown ? "trending_down" : "trending_flat"}
                  </span>
                  {Math.abs(rpm.change_percent!).toFixed(1)}%
                </span>
              )}
            </>
          ) : (
            <p className="text-xs text-slate-400">No previous data</p>
          )}
        </div>
      </div>
    </div>
  );
}
