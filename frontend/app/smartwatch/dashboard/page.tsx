"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import {
  getCrowdLogs,
  getLogEvents,
  getStatus,
  startPipeline,
  stopPipeline,
  type CrowdRow,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatCard } from "@/components/stat-card";
import { LiveFeed } from "@/components/live-feed";
import { EventFeed } from "@/components/event-feed";
import { CrowdChart } from "@/components/crowd-chart";

export default function SmartWatchDashboardPage() {
  const [sourceMode, setSourceMode] = useState<"webcam" | "file">("webcam");
  const [filePath, setFilePath] = useState("video/sample.mp4");
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const prevRunning = useRef(false);

  const { data: statusData, mutate: mutateStatus } = useSWR("sw-status", () => getStatus(), {
    refreshInterval: 3000,
  });
  const running = statusData?.status === "running";

  const { data: crowdData } = useSWR("sw-crowd", () => getCrowdLogs(), {
    refreshInterval: 3000,
  });
  const { data: eventsData } = useSWR("sw-events", () => getLogEvents(), {
    refreshInterval: 1000,
  });

  const rows: CrowdRow[] = crowdData?.rows ?? [];
  const last = rows[rows.length - 1];
  const people = last ? Number(last.human_count) || 0 : 0;
  const violations = last ? Number(last.violations) || 0 : 0;
  const events = eventsData?.events ?? [];
  const alertCount = events.filter(
    (e) => e.type === "violence" || e.type === "restricted_zone"
  ).length;

  const violenceActive = events.some((e) => e.type === "violence");

  const durationSec =
    sessionStart != null ? Math.max(0, Math.floor((Date.now() - sessionStart) / 1000)) : 0;
  const durationLabel = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (prevRunning.current && !running) {
      toast.success(
        <span>
          Session complete.{" "}
          <Link className="underline" href="/smartwatch/analytics">
            View results in Analytics →
          </Link>
        </span>
      );
      setSessionStart(null);
    }
    prevRunning.current = running;
  }, [running]);

  const onStart = useCallback(async () => {
    try {
      const src = sourceMode === "webcam" ? "webcam" : filePath.trim();
      await startPipeline(src);
      await mutateStatus();
      setSessionStart(Date.now());
      toast.message("Pipeline starting…");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Start failed");
    }
  }, [sourceMode, filePath, mutateStatus]);

  const onStop = useCallback(async () => {
    try {
      await stopPipeline();
      await mutateStatus();
      toast.message("Stop requested.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Stop failed");
    }
  }, [mutateStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Live monitoring and session controls.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="People in frame" value={people} />
        <StatCard title="Violations (latest row)" value={violations} />
        <StatCard title="Alerts (violence + zone)" value={alertCount} />
        <StatCard
          title="Session duration"
          value={running ? durationLabel : "—"}
          hint={running ? "Since Start" : undefined}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-10">
        <div className="space-y-4 lg:col-span-7">
          <LiveFeed violenceActive={violenceActive} crowdCount={people} />
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-3">
              <Label className="text-xs uppercase text-muted-foreground">Source</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="src"
                    checked={sourceMode === "webcam"}
                    onChange={() => setSourceMode("webcam")}
                  />
                  Webcam
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="src"
                    checked={sourceMode === "file"}
                    onChange={() => setSourceMode("file")}
                  />
                  Video file
                </label>
              </div>
              {sourceMode === "file" ? (
                <div className="space-y-1">
                  <Label htmlFor="vpath">Path to video</Label>
                  <Input
                    id="vpath"
                    value={filePath}
                    onChange={(e) => setFilePath(e.target.value)}
                    placeholder="video/sample.mp4"
                    className="font-mono text-sm"
                  />
                </div>
              ) : null}
            </div>
            <div className="flex gap-2">
              <Button type="button" onClick={onStart} disabled={running}>
                Start
              </Button>
              <Button type="button" variant="outline" onClick={onStop} disabled={!running}>
                Stop
              </Button>
            </div>
          </div>
        </div>
        <div className="lg:col-span-3">
          <EventFeed events={events} sessionStart={sessionStart} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-medium text-muted-foreground">Crowd & violations</h2>
        <CrowdChart rows={rows} />
      </div>
    </div>
  );
}
