"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { TrendPoint } from "@/lib/hooks/usePageDetail";

interface MiniLineChartProps {
  data: TrendPoint[];
  color?: string;
  label: string;
  formatValue?: (v: number) => string;
}

export default function MiniLineChart({
  data,
  color = "#6366f1",
  label,
  formatValue = (v) => v.toLocaleString(),
}: MiniLineChartProps) {
  // Format x-axis date labels: "MM/DD"
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T00:00:00");
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <div className="bg-white dark:bg-card-dark rounded-xl border border-slate-200 dark:border-border-dark p-4">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-3">
        {label}
      </p>
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" opacity={0.5} />
            <XAxis
              dataKey="date"
              tickFormatter={formatDate}
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => {
                if (v >= 1000) return `${(v / 1000).toFixed(0)}K`;
                return String(v);
              }}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                fontSize: 12,
                boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
              }}
              formatter={(value: number | undefined) => [formatValue(value ?? 0), label]}
              labelFormatter={(label: unknown) => formatDate(String(label))}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, strokeWidth: 0 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
