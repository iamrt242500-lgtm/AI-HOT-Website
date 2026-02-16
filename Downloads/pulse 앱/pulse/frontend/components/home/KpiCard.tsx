"use client";

interface KpiCardProps {
  icon: string;
  label: string;
  value: string;
  subtitle?: string;
  iconColor?: string;
}

export default function KpiCard({
  icon,
  label,
  value,
  subtitle,
  iconColor = "text-primary",
}: KpiCardProps) {
  return (
    <div className="bg-white dark:bg-card-dark rounded-2xl p-4 border border-slate-100 dark:border-border-dark shadow-sm">
      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-3">
        <div
          className={`w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center`}
        >
          <span className={`material-icons-round text-lg ${iconColor}`}>
            {icon}
          </span>
        </div>
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {label}
        </span>
      </div>

      {/* Value */}
      <p className="text-2xl font-bold tracking-tight leading-none">{value}</p>

      {/* Optional subtitle */}
      {subtitle && (
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}
