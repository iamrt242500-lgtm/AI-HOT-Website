"use client";

import { ChannelItem } from "@/lib/hooks/usePageDetail";

interface ChannelCardProps {
  channels: ChannelItem[];
}

const CHANNEL_COLORS: Record<string, string> = {
  "Organic Search": "bg-emerald-500",
  Direct: "bg-blue-500",
  Social: "bg-purple-500",
  Referral: "bg-amber-500",
};

export default function ChannelCard({ channels }: ChannelCardProps) {
  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
        Traffic Channels
      </p>

      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden mb-4">
        {channels.map((ch) => (
          <div
            key={ch.channel}
            className={`${CHANNEL_COLORS[ch.channel] ?? "bg-slate-400"}`}
            style={{ width: `${ch.percent}%` }}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="space-y-2">
        {channels.map((ch) => (
          <div key={ch.channel} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span
                className={`w-2.5 h-2.5 rounded-full ${CHANNEL_COLORS[ch.channel] ?? "bg-slate-400"}`}
              />
              <span className="text-slate-700 dark:text-slate-300">{ch.channel}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 dark:text-slate-400">
                {ch.users.toLocaleString()}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200 w-12 text-right">
                {ch.percent.toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
