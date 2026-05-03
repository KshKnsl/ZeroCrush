"use client";

import { useEffect, useRef, useState, type JSX, type MouseEvent } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Activity, Link2, MonitorPlay, Play, ShieldAlert, ShieldCheck, ShieldX, Square, Upload, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

type StatusPayload = {
  session_id?: string;
  status?: string;
  error?: string | null;
  stream_ready?: boolean;
  human_count?: number;
  alerts?: number;
  violations?: number;
  restricted?: boolean;
  abnormal?: boolean;
};

type SessionSummaryResponse = {
  sessionData?: unknown;
};

type Point = { x: number; y: number };

type OverlayGeometry = {
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
};

const riskConfig = {
  LOW: { color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/30', border: 'border-slate-300 dark:border-slate-700', Icon: ShieldCheck },
  MED: { color: 'text-slate-800 dark:text-slate-100', bg: 'bg-slate-200 dark:bg-slate-700/40', border: 'border-slate-400 dark:border-slate-600', Icon: ShieldAlert },
  HIGH: { color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-900/20', border: 'border-rose-300 dark:border-rose-700', Icon: ShieldX },
} as const;

const STATUS_POLL_INTERVAL_MS = 3000;
const ALL_STATUS_POLL_INTERVAL_MS = 15000;

const initialRisk = 'LOW' as const;

export default function LiveMonitoring(): JSX.Element {
  const [apiUrl] = useState(() => (typeof window === 'undefined' ? 'http://localhost:8000' : window.localStorage.getItem('backend-url') || 'http://localhost:8000'));
  const [sourceMode, setSourceMode] = useState('rtsp');
  const [pipelineStatus, setPipelineStatus] = useState('idle');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [humanCount, setHumanCount] = useState(0);
  const [alertCount, setAlertCount] = useState(0);
  const [riskLevel, setRiskLevel] = useState<string>(initialRisk);
  const [rtspUrl, setRtspUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [connectionState, setConnectionState] = useState<string>('polling');
  const [starting, setStarting] = useState(false);
  const [drawingZone, setDrawingZone] = useState(false);
  const [zonePoints, setZonePoints] = useState<Point[]>([]);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [overlayGeometry, setOverlayGeometry] = useState<OverlayGeometry | null>(null);
  const [streamToken, setStreamToken] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [allSessions, setAllSessions] = useState<StatusPayload[]>([]);
  const [multiRtspUrl, setMultiRtspUrl] = useState('');
  const [multiStarting, setMultiStarting] = useState(false);
  const [multiViewMode, setMultiViewMode] = useState<'grid' | 'list'>('grid');
  const [multiGridPreset, setMultiGridPreset] = useState<'2x2' | '3x3'>('2x2');
  const [sessionLabels, setSessionLabels] = useState<Record<string, string>>({});
  const { color: riskColor, bg: riskBg, border: riskBorder, Icon: RiskIcon } = riskConfig[riskLevel as keyof typeof riskConfig] ?? riskConfig.LOW;

  const imageRef = useRef<HTMLImageElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastErrorToastRef = useRef('');
  const lastConsoleErrorRef = useRef('');
  const humanCountRef = useRef(0);
  const alertCountRef = useRef(0);
  const previousStatusRef = useRef('idle');
  const sessionSummaryPendingRef = useRef(false);
  const sessionSummaryInFlightRef = useRef(false);
  const pollInFlightRef = useRef(false);

  const notifyError = (message: string) => {
    if (lastErrorToastRef.current === message) {
      return;
    }
    lastErrorToastRef.current = message;
    toast.error(message);
  };

  const logFrontendError = (source: string, message: string) => {
    const fingerprint = `${source}:${message}`;
    if (lastConsoleErrorRef.current === fingerprint) {
      return;
    }
    lastConsoleErrorRef.current = fingerprint;
    console.error(`[LiveMonitoring] ${source}: ${message}`);
  };

  const resetSession = () => {
    setStreamReady(false);
    setStreamError(null);
  };

  useEffect(() => {
    if (pipelineError) {
      logFrontendError('pipeline', pipelineError);
    }
  }, [pipelineError]);

  useEffect(() => {
    if (streamError) {
      logFrontendError('stream', streamError);
    }
  }, [streamError]);

  const updateRisk = (count: number, alerts: number, restricted: boolean, abnormal: boolean) => {
    const activeAlerts = Number(Boolean(restricted)) + Number(Boolean(abnormal)) + Number(alerts > 0);
    humanCountRef.current = count;
    alertCountRef.current = alerts;
    setHumanCount(count);
    setAlertCount(alerts);

    if (activeAlerts > 1 || count > 60) {
      setRiskLevel('HIGH');
    } else if (activeAlerts === 1 || count > 25) {
      setRiskLevel('MED');
    } else {
      setRiskLevel('LOW');
    }
  };

  const refreshOverlayGeometry = () => {
    const image = imageRef.current;
    if (!image) {
      setOverlayGeometry(null);
      return;
    }

    const width = image.clientWidth;
    const height = image.clientHeight;
    const naturalWidth = image.naturalWidth || width || 1;
    const naturalHeight = image.naturalHeight || height || 1;
    const scale = Math.min(width / naturalWidth, height / naturalHeight);
    const drawWidth = naturalWidth * scale;
    const drawHeight = naturalHeight * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;
    setOverlayGeometry({ width, height, scale, offsetX, offsetY });
  };

  const mapClientToFramePoint = (clientX: number, clientY: number): Point | null => {
    const image = imageRef.current;
    const wrap = imageWrapRef.current;
    if (!image || !wrap) return null;

    const geom = overlayGeometry;
    if (!geom) return null;

    const rect = image.getBoundingClientRect();
    const xInImage = clientX - rect.left;
    const yInImage = clientY - rect.top;

    if (xInImage < geom.offsetX || yInImage < geom.offsetY) return null;
    if (xInImage > geom.offsetX + (geom.width - 2 * geom.offsetX)) return null;
    if (yInImage > geom.offsetY + (geom.height - 2 * geom.offsetY)) return null;

    const frameX = Math.round((xInImage - geom.offsetX) / geom.scale);
    const frameY = Math.round((yInImage - geom.offsetY) / geom.scale);
    return { x: Math.max(0, frameX), y: Math.max(0, frameY) };
  };

  const framePointToOverlay = (p: Point): Point | null => {
    if (!overlayGeometry) return null;
    return {
      x: overlayGeometry.offsetX + p.x * overlayGeometry.scale,
      y: overlayGeometry.offsetY + p.y * overlayGeometry.scale,
    };
  };

  const applyStatusPayload = (payload: StatusPayload) => {
    if (typeof payload.status === 'string') {
      setPipelineStatus(payload.status);
    }

    if (typeof payload.error === 'string') {
      setPipelineError(payload.error);
      setStreamError(payload.error);
    } else if (payload.status === 'running') {
      setPipelineError(null);
      setStreamError(null);
    }

    if (typeof payload.stream_ready === 'boolean') {
      setStreamReady(payload.stream_ready);
    }

    const hasMetrics =
      typeof payload.human_count === 'number' ||
      typeof payload.alerts === 'number' ||
      typeof payload.violations === 'number' ||
      typeof payload.restricted === 'boolean' ||
      typeof payload.abnormal === 'boolean';

    if (hasMetrics) {
      const nextCount = typeof payload.human_count === 'number' ? payload.human_count : humanCountRef.current;
      const nextAlerts = typeof payload.alerts === 'number'
        ? payload.alerts
        : (typeof payload.violations === 'number' ? payload.violations : alertCountRef.current);
      updateRisk(nextCount, nextAlerts, Boolean(payload.restricted), Boolean(payload.abnormal));
    }
  };

  const postJson = async (path: string, body: Record<string, unknown>) => {
    const response = await fetch(`${apiUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(await response.text());
    }

    return response;
  };

  const buildApiPathWithSession = (path: string) => {
    if (!currentSessionId) {
      return `${apiUrl}${path}`;
    }
    const separator = path.includes('?') ? '&' : '?';
    return `${apiUrl}${path}${separator}session_id=${encodeURIComponent(currentSessionId)}`;
  };

  const saveSessionSummary = async () => {
    if (sessionSummaryInFlightRef.current) {
      return;
    }

    sessionSummaryInFlightRef.current = true;
    try {
      const response = await fetch(buildApiPathWithSession('/api/session-summary'), { cache: 'no-store' });
      if (!response.ok) {
        return;
      }

      const payload = (await response.json()) as SessionSummaryResponse;
      if (!payload.sessionData) {
        return;
      }

      const toastId = toast.loading('Session completed, saving data to database...');
      const saveResponse = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload.sessionData),
      });

      if (!saveResponse.ok) {
        throw new Error('Failed to save session');
      }

      sessionSummaryPendingRef.current = false;
      toast.success('Session saved to database!', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Error saving session to DB';
      toast.error(message);
    } finally {
      sessionSummaryInFlightRef.current = false;
    }
  };

  const handleZoneSave = async () => {
    if (zonePoints.length < 3) {
      const message = 'Add at least 3 points to save a restricted zone';
      setStreamError(message);
      notifyError(message);
      return;
    }

    setZoneSaving(true);
    setStreamError(null);
    const toastId = toast.loading('Saving restricted zone...');
    try {
      const response = await postJson('/api/config', { RESTRICTED_ZONE: zonePoints.map((p) => [p.x, p.y]) });
      if (!response.ok) {
        throw new Error('Unable to save restricted zone');
      }
      setDrawingZone(false);
      toast.success('Restricted zone saved.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save restricted zone';
      setStreamError(message);
      toast.error(message, { id: toastId });
    } finally {
      setZoneSaving(false);
    }
  };

  const handleZoneClear = async () => {
    setZoneSaving(true);
    setStreamError(null);
    const toastId = toast.loading('Clearing restricted zone...');
    try {
      const response = await postJson('/api/config', { RESTRICTED_ZONE: [] });
      if (!response.ok) {
        throw new Error('Unable to clear restricted zone');
      }
      setZonePoints([]);
      setDrawingZone(false);
      toast.success('Restricted zone cleared.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to clear restricted zone';
      setStreamError(message);
      toast.error(message, { id: toastId });
    } finally {
      setZoneSaving(false);
    }
  };

  const handleZoneClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!drawingZone) return;
    const next = mapClientToFramePoint(event.clientX, event.clientY);
    if (!next) return;
    setZonePoints((current) => [...current, next]);
  };

  const startRemoteSource = async (): Promise<string> => {
    if (sourceMode === 'mp4') {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        throw new Error('Choose an MP4 file first');
      }

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error(await uploadResponse.text());
      }

      const uploadData = (await uploadResponse.json()) as { file_path?: string };
      if (!uploadData.file_path) {
        throw new Error('Backend did not return a file path');
      }

      setSelectedFileName(file.name);
      const response = await postJson('/api/start', { source: 'file', path: uploadData.file_path });
      const startData = (await response.json()) as { session_id?: string };
      if (!startData.session_id) {
        throw new Error('Backend did not return a session id');
      }
      return startData.session_id;
    }

    if (!rtspUrl.trim()) {
      throw new Error('Enter an RTSP URL first');
    }

    const response = await postJson('/api/start', { source: 'rtsp', url: rtspUrl.trim() });
    const startData = (await response.json()) as { session_id?: string };
    if (!startData.session_id) {
      throw new Error('Backend did not return a session id');
    }
    return startData.session_id;
  };

  const handleStart = async () => {
    setStarting(true);
    setStreamError(null);
    setPipelineError(null);
    setPipelineStatus('idle');
    setStreamReady(false);
    setConnectionState('polling');
    setStreamToken((current) => current + 1);
    updateRisk(0, 0, false, false);
    const toastId = toast.loading('Starting monitoring session...');

    try {
      const sessionId = await startRemoteSource();
      setCurrentSessionId(sessionId);
      toast.success('Monitoring session started.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start stream';
      setStreamError(message);
      setPipelineError(message);
      setPipelineStatus('error');
      toast.error(message, { id: toastId });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    try {
      const stopPath = currentSessionId ? `/api/stop?session_id=${encodeURIComponent(currentSessionId)}` : '/api/stop';
      await postJson(stopPath, {});
      setPipelineStatus('idle');
      setPipelineError(null);
      setStreamError(null);
      setStreamReady(false);
      setConnectionState('polling');
      setCurrentSessionId(null);
      toast.success('Monitoring session stopped.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to stop stream';
      setStreamError(message);
      notifyError(message);
    }
  };

  const handleStartAdditionalRtsp = async () => {
    if (!multiRtspUrl.trim()) {
      toast.error('Enter an RTSP URL first');
      return;
    }
    setMultiStarting(true);
    const toastId = toast.loading('Starting additional RTSP session...');
    try {
      const response = await postJson('/api/start', { source: 'rtsp', url: multiRtspUrl.trim() });
      const payload = (await response.json()) as { session_id?: string };
      if (!payload.session_id) {
        throw new Error('Backend did not return a session id');
      }
      setCurrentSessionId((prev) => prev ?? payload.session_id ?? null);
      setMultiRtspUrl('');
      toast.success('Additional RTSP session started.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start RTSP session';
      toast.error(message, { id: toastId });
    } finally {
      setMultiStarting(false);
    }
  };

  const handleStopSessionById = async (sessionId: string) => {
    try {
      await postJson(`/api/stop?session_id=${encodeURIComponent(sessionId)}`, {});
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null);
      }
      toast.success(`Stopped session ${sessionId}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to stop session';
      toast.error(message);
    }
  };

  const upsertSessionLabel = (sessionId: string, label: string) => {
    setSessionLabels((current) => ({ ...current, [sessionId]: label }));
  };

  useEffect(() => {
    return () => {
      resetSession();
    };
  }, []);

  useEffect(() => {
    resetSession();
    previousStatusRef.current = 'idle';
    sessionSummaryPendingRef.current = false;
    setConnectionState('polling');
    setStreamToken((current) => current + 1);
  }, [apiUrl]);

  useEffect(() => {
    let cancelled = false;

    const pollStatus = async () => {
      if (pollInFlightRef.current) {
        return;
      }

      pollInFlightRef.current = true;
      try {
        const response = await fetch(buildApiPathWithSession('/api/status'), { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Failed to load status (${response.status})`);
        }

        const payload = (await response.json()) as StatusPayload;
        if (cancelled) {
          return;
        }

        const nextStatus = typeof payload.status === 'string' ? payload.status : 'idle';
        const wasRunning = previousStatusRef.current === 'running';
        const isRunning = nextStatus === 'running';

        setConnectionState('connected');
        applyStatusPayload(payload);

        if (isRunning) {
          sessionSummaryPendingRef.current = false;
        } else if (wasRunning && nextStatus === 'idle') {
          sessionSummaryPendingRef.current = true;
        } else if (nextStatus === 'error') {
          sessionSummaryPendingRef.current = false;
        }

        previousStatusRef.current = nextStatus;

        if (sessionSummaryPendingRef.current && !isRunning) {
          await saveSessionSummary();
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        setConnectionState('disconnected');
        const message = error instanceof Error ? error.message : 'Unable to load backend status';
        setStreamError(message);
        notifyError(message);
      } finally {
        pollInFlightRef.current = false;
      }
    };

    pollStatus();
    const interval = window.setInterval(pollStatus, STATUS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiUrl, currentSessionId]);

  useEffect(() => {
    let cancelled = false;

    const pollAllStatuses = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/status/all`, { cache: 'no-store' });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { sessions?: StatusPayload[] };
        if (cancelled) {
          return;
        }
        const sessions = Array.isArray(payload.sessions) ? payload.sessions : [];
        setAllSessions(sessions);
        setSessionLabels((current) => {
          const next = { ...current };
          let changed = false;
          sessions.forEach((session, index) => {
            const sid = session.session_id ?? '';
            if (!sid) return;
            if (!next[sid]) {
              next[sid] = `Cam ${index + 1}`;
              changed = true;
            }
          });
          return changed ? next : current;
        });

        if (!currentSessionId && sessions.length > 0) {
          setCurrentSessionId(sessions[0].session_id ?? null);
        }
      } catch {
        // Keep single-session mode working even if all-status endpoint fails.
      }
    };

    pollAllStatuses();
    const interval = window.setInterval(pollAllStatuses, ALL_STATUS_POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [apiUrl, currentSessionId]);

  useEffect(() => {
    const onResize = () => refreshOverlayGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadZoneFromConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/config`, { cache: 'no-store' });
        if (!res.ok) return;
        const cfg = (await res.json()) as Record<string, unknown>;
        const zone = Array.isArray(cfg.RESTRICTED_ZONE) ? cfg.RESTRICTED_ZONE : [];
        const points = zone
          .filter((pt) => Array.isArray(pt) && pt.length === 2)
          .map((pt) => ({ x: Number(pt[0]) || 0, y: Number(pt[1]) || 0 }));
        if (!cancelled) {
          setZonePoints(points);
        }
      } catch {
        // Keep zone editing optional if config endpoint is unavailable.
      }
    };

    loadZoneFromConfig();
    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const overlayPoints = zonePoints
    .map((point) => framePointToOverlay(point))
    .filter((point): point is Point => point !== null);
  const overlayPolygon = overlayPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const liveLabel = sourceMode === 'mp4' ? 'MP4 upload' : 'RTSP source';
  const frameSource = pipelineStatus === 'running'
    ? `${buildApiPathWithSession('/api/stream')}${buildApiPathWithSession('/api/stream').includes('?') ? '&' : '?'}ts=${streamToken}`
    : '';

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden border border-slate-700 bg-[linear-gradient(160deg,rgba(13,18,27,0.98),rgba(22,30,42,0.98))] p-5"
      >
        <div className="absolute inset-0 opacity-40 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[28px_28px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-slate-300/80">
              <Waves className="h-3.5 w-3.5" />
              Live monitoring control room
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Choose RTSP or upload video and start monitoring.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Frontend only sends source commands. The backend opens uploaded MP4 or RTSP feed server-side and returns processed frames with live metrics.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-88">
            <div className="border border-white/15 bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Connection</p>
              <p className="mt-1 text-sm font-medium text-white">{connectionState}</p>
            </div>
            <div className="border border-white/15 bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Source</p>
              <p className="mt-1 text-sm font-medium text-white">{liveLabel}</p>
            </div>
            <div className="border border-white/15 bg-white/5 px-4 py-3 text-center">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Pipeline</p>
              <p className="mt-1 text-sm font-medium text-white">{pipelineStatus}</p>
            </div>
          </div>
        </div>
      </motion.section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="overflow-hidden border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-[#141b25]"
          >
            <div className="flex flex-col gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Primary feed</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Processed live stream</h3>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  ['Status', pipelineStatus],
                  ['Source', liveLabel],
                  ['Connection', connectionState],
                  ['Session', currentSessionId ?? 'none'],
                ].map(([label, value]) => (
                  <div key={label} className="border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-[#101721]">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
                    <p className="mt-1 max-w-32 truncate text-xs font-medium text-slate-900 dark:text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>

            <div
              ref={imageWrapRef}
              className="relative aspect-video overflow-hidden bg-black"
              onClick={handleZoneClick}
            >
              {pipelineStatus === 'running' ? (
                <>
                  <img
                    ref={imageRef}
                    src={frameSource || ''}
                    alt="Live AI feed"
                    className="h-full w-full object-contain"
                    onLoad={() => {
                      setStreamReady(true);
                      refreshOverlayGeometry();
                    }}
                    onError={() => setStreamError('Unable to load live stream')}
                  />
                  {overlayGeometry && overlayPoints.length > 0 && (
                    <svg
                      className="pointer-events-none absolute inset-0 h-full w-full"
                      viewBox={`0 0 ${overlayGeometry.width} ${overlayGeometry.height}`}
                      preserveAspectRatio="none"
                    >
                      {overlayPoints.length >= 2 && (
                        <polyline
                          points={overlayPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                        />
                      )}
                      {overlayPoints.length >= 3 && (
                        <polygon
                          points={overlayPolygon}
                          fill="rgba(245, 158, 11, 0.15)"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      )}
                      {overlayPoints.map((p, idx) => (
                        <g key={`${p.x}-${p.y}-${idx}`}>
                          <circle cx={p.x} cy={p.y} r={5} fill="#f59e0b" />
                          <text x={p.x + 8} y={p.y - 8} fill="#fef3c7" fontSize="12">
                            {idx + 1}
                          </text>
                        </g>
                      ))}
                    </svg>
                  )}
                  {(!streamReady || streamError) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/70 p-6 text-center text-white">
                      <div>
                        <p className="font-semibold">Waiting for processed frames...</p>
                        <p className="mt-2 text-sm text-white/75">{streamError ?? 'The backend is starting the selected source.'}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center bg-[linear-gradient(180deg,rgba(8,12,18,0.95),rgba(16,24,34,0.98))] text-white">
                  <MonitorPlay className="mb-4 h-16 w-16 opacity-30" />
                  <p className="text-lg font-medium tracking-wide">Stream offline</p>
                  <p className="mt-2 max-w-md px-6 text-center text-sm text-slate-400">Pick a source, start the session, and the backend will return live processed frames here.</p>
                </div>
              )}

              <div className="absolute left-4 top-4 flex items-center gap-2 border border-white/20 bg-black/55 px-3 py-1.5 text-xs text-white">
                <Activity className="h-3.5 w-3.5 text-slate-200" />
                {pipelineStatus.toUpperCase()}
              </div>
              <div className="absolute right-4 top-4 flex items-center gap-2 border border-white/20 bg-black/55 px-3 py-1.5 text-xs text-white">
                <Waves className="h-3.5 w-3.5 text-slate-200" />
                {streamReady ? 'stream live' : 'buffering'}
              </div>
            </div>
            {(streamError || pipelineError || drawingZone) && (
              <div className="border-t border-slate-200 bg-white px-5 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-[#101721] dark:text-slate-300">
                {drawingZone && !streamError && !pipelineError && 'Drawing enabled. Click the video to place restricted-zone points.'}
                {(streamError || pipelineError) && (
                  <span className="text-rose-600 dark:text-rose-300">{streamError ?? pipelineError}</span>
                )}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="overflow-hidden border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-[#141b25]"
          >
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Multi-camera view</p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Input
                  value={multiRtspUrl}
                  onChange={(event) => setMultiRtspUrl(event.target.value)}
                  placeholder="rtsp://user:password@host:554/stream"
                  className="h-10 border-slate-300 bg-white font-mono text-xs dark:border-slate-700 dark:bg-[#101721]"
                />
                <Button
                  type="button"
                  onClick={handleStartAdditionalRtsp}
                  disabled={multiStarting}
                  className="h-10 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  {multiStarting ? 'Starting...' : 'Add RTSP camera'}
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant={multiViewMode === 'grid' ? 'default' : 'outline'}
                  className="h-8 px-3 text-[11px]"
                  onClick={() => setMultiViewMode('grid')}
                >
                  Grid
                </Button>
                <Button
                  type="button"
                  variant={multiViewMode === 'list' ? 'default' : 'outline'}
                  className="h-8 px-3 text-[11px]"
                  onClick={() => setMultiViewMode('list')}
                >
                  List
                </Button>
                <div className="ml-2 flex items-center gap-2">
                  <Button
                    type="button"
                    variant={multiGridPreset === '2x2' ? 'default' : 'outline'}
                    className="h-8 px-3 text-[11px]"
                    onClick={() => setMultiGridPreset('2x2')}
                    disabled={multiViewMode === 'list'}
                  >
                    2x2
                  </Button>
                  <Button
                    type="button"
                    variant={multiGridPreset === '3x3' ? 'default' : 'outline'}
                    className="h-8 px-3 text-[11px]"
                    onClick={() => setMultiGridPreset('3x3')}
                    disabled={multiViewMode === 'list'}
                  >
                    3x3
                  </Button>
                </div>
              </div>
            </div>

            <div
              className={clsx(
                'gap-4 p-4',
                multiViewMode === 'list'
                  ? 'grid grid-cols-1'
                  : multiGridPreset === '3x3'
                    ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3'
                    : 'grid grid-cols-1 md:grid-cols-2'
              )}
            >
              {allSessions.length === 0 ? (
                <div className="col-span-full border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-[#101721] dark:text-slate-400">
                  No active sessions yet. Start a session to see multi-camera cards.
                </div>
              ) : (
                allSessions.map((session) => {
                  const sessionId = session.session_id ?? '';
                  const isFocused = Boolean(currentSessionId && sessionId && currentSessionId === sessionId);
                  const streamUrl = session.status === 'running'
                    ? `${apiUrl}/api/stream?session_id=${encodeURIComponent(sessionId)}&ts=${streamToken}`
                    : '';
                  const displayLabel = sessionLabels[sessionId] || 'Camera';
                  return (
                    <article key={sessionId} className={clsx('overflow-hidden border bg-black', isFocused ? 'border-emerald-500' : 'border-slate-700', multiViewMode === 'list' ? 'grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr]' : '')}>
                      <div className={clsx('relative bg-black', multiViewMode === 'list' ? 'aspect-video lg:aspect-auto lg:min-h-48' : 'aspect-video')}>
                        {streamUrl ? (
                          <img src={streamUrl} alt={`Session ${sessionId}`} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-slate-300">
                            {session.status === 'error' ? 'Session error' : 'Session idle'}
                          </div>
                        )}
                        <div className="absolute left-2 top-2 border border-white/20 bg-black/60 px-2 py-1 text-[10px] text-white">
                          {session.status ?? 'idle'}
                        </div>
                      </div>
                      <div className={clsx('flex flex-wrap items-center gap-2 bg-[#0f141c] px-3 py-2 text-[11px] text-slate-300', multiViewMode === 'list' ? 'border-l border-slate-700' : 'border-t border-slate-700')}>
                        <Input
                          value={displayLabel}
                          onChange={(event) => upsertSessionLabel(sessionId, event.target.value)}
                          className="h-8 w-40 border-slate-700 bg-[#121923] text-xs text-slate-100"
                          placeholder="Camera label"
                        />
                        <span className="font-mono text-[10px] text-slate-400">{sessionId}</span>
                        <span className="ml-auto">People: {session.human_count ?? 0}</span>
                        <span>Alerts: {session.alerts ?? 0}</span>
                        <Button type="button" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => setCurrentSessionId(sessionId)}>
                          Focus
                        </Button>
                        <Button type="button" variant="outline" className="h-7 px-2 text-[10px]" onClick={() => handleStopSessionById(sessionId)}>
                          Stop
                        </Button>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </motion.section>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 xl:sticky xl:top-4 xl:self-start"
        >
          <div className="border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-[#141b25]">
            <div className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Stream source</p>
              <h3 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">Select input source</h3>
              <p className="mt-2 flex items-start gap-2 text-xs leading-5 text-slate-500 dark:text-slate-400">
                <MonitorPlay className="mt-0.5 h-4 w-4 shrink-0" />
                Frontend controls source selection; backend handles video processing.
              </p>
            </div>

            <div className="p-5">
              <Tabs value={sourceMode} onValueChange={setSourceMode} className="w-full">
                <TabsList variant="line" className="mb-4 grid w-full grid-cols-2 border-b border-slate-200 pb-0 dark:border-slate-800">
                  <TabsTrigger value="rtsp" className="flex gap-2 text-xs"><Link2 className="h-4 w-4"/> RTSP Stream</TabsTrigger>
                  <TabsTrigger value="mp4" className="flex gap-2 text-xs"><Upload className="h-4 w-4"/> Upload</TabsTrigger>
                </TabsList>

                <TabsContent value="rtsp" className="mt-0 outline-none">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2.5 dark:bg-slate-800"><Link2 className="h-4 w-4 text-slate-600 dark:text-slate-300" /></div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">RTSP URL Stream</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Processed server-side.</p>
                      </div>
                    </div>
                    <Input
                      value={rtspUrl}
                      onChange={(event) => setRtspUrl(event.target.value)}
                      placeholder="rtsp://user:password@host:554/stream"
                      className="h-11 border-slate-300 bg-white font-mono text-xs dark:border-slate-700 dark:bg-[#0f141c]"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="mp4" className="mt-0 outline-none">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-slate-100 p-2.5 dark:bg-slate-800"><Upload className="h-4 w-4 text-slate-600 dark:text-slate-300" /></div>
                      <div>
                        <h4 className="text-sm font-medium text-slate-900 dark:text-white">Upload Pre-recorded Video</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Select MP4 file to run through pipeline.</p>
                      </div>
                    </div>
                    <Input ref={fileInputRef} type="file" accept="video/mp4" className="h-11 border-slate-300 bg-white text-xs dark:border-slate-700 dark:bg-[#0f141c]" />
                    {selectedFileName && (
                      <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                        Selected: {selectedFileName}
                      </p>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 p-5 dark:border-slate-800">
              <Button
                onClick={handleStart}
                disabled={starting || connectionState === 'connecting'}
                className="h-11 bg-emerald-600 font-semibold text-white hover:bg-emerald-700"
              >
                <Play className="mr-2 h-4 w-4" />
                {starting ? 'Starting...' : 'Start'}
              </Button>
              <Button
                variant="outline"
                onClick={handleStop}
                className="h-11 border-slate-300 bg-white text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101721] dark:text-white dark:hover:bg-[#182231]"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop
              </Button>
              <div className="col-span-2 border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 dark:border-slate-800 dark:bg-[#101721] dark:text-slate-400">
                Backend: <span className="font-medium text-slate-900 dark:text-white">{apiUrl}</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Zone Tools</p>
              <span className="border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-[#101721] dark:text-slate-300">
                Points: <strong>{zonePoints.length}</strong>
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={drawingZone ? 'default' : 'outline'}
                onClick={() => setDrawingZone((v) => !v)}
                className="col-span-2 h-10 text-xs"
              >
                {drawingZone ? 'Drawing enabled' : 'Draw restricted zone'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setZonePoints((pts) => pts.slice(0, -1))}
                disabled={zonePoints.length === 0 || zoneSaving}
                className="h-9 text-xs"
              >
                Undo point
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleZoneClear}
                disabled={zoneSaving}
                className="h-9 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30 dark:hover:text-rose-300"
              >
                Clear
              </Button>
              <Button
                type="button"
                onClick={handleZoneSave}
                disabled={zoneSaving || zonePoints.length < 3}
                className="col-span-2 h-10 bg-slate-800 text-xs font-semibold text-white hover:bg-slate-700 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
              >
                {zoneSaving ? 'Saving...' : 'Save zone'}
              </Button>
            </div>
            {drawingZone && (
              <p className="mt-3 text-xs leading-5 text-amber-600 dark:text-amber-400">Click the primary video to place points.</p>
            )}
          </div>

          <div className="border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Live metrics</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#101721]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Crowd size</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{humanCount}</p>
              </div>
              <div className="border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#101721]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Alerts</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{alertCount}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className={clsx('flex items-center gap-2 px-3 py-2 border', riskBg, riskBorder)}>
                <RiskIcon className={clsx('w-4 h-4', riskColor)} />
                <span className={clsx('text-xs font-medium', riskColor)}>RISK: {riskLevel}</span>
              </div>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
