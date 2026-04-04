"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { toast } from "sonner";
import { getConfig, saveConfig, type ConfigMap } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#444";
    ctx.strokeRect(0, 0, w, h);
    if (points.length >= 2) {
      ctx.beginPath();
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      points.forEach((pt, i) => {
        const x = (pt[0] / frameWidth) * w;
        const y = (pt[1] / frameHeight) * h;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      if (points.length >= 3) ctx.closePath();
      ctx.stroke();
    }
    points.forEach((pt) => {
      const x = (pt[0] / frameWidth) * w;
      const y = (pt[1] / frameHeight) * h;
      ctx.fillStyle = "#f87171";
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  }, [points, frameWidth, frameHeight, w, h]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <div className="space-y-2">
      <canvas
        ref={ref}
        width={w}
        height={h}
        className="cursor-crosshair rounded-lg border border-border"
        onClick={(e) => {
          const c = ref.current;
          if (!c) return;
          const rect = c.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const fx = Math.round((mx / w) * frameWidth);
          const fy = Math.round((my / h) * frameHeight);
          onChange([...points, [fx, fy]]);
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => onChange([])}>
        Clear polygon
      </Button>
      <p className="text-xs text-muted-foreground">
        Click to add vertices in order (min 3 for a zone). Coordinates: {JSON.stringify(points)}
      </p>
    </div>
  );
}

export default function SmartWatchSettingsPage() {
  const { data: cfg, mutate } = useSWR("sw-config", () => getConfig(), { revalidateOnFocus: false });
  const [form, setForm] = useState<ConfigMap>({});
  const [zone, setZone] = useState<Point[]>([]);

  useEffect(() => {
    if (cfg) {
      setForm({ ...cfg });
      const z = cfg.RESTRICTED_ZONE;
      if (Array.isArray(z)) {
        setZone(
          z.map((p) => (Array.isArray(p) && p.length >= 2 ? [Number(p[0]), Number(p[1])] : [0, 0])) as Point[]
        );
      }
    }
  }, [cfg]);

  const fw = Number(form.FRAME_WIDTH) || 640;
  const fh = Number(form.FRAME_HEIGHT) || 480;

  const onSave = async () => {
    try {
      const patch = { ...form, RESTRICTED_ZONE: zone };
      await saveConfig(patch);
      await mutate();
      toast.success("Configuration saved.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const n = (k: string, v: number) => setForm((f) => ({ ...f, [k]: v }));
  const s = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const b = (k: string, v: boolean) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">Edit Python `config.py` via the API (server must allow writes).</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Video input</CardTitle>
          <CardDescription>Source path and capture mode.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="VIDEO_SOURCE">VIDEO_SOURCE</Label>
            <Input
              id="VIDEO_SOURCE"
              value={String(form.VIDEO_SOURCE ?? "")}
              onChange={(e) => s("VIDEO_SOURCE", e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(form.IS_REALTIME)}
              onCheckedChange={(v) => b("IS_REALTIME", v)}
            />
            <Label>IS_REALTIME (webcam)</Label>
          </div>
          <div>
            <Label>PROCESSING_FPS</Label>
            <Input
              type="number"
              value={Number(form.PROCESSING_FPS ?? 10)}
              onChange={(e) => n("PROCESSING_FPS", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(form.CAMERA_ELEVATED)}
              onCheckedChange={(v) => b("CAMERA_ELEVATED", v)}
            />
            <Label>CAMERA_ELEVATED</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>YOLO_CONFIDENCE ({String(form.YOLO_CONFIDENCE ?? 0)})</Label>
            <Slider
              className="mt-2"
              min={0}
              max={1}
              step={0.05}
              value={[Number(form.YOLO_CONFIDENCE ?? 0.4)]}
              onValueChange={(v) => n("YOLO_CONFIDENCE", v[0] ?? 0)}
            />
          </div>
          <div>
            <Label>FRAME_WIDTH</Label>
            <Input
              type="number"
              value={Number(form.FRAME_WIDTH ?? 640)}
              onChange={(e) => n("FRAME_WIDTH", Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Crowd analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>DISTANCE_THRESHOLD</Label>
            <Input
              type="number"
              value={Number(form.DISTANCE_THRESHOLD ?? 0)}
              onChange={(e) => n("DISTANCE_THRESHOLD", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>MIN_CROWD_FOR_ANALYSIS</Label>
            <Input
              type="number"
              value={Number(form.MIN_CROWD_FOR_ANALYSIS ?? 3)}
              onChange={(e) => n("MIN_CROWD_FOR_ANALYSIS", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>Restricted zone (click canvas)</Label>
            <ZoneCanvas frameWidth={fw} frameHeight={fh} points={zone} onChange={setZone} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Abnormal activity</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(form.CHECK_ABNORMAL)}
              onCheckedChange={(v) => b("CHECK_ABNORMAL", v)}
            />
            <Label>CHECK_ABNORMAL</Label>
          </div>
          <div>
            <Label>MIN_PERSONS_ABNORMAL</Label>
            <Input
              type="number"
              value={Number(form.MIN_PERSONS_ABNORMAL ?? 5)}
              onChange={(e) => n("MIN_PERSONS_ABNORMAL", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>ENERGY_THRESHOLD</Label>
            <Input
              type="number"
              value={Number(form.ENERGY_THRESHOLD ?? 0)}
              onChange={(e) => n("ENERGY_THRESHOLD", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>ABNORMAL_RATIO_THRESHOLD</Label>
            <Input
              type="number"
              step={0.01}
              value={Number(form.ABNORMAL_RATIO_THRESHOLD ?? 0)}
              onChange={(e) => n("ABNORMAL_RATIO_THRESHOLD", Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Violence detection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>VIOLENCE_MODEL_PATH</Label>
            <Input
              value={String(form.VIOLENCE_MODEL_PATH ?? "")}
              onChange={(e) => s("VIOLENCE_MODEL_PATH", e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label>VIOLENCE_FRAME_BUFFER</Label>
            <Input
              type="number"
              value={Number(form.VIOLENCE_FRAME_BUFFER ?? 16)}
              onChange={(e) => n("VIOLENCE_FRAME_BUFFER", Number(e.target.value))}
              className="mt-1"
            />
          </div>
          <div>
            <Label>VIOLENCE_CONFIDENCE</Label>
            <Slider
              className="mt-2"
              min={0}
              max={1}
              step={0.05}
              value={[Number(form.VIOLENCE_CONFIDENCE ?? 0.7)]}
              onValueChange={(v) => n("VIOLENCE_CONFIDENCE", v[0] ?? 0)}
            />
          </div>
          <div>
            <Label>VIOLENCE_CHECK_STRIDE</Label>
            <Input
              type="number"
              value={Number(form.VIOLENCE_CHECK_STRIDE ?? 8)}
              onChange={(e) => n("VIOLENCE_CHECK_STRIDE", Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Alerts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Switch
              checked={Boolean(form.ALERT_ENABLED)}
              onCheckedChange={(v) => b("ALERT_ENABLED", v)}
            />
            <Label>ALERT_ENABLED</Label>
          </div>
          <div>
            <Label>TELEGRAM_BOT_TOKEN</Label>
            <Input
              value={String(form.TELEGRAM_BOT_TOKEN ?? "")}
              onChange={(e) => s("TELEGRAM_BOT_TOKEN", e.target.value)}
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label>TELEGRAM_CHAT_ID</Label>
            <Input
              value={String(form.TELEGRAM_CHAT_ID ?? "")}
              onChange={(e) => s("TELEGRAM_CHAT_ID", e.target.value)}
              className="mt-1"
            />
          </div>
          <div>
            <Label>ALERT_COOLDOWN_SECONDS</Label>
            <Input
              type="number"
              value={Number(form.ALERT_COOLDOWN_SECONDS ?? 30)}
              onChange={(e) => n("ALERT_COOLDOWN_SECONDS", Number(e.target.value))}
              className="mt-1"
            />
          </div>
        </CardContent>
      </Card>

      <Button type="button" onClick={onSave}>
        Save configuration
      </Button>
    </div>
  );
}
