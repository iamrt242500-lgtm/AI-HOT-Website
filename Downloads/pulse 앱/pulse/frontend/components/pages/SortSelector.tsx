"use client";

import { SortField } from "@/lib/hooks/useTopPages";

interface SortSelectorProps {
  value: SortField;
  onChange: (sort: SortField) => void;
}

const OPTIONS: { label: string; value: SortField }[] = [
  { label: "Revenue", value: "revenue" },
  { label: "RPM", value: "rpm" },
  { label: "Views", value: "pageviews" },
];

export default function SortSelector({ value, onChange }: SortSelectorProps) {
  return (
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
      {OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isActive
                ? "bg-white dark:bg-card-dark text-primary shadow-sm"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
