"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CrowdRow } from "@/lib/api";

export function CrowdChart({ rows }: { rows: CrowdRow[] }) {
  const windowed = rows.slice(-60);
  const data = windowed.map((r, i) => ({
    i,
    t: String(r.time).slice(-8),
    people: Number(r.human_count) || 0,
    violations: Number(r.violations) || 0,
  }));

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted-foreground">
        No crowd data yet.
      </div>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis dataKey="t" tick={{ fontSize: 10 }} />
          <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
          <Tooltip
            contentStyle={{
              background: "var(--card)",
              border: "1px solid var(--border)",
              borderRadius: 8,
            }}
          />
          <Line
            type="monotone"
            dataKey="people"
            name="People"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            isAnimationActive
          />
          <Line
            type="monotone"
            dataKey="violations"
            name="Violations"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            isAnimationActive
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
