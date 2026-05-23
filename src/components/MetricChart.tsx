"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import { useI18n } from "@/lib/i18n/provider";
import type { Region, RegionMetrics } from "@/lib/types";
import { REGIONS } from "@/lib/types";

export type TimelinePoint = {
  date: string;
  per_region: Record<Region, RegionMetrics>;
};

const REGION_COLORS: Record<Region, string> = {
  forehead: "#0ea5e9",
  left_cheek: "#f43f5e",
  right_cheek: "#a855f7",
  nose: "#10b981",
  perioral: "#f59e0b",
  chin: "#64748b",
};

export function MetricChart({
  data,
  metric,
}: {
  data: TimelinePoint[];
  metric: keyof RegionMetrics;
}) {
  const { t } = useI18n();
  const rows = data.map((p) => {
    const r: Record<string, number | string> = { date: p.date };
    for (const region of REGIONS) {
      r[region] = Number((p.per_region[region][metric] ?? 0).toFixed(2));
    }
    return r;
  });
  return (
    <div className="w-full h-64">
      <ResponsiveContainer>
        <LineChart data={rows} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#f1f5f9" />
          <XAxis dataKey="date" fontSize={11} stroke="#64748b" />
          <YAxis fontSize={11} stroke="#64748b" />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value) =>
              t(`region_${value}` as `region_${Region}`) as string
            }
          />
          {REGIONS.map((region) => (
            <Line
              key={region}
              type="monotone"
              dataKey={region}
              stroke={REGION_COLORS[region]}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
