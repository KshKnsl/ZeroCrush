import { useSyncExternalStore } from 'react';

export type BackendMode = 'headded' | 'headless';

const BACKEND_MODE_STORAGE_KEY = 'mode';
const BACKEND_MODE_EVENT = 'backend-mode-change';
const ENV_BACKEND_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://knsl-zero-crush-backend.hf.space';
export const LOCAL_BACKEND_URL = 'http://localhost:8000';

const isClient = () => typeof window !== 'undefined';
const isBackendMode = (value: string | null): value is BackendMode => value === 'headded' || value === 'headless';

const readStorage = (key: string) => {
  try {
    return isClient() ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
};

export function getBackendMode(): BackendMode {
  const stored = readStorage(BACKEND_MODE_STORAGE_KEY);
  return isBackendMode(stored) ? stored : 'headless';
}

export function setBackendMode(mode: BackendMode) {
  if (!isClient()) return;
  window.localStorage.setItem(BACKEND_MODE_STORAGE_KEY, mode);
  window.dispatchEvent(new Event(BACKEND_MODE_EVENT));
}

export function resolveBackendUrl(mode: BackendMode = getBackendMode()) {
  return mode === 'headded' ? LOCAL_BACKEND_URL : ENV_BACKEND_URL;
}

export const backendUrl = () => resolveBackendUrl();

function subscribeBackendMode(callback: () => void) {
  if (!isClient()) return () => {};

  const onStorage = (event: StorageEvent) => {
    if (event.key === BACKEND_MODE_STORAGE_KEY) callback();
  };

  window.addEventListener('storage', onStorage);
  window.addEventListener(BACKEND_MODE_EVENT, callback);

  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener(BACKEND_MODE_EVENT, callback);
  };
}

export function useBackendUrl() {
  return useSyncExternalStore(subscribeBackendMode, backendUrl, () => ENV_BACKEND_URL);
}

function buildUrl(path: string, params?: Record<string, string | number | null | undefined>) {
  const url = new URL(path, backendUrl());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== null && value !== undefined && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

export function websocketUrl(path: string): string {
  const url = new URL(path, backendUrl());
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
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

async function fetchJson<T>(path: string, init?: RequestInit, params?: Record<string, string | number | null | undefined>) {
  const res = await fetch(buildUrl(path, params), init);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return parseJson<T>(res);
}

async function fetchJsonOr<T>(path: string, fallback: T, params?: Record<string, string | number | null | undefined>) {
  const res = await fetch(buildUrl(path, params), { cache: 'no-store' });
  if (!res.ok) return fallback;
  return parseJson<T>(res);
}

export type PipelineStatus = 'idle' | 'running' | 'error';

export type CrowdRow = {
  time: string | number;
  human_count: number;
  violations: number;
  restricted: boolean;
  abnormal: boolean;
};

export async function getCrowdLogs(opts?: { session?: string | null; limit?: number }): Promise<{ rows: CrowdRow[] }> {
  return fetchJsonOr('/api/logs/crowd', { rows: [] }, {
    session: opts?.session,
    limit: opts?.limit,
  });
}

export type LogEvent = {
  type: 'restricted_zone' | 'abnormal_activity';
  time: string;
  severity: string;
  label: string;
};

export async function getLogEvents(): Promise<{ events: LogEvent[]; session_start: number | null }> {
  return fetchJsonOr('/api/logs/events', { events: [], session_start: null });
}

export async function getSessions(): Promise<string[]> {
  const data = await fetchJsonOr<{ sessions: string[] }>('/api/sessions', { sessions: [] });
  return data.sessions ?? [];
}

export type SessionSummary = {
  id: string;
  startTime: string | null;
  endTime: string | null;
  updatedAt: string | null;
};

export async function getSessionSummaries(): Promise<SessionSummary[]> {
  const data = await fetchJsonOr<{
    items?: Array<{
      id?: string;
      start_time?: string | null;
      end_time?: string | null;
      updated_at?: string | null;
    }>;
    sessions?: string[];
  }>('/api/sessions', { items: [], sessions: [] });

  if (Array.isArray(data.items) && data.items.length > 0) {
    return data.items
      .filter((item): item is { id: string; start_time?: string | null; end_time?: string | null; updated_at?: string | null } =>
        typeof item?.id === 'string' && item.id.length > 0
      )
      .map((item) => ({
        id: item.id,
        startTime: item.start_time ?? null,
        endTime: item.end_time ?? null,
        updatedAt: item.updated_at ?? null,
      }));
  }

  return (data.sessions ?? []).map((id) => ({ id, startTime: null, endTime: null, updatedAt: null }));
}

export function tracksImageUrl(session?: string | null): string {
  return buildUrl('/api/analytics/tracks-image', { session });
}

export function heatmapImageUrl(session?: string | null): string {
  return buildUrl('/api/analytics/heatmap-image', { session });
}

export function processedImageUrl(session?: string | null, kind: 'preview' | 'crowd' | 'violation' = 'preview'): string {
  return buildUrl('/api/analytics/processed-image', { session, kind });
}

export type EnergyBucket = { bucket: string; count: number };

export async function getEnergyDistribution(session?: string | null): Promise<EnergyBucket[]> {
  const data = await fetchJsonOr<{ buckets: EnergyBucket[] }>('/api/analytics/energy', { buckets: [] }, { session });
  return data.buckets ?? [];
}

export type ConfigMap = Record<string, unknown>;

export async function getConfig(): Promise<ConfigMap> {
  return fetchJson<ConfigMap>('/api/config', { cache: 'no-store' });
}

export async function saveConfig(patch: ConfigMap): Promise<void> {
  await fetchJson<unknown>('/api/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}
