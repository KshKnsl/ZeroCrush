const DEFAULT_BACKEND_URL = "https://knsl-zero-crush-backend.hf.space";

export const backendUrl = () => process.env.NEXT_PUBLIC_API_URL ?? DEFAULT_BACKEND_URL;

export function websocketUrl(path: string): string {
  const url = new URL(path, backendUrl());
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

async function parseJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(text || res.statusText);
  }
}

export type PipelineStatus = "idle" | "running" | "error";

export type StatusPayload = {
  status: PipelineStatus;
  error: string | null;
  stream_ready?: boolean;
  human_count?: number;
  violations?: number;
  restricted?: boolean;
  abnormal?: boolean;
};

export async function getStatus(): Promise<StatusPayload> {
  const res = await fetch(`${backendUrl()}/api/status`, { cache: "no-store" });
  if (!res.ok) throw new Error("Status unavailable");
  return parseJson(res);
}

export async function startPipeline(source: string): Promise<void> {
  const res = await fetch(`${backendUrl()}/api/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ source: source === "webcam" ? "webcam" : source }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || "Start failed");
  }
}

export async function stopPipeline(): Promise<void> {
  const res = await fetch(`${backendUrl()}/api/stop`, { method: "POST" });
  if (!res.ok) throw new Error("Stop failed");
}

export type CrowdRow = {
  time: string | number;
  human_count: number;
  violations: number;
  restricted: boolean;
  abnormal: boolean;
};

export async function getCrowdLogs(opts?: {
  session?: string | null;
  limit?: number;
}): Promise<{ rows: CrowdRow[] }> {
  const u = new URL(`${backendUrl()}/api/logs/crowd`);
  if (opts?.session) u.searchParams.set("session", opts.session);
  if (opts?.limit != null) u.searchParams.set("limit", String(opts.limit));
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) return { rows: [] };
  return parseJson(res);
}

export type LogEvent = {
  type: "restricted_zone" | "abnormal_activity";
  time: string;
  severity: string;
  label: string;
};

export async function getLogEvents(): Promise<{ events: LogEvent[]; session_start: number | null }> {
  const res = await fetch(`${backendUrl()}/api/logs/events`, { cache: "no-store" });
  if (!res.ok) return { events: [], session_start: null };
  return parseJson(res);
}

export async function getSessions(): Promise<string[]> {
  const res = await fetch(`${backendUrl()}/api/sessions`, { cache: "no-store" });
  if (!res.ok) return [];
  const data = await parseJson<{ sessions: string[] }>(res);
  return data.sessions ?? [];
}

export function tracksImageUrl(session?: string | null): string {
  const u = new URL(`${backendUrl()}/api/analytics/tracks-image`);
  if (session) u.searchParams.set("session", session);
  return u.toString();
}

export function heatmapImageUrl(session?: string | null): string {
  const u = new URL(`${backendUrl()}/api/analytics/heatmap-image`);
  if (session) u.searchParams.set("session", session);
  return u.toString();
}

export type EnergyBucket = { bucket: string; count: number };

export async function getEnergyDistribution(session?: string | null): Promise<EnergyBucket[]> {
  const u = new URL(`${backendUrl()}/api/analytics/energy`);
  if (session) u.searchParams.set("session", session);
  const res = await fetch(u.toString(), { cache: "no-store" });
  if (!res.ok) return [];
  const data = await parseJson<{ buckets: EnergyBucket[] }>(res);
  return data.buckets ?? [];
}

export type ConfigMap = Record<string, unknown>;

export async function getConfig(): Promise<ConfigMap> {
  const res = await fetch(`${backendUrl()}/api/config`, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load config");
  return parseJson(res);
}

export async function saveConfig(patch: ConfigMap): Promise<void> {
  const res = await fetch(`${backendUrl()}/api/config`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || "Save failed");
  }
}

export function streamUrl(): string {
  return process.env.NEXT_PUBLIC_STREAM_URL ?? `${backendUrl()}/api/stream`;
}
