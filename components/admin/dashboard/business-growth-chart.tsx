"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminAnalyticsPoint } from "@/types/admin";

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
      <p className="mb-0.5 text-xs font-bold text-white">{label}</p>
      <p className="text-xs font-semibold text-indigo-300">
        {payload[0]!.value} new business{payload[0]!.value === 1 ? "" : "es"}
      </p>
    </div>
  );
}

export function BusinessGrowthChart({ data }: { data: AdminAnalyticsPoint[] }) {
  if (data.every((point) => point.value === 0)) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-gray-400">
        No new businesses in the last 6 months
      </div>
    );
  }

  return (
    <div className="h-48 w-full px-2 pb-2">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            allowDecimals={false}
            tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip content={<GrowthTooltip />} cursor={{ fill: "#eef2ff" }} />
          <Bar dataKey="value" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
