"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
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
  getAlertsHistory,
  getConfig,
  getCrowdLogs,
  getEnergyDistribution,
  getLogEvents,
  getSessions,
  getStatus,
  heatmapImageUrl,
  saveConfig,
  startPipeline,
  stopPipeline,
  tracksImageUrl,
  type AlertHistoryRow,
  type ConfigMap,
  type CrowdRow,
  type LogEvent,
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CrowdChart } from "@/components/crowd-chart";
import { EventFeed } from "@/components/event-feed";
import { LiveFeed } from "@/components/live-feed";
import { StatCard } from "@/components/stat-card";

type Point = [number, number];

function ZoneCanvas({
  frameWidth,
  frameHeight,
  points,
  onChange,
}: {
  frameWidth: number;
  frameHeight: number;
  points: Point[];
  onChange: (p: Point[]) => void;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const w = 320;
  const h = Math.round((frameHeight / frameWidth) * w);

  const draw = useCallback(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#444";
    ctx.strokeRect(0, 0, w, h);

    if (points.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      points.forEach((point, index) => {
        const x = (point[0] / frameWidth) * w;
        const y = (point[1] / frameHeight) * h;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (points.length >= 3) ctx.closePath();
      ctx.stroke();
    }

    points.forEach((point) => {
      const x = (point[0] / frameWidth) * w;
      const y = (point[1] / frameHeight) * h;
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [frameHeight, frameWidth, h, points, w]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={w}
        height={h}
        className="cursor-crosshair rounded-lg border border-slate-200 dark:border-slate-700"
        onClick={(event) => {
          const canvas = ref.current;
          if (!canvas) return;
          const rect = canvas.getBoundingClientRect();
          const mx = event.clientX - rect.left;
          const my = event.clientY - rect.top;
          const fx = Math.round((mx / w) * frameWidth);
          const fy = Math.round((my / h) * frameHeight);
          onChange([...points, [fx, fy]]);
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([])}>
        Clear polygon
      </Button>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        Click to add vertices in order (min 3 for a zone). Coordinates: {JSON.stringify(points)}
      </p>
    </div>
  );
}

export function SmartWatchDashboardPanel() {
  const [sourceMode, setSourceMode] = useState<"webcam" | "file">("webcam");
  const [filePath, setFilePath] = useState("video/sample.mp4");
  const [sessionStart, setSessionStart] = useState<number | null>(null);
  const prevRunning = useRef(false);

  const { data: statusData, mutate: mutateStatus } = useSWR("sw-status", () => getStatus(), {
    refreshInterval: 3000,
    revalidateOnFocus: false,
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
  const alertCount = events.filter((event) => event.type === "violence" || event.type === "restricted_zone").length;
  const violenceActive = events.some((event) => event.type === "violence");

  const durationSec = sessionStart != null ? Math.max(0, Math.floor((Date.now() - sessionStart) / 1000)) : 0;
  const durationLabel = `${Math.floor(durationSec / 60)}:${String(durationSec % 60).padStart(2, "0")}`;

  useEffect(() => {
    if (prevRunning.current && !running) {
      toast.success(
        <span>
          Session complete. {" "}
          <Link className="underline" href="/dashboard?mode=smartwatch&swTab=analytics">
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
      const source = sourceMode === "webcam" ? "webcam" : filePath.trim();
      await startPipeline(source);
      await mutateStatus();
      setSessionStart(Date.now());
      toast.message("Pipeline starting…");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Start failed");
    }
  }, [filePath, mutateStatus, sourceMode]);

  const onStop = useCallback(async () => {
    try {
      await stopPipeline();
      await mutateStatus();
      toast.message("Stop requested.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Stop failed");
    }
  }, [mutateStatus]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Live monitoring and session controls.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="People in frame" value={people} />
        <StatCard title="Violations (latest row)" value={violations} />
        <StatCard title="Alerts (violence + zone)" value={alertCount} />
        <StatCard title="Session duration" value={running ? durationLabel : "—"} hint={running ? "Since Start" : undefined} />
      </div>

      <div className="grid gap-6 lg:grid-cols-10">
        <div className="space-y-4 lg:col-span-7">
          <LiveFeed violenceActive={violenceActive} crowdCount={people} />
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end dark:border-slate-800 dark:bg-[#111111]">
            <div className="flex-1 space-y-3">
              <Label className="text-xs uppercase text-slate-500 dark:text-slate-400">Source</Label>
              <div className="flex flex-wrap gap-4">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="radio" name="src" checked={sourceMode === "webcam"} onChange={() => setSourceMode("webcam")} />
                  Webcam
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <input type="radio" name="src" checked={sourceMode === "file"} onChange={() => setSourceMode("file")} />
                  Video file
                </label>
              </div>
              {sourceMode === "file" ? (
                <div className="space-y-1">
                  <Label htmlFor="vpath" className="text-slate-700 dark:text-slate-300">Path to video</Label>
                  <Input id="vpath" value={filePath} onChange={(event) => setFilePath(event.target.value)} placeholder="video/sample.mp4" className="rounded-xl border border-slate-300 bg-slate-50 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100" />
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
          <EventFeed events={events as LogEvent[]} sessionStart={sessionStart} />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111111]">
        <h2 className="mb-4 text-sm font-medium text-slate-500 dark:text-slate-400">Crowd & violations</h2>
        <CrowdChart rows={rows} />
      </div>
    </div>
  );
}

function exportCsv(rows: AlertHistoryRow[]) {
  const header = ["session", "time", "type", "severity"];
  const lines = [header.join(","), ...rows.map((row) => [row.session, row.time, row.type, row.severity].join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "smartwatch-alerts.csv";
  link.click();
  URL.revokeObjectURL(url);
}

export function SmartWatchAnalyticsPanel() {
  const { data: sessions } = useSWR("sw-sessions", () => getSessions(), {
    refreshInterval: 15000,
  });
  const [session, setSession] = useState<string>("");

  useEffect(() => {
    if (sessions && sessions.length > 0 && !session) {
      setSession(sessions[0]);
    }
  }, [session, sessions]);

  const { data: crowdData } = useSWR(session ? ["sw-crowd-analytics", session] : null, () => getCrowdLogs({ session, limit: 200000 }), {
    refreshInterval: 60000,
  });
  const rows: CrowdRow[] = crowdData?.rows ?? [];

  const { data: energy } = useSWR(session ? ["sw-energy", session] : null, () => getEnergyDistribution(session), {
    refreshInterval: 60000,
  });

  const tracksSrc = session ? tracksImageUrl(session) : "";
  const heatSrc = session ? heatmapImageUrl(session) : "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Analytics</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Post-run charts and exported visuals.</p>
        </div>
        <div className="space-y-1">
          <Label className="text-slate-700 dark:text-slate-300">Session</Label>
          <Select value={session || undefined} onValueChange={setSession}>
            <SelectTrigger className="w-[240px] rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {(sessions ?? []).map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111111]">
          <h2 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Crowd & violations</h2>
          <CrowdChart rows={rows} />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111111]">
          <h2 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Movement tracks</h2>
          {session ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tracksSrc}
              alt="Movement tracks"
              className="max-h-80 w-full rounded-lg object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a session.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111111]">
          <h2 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Heatmap</h2>
          {session ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={heatSrc}
              alt="Heatmap"
              className="max-h-80 w-full rounded-lg object-contain"
              onError={(event) => {
                event.currentTarget.style.display = "none";
              }}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Select a session.</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#111111]">
          <h2 className="mb-3 text-sm font-medium text-slate-500 dark:text-slate-400">Energy distribution</h2>
          <div className="h-72 w-full">
            {energy && energy.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={energy} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-slate-300 dark:stroke-slate-700" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 9, fill: '#64748b' }} interval={0} angle={-35} textAnchor="end" height={60} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                  <Tooltip
                    contentStyle={{
                      background: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#111111' : '#ffffff',
                      border: '1px solid ' + (typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#3f3f46' : '#e2e8f0'),
                      borderRadius: 12,
                      color: typeof window !== 'undefined' && document.documentElement.classList.contains('dark') ? '#f1f5f9' : '#0f172a',
                    }}
                  />
                  <Bar dataKey="count" fill="#84cc16" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">No energy data for this session.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SmartWatchAlertsPanel() {
  const { data: alerts } = useSWR("sw-alerts-all", () => getAlertsHistory(), {
    refreshInterval: 30000,
  });
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const filtered = useCallback(() => {
    const rows = alerts ?? [];
    if (typeFilter === "all") return rows;
    return rows.filter((row) => row.type === typeFilter);
  }, [alerts, typeFilter])();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Alerts</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">History across processed sessions.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[200px] rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100">
            <SelectValue placeholder="Filter type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="violence">Violence</SelectItem>
            <SelectItem value="restricted_zone">Restricted zone</SelectItem>
            <SelectItem value="abnormal_activity">Abnormal activity</SelectItem>
          </SelectContent>
        </Select>
        <Button type="button" variant="outline" onClick={() => exportCsv(filtered)}>
          Export CSV
        </Button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-200 dark:border-slate-800">
              <TableHead className="text-slate-600 dark:text-slate-400">Session</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">Time</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">Type</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">Severity</TableHead>
              <TableHead className="text-slate-600 dark:text-slate-400">Snapshot</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow className="border-slate-200 dark:border-slate-800">
                <TableCell colSpan={5} className="text-center text-slate-500 dark:text-slate-400">
                  No alerts (or API offline).
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((alert, index) => (
                <TableRow key={`${alert.session}-${alert.time}-${alert.type}-${index}`} className="border-slate-200 dark:border-slate-800">
                  <TableCell className="font-mono text-xs text-slate-700 dark:text-slate-300">{alert.session}</TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">{alert.time}</TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">{alert.type}</TableCell>
                  <TableCell className="text-slate-700 dark:text-slate-300">{alert.severity}</TableCell>
                  <TableCell className="text-slate-500 dark:text-slate-400">—</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function SmartWatchSettingsPanel() {
  const { data: cfg, mutate } = useSWR("sw-config", () => getConfig(), { revalidateOnFocus: false });
  const [form, setForm] = useState<ConfigMap>({});
  const [zone, setZone] = useState<Point[]>([]);

  useEffect(() => {
    if (cfg) {
      setForm({ ...cfg });
      const restrictedZone = cfg.RESTRICTED_ZONE;
      if (Array.isArray(restrictedZone)) {
        setZone(restrictedZone.map((point) => (Array.isArray(point) && point.length >= 2 ? [Number(point[0]), Number(point[1])] : [0, 0])) as Point[]);
      }
    }
  }, [cfg]);

  const frameWidth = Number(form.FRAME_WIDTH) || 640;
  const frameHeight = Number(form.FRAME_HEIGHT) || 480;

  const onSave = async () => {
    try {
      const patch = { ...form, RESTRICTED_ZONE: zone };
      await saveConfig(patch);
      await mutate();
      toast.success("Configuration saved.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Save failed");
    }
  };

  const setNumber = (key: string, value: number) => setForm((current) => ({ ...current, [key]: value }));
  const setString = (key: string, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const setBoolean = (key: string, value: boolean) => setForm((current) => ({ ...current, [key]: value }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Edit Python config.py via the API (server must allow writes).</p>
      </div>

      <Card className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Video input</CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">Source path and capture mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="VIDEO_SOURCE" className="text-slate-700 dark:text-slate-300">VIDEO_SOURCE</Label>
            <Input
              id="VIDEO_SOURCE"
              value={String(form.VIDEO_SOURCE ?? "")}
              onChange={(event) => setString("VIDEO_SOURCE", event.target.value)}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={Boolean(form.IS_REALTIME)} onCheckedChange={(value) => setBoolean("IS_REALTIME", value)} />
            <Label className="text-slate-700 dark:text-slate-300">IS_REALTIME (webcam)</Label>
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">PROCESSING_FPS</Label>
            <Input
              type="number"
              value={Number(form.PROCESSING_FPS ?? 10)}
              onChange={(event) => setNumber("PROCESSING_FPS", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={Boolean(form.CAMERA_ELEVATED)} onCheckedChange={(value) => setBoolean("CAMERA_ELEVATED", value)} />
            <Label className="text-slate-700 dark:text-slate-300">CAMERA_ELEVATED</Label>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">YOLO_CONFIDENCE ({String(form.YOLO_CONFIDENCE ?? 0)})</Label>
            <Slider
              className="mt-2"
              min={0}
              max={1}
              step={0.05}
              value={[Number(form.YOLO_CONFIDENCE ?? 0.4)]}
              onValueChange={(value) => setNumber("YOLO_CONFIDENCE", value[0] ?? 0)}
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">FRAME_WIDTH</Label>
            <Input
              type="number"
              value={Number(form.FRAME_WIDTH ?? 640)}
              onChange={(event) => setNumber("FRAME_WIDTH", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Crowd analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">DISTANCE_THRESHOLD</Label>
            <Input
              type="number"
              value={Number(form.DISTANCE_THRESHOLD ?? 0)}
              onChange={(event) => setNumber("DISTANCE_THRESHOLD", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">MIN_CROWD_FOR_ANALYSIS</Label>
            <Input
              type="number"
              value={Number(form.MIN_CROWD_FOR_ANALYSIS ?? 3)}
              onChange={(event) => setNumber("MIN_CROWD_FOR_ANALYSIS", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">Restricted zone (click canvas)</Label>
            <ZoneCanvas frameWidth={frameWidth} frameHeight={frameHeight} points={zone} onChange={setZone} />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Abnormal activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch checked={Boolean(form.CHECK_ABNORMAL)} onCheckedChange={(value) => setBoolean("CHECK_ABNORMAL", value)} />
            <Label className="text-slate-700 dark:text-slate-300">CHECK_ABNORMAL</Label>
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">MIN_PERSONS_ABNORMAL</Label>
            <Input
              type="number"
              value={Number(form.MIN_PERSONS_ABNORMAL ?? 5)}
              onChange={(event) => setNumber("MIN_PERSONS_ABNORMAL", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">ENERGY_THRESHOLD</Label>
            <Input
              type="number"
              value={Number(form.ENERGY_THRESHOLD ?? 0)}
              onChange={(event) => setNumber("ENERGY_THRESHOLD", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">ABNORMAL_RATIO_THRESHOLD</Label>
            <Input
              type="number"
              step={0.01}
              value={Number(form.ABNORMAL_RATIO_THRESHOLD ?? 0)}
              onChange={(event) => setNumber("ABNORMAL_RATIO_THRESHOLD", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#111111]">
        <CardHeader>
          <CardTitle className="text-slate-900 dark:text-slate-100">Violence detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-slate-700 dark:text-slate-300">VIOLENCE_MODEL_PATH</Label>
            <Input
              value={String(form.VIOLENCE_MODEL_PATH ?? "")}
              onChange={(event) => setString("VIOLENCE_MODEL_PATH", event.target.value)}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">VIOLENCE_FRAME_BUFFER</Label>
            <Input
              type="number"
              value={Number(form.VIOLENCE_FRAME_BUFFER ?? 16)}
              onChange={(event) => setNumber("VIOLENCE_FRAME_BUFFER", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">VIOLENCE_CONFIDENCE</Label>
            <Slider
              className="mt-2"
              min={0}
              max={1}
              step={0.05}
              value={[Number(form.VIOLENCE_CONFIDENCE ?? 0.7)]}
              onValueChange={(value) => setNumber("VIOLENCE_CONFIDENCE", value[0] ?? 0)}
            />
          </div>
          <div>
            <Label className="text-slate-700 dark:text-slate-300">VIOLENCE_CHECK_STRIDE</Label>
            <Input
              type="number"
              value={Number(form.VIOLENCE_CHECK_STRIDE ?? 8)}
              onChange={(event) => setNumber("VIOLENCE_CHECK_STRIDE", Number(event.target.value))}
              className="mt-1 rounded-xl border border-slate-300 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-[#0c0c0c] dark:text-slate-100"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button type="button" onClick={onSave} className="rounded-xl bg-lime-500 text-white hover:bg-lime-600 dark:bg-lime-600 dark:hover:bg-lime-700">
          Save configuration
        </Button>
      </div>
    </div>
  );
}
