"use client";

import { RangeDays } from "@/lib/hooks/useHomeKpi";

interface RangeFilterProps {
  value: RangeDays;
  onChange: (range: RangeDays) => void;
}

const OPTIONS: { label: string; value: RangeDays }[] = [
  { label: "7D", value: 7 },
  { label: "30D", value: 30 },
  { label: "90D", value: 90 },
];

export default function RangeFilter({ value, onChange }: RangeFilterProps) {
  return (
    <div className="inline-flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-0.5">
      {OPTIONS.map((opt) => {
        const isActive = opt.value === value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
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
