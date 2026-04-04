"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  getCrowdLogs,
  getEnergyDistribution,
  getSessions,
  heatmapImageUrl,
  tracksImageUrl,
  type CrowdRow,
} from "@/lib/api";
import { CrowdChart } from "@/components/crowd-chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function SmartWatchAnalyticsPage() {
  const { data: sessions } = useSWR("sw-sessions", () => getSessions(), {
    refreshInterval: 15000,
  });
  const [session, setSession] = useState<string>("");

  useEffect(() => {
    if (sessions && sessions.length > 0 && !session) {
      setSession(sessions[0]);
    }
  }, [sessions, session]);

  const { data: crowdData } = useSWR(
    session ? ["sw-crowd-analytics", session] : null,
    () => getCrowdLogs({ session, limit: 200000 }),
    { refreshInterval: 60000 }
  );
  const rows: CrowdRow[] = crowdData?.rows ?? [];

  const { data: energy } = useSWR(
    session ? ["sw-energy", session] : null,
    () => getEnergyDistribution(session),
    { refreshInterval: 60000 }
  );

  const tracksSrc = session ? tracksImageUrl(session) : "";
  const heatSrc = session ? heatmapImageUrl(session) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
          <p className="text-sm text-muted-foreground">Post-run charts and exported visuals.</p>
        </div>
        <div className="space-y-1">
          <Label>Session</Label>
          <Select value={session || undefined} onValueChange={setSession}>
            <SelectTrigger className="w-[240px]">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {(sessions ?? []).map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Crowd & violations</h2>
          <CrowdChart rows={rows} />
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Movement tracks</h2>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {session ? (
            <img
              src={tracksSrc}
              alt="Movement tracks"
              className="max-h-80 w-full rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a session.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Heatmap</h2>
          {session ? (
            <img
              src={heatSrc}
              alt="Heatmap"
              className="max-h-80 w-full rounded-lg object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <p className="text-sm text-muted-foreground">Select a session.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 text-sm font-medium text-muted-foreground">Energy distribution</h2>
          <div className="h-72 w-full">
            {energy && energy.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energy} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 9 }} interval={0} angle={-35} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--card)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  />
                  <Bar dataKey="count" fill="oklch(0.546 0.245 262.881)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground">No energy data for this session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
