"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Activity, Camera, Link2, MonitorPlay, Play, ShieldAlert, ShieldCheck, ShieldX, Square, Upload, Waves } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { backendUrl, getConfig, websocketUrl } from '@/lib/api';
import { toast } from 'sonner';

type SourceMode = 'webcam' | 'mp4' | 'rtsp';
type PipelineStatus = 'idle' | 'running' | 'error';

type WsStatusPayload = {
  type?: 'status' | 'error' | 'zone_updated';
  status?: PipelineStatus;
  error?: string | null;
  stream_ready?: boolean;
  human_count?: number;
  violations?: number;
  restricted?: boolean;
  abnormal?: boolean;
  message?: string;
  restricted_zone?: number[][];
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

const initialRisk = 'LOW' as const;

export default function LiveMonitoring() {
  const [sourceMode, setSourceMode] = useState<SourceMode>('webcam');
  const [pipelineStatus, setPipelineStatus] = useState<PipelineStatus>('idle');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [streamReady, setStreamReady] = useState(false);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [humanCount, setHumanCount] = useState(0);
  const [incidentCount, setIncidentCount] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MED' | 'HIGH'>(initialRisk);
  const [rtspUrl, setRtspUrl] = useState('');
  const [selectedFileName, setSelectedFileName] = useState('');
  const [connectionState, setConnectionState] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [wsFrame, setWsFrame] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [drawingZone, setDrawingZone] = useState(false);
  const [zonePoints, setZonePoints] = useState<Point[]>([]);
  const [zoneSaving, setZoneSaving] = useState(false);
  const [overlayGeometry, setOverlayGeometry] = useState<OverlayGeometry | null>(null);
  const { color: riskColor, bg: riskBg, border: riskBorder, Icon: RiskIcon } = riskConfig[riskLevel];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const imageWrapRef = useRef<HTMLDivElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const wsFrameRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lastErrorToastRef = useRef('');

  const notifyError = (message: string) => {
    if (lastErrorToastRef.current === message) {
      return;
    }
    lastErrorToastRef.current = message;
    toast.error(message);
  };

  const clearFrame = () => {
    if (wsFrameRef.current) {
      URL.revokeObjectURL(wsFrameRef.current);
      wsFrameRef.current = null;
    }
    setWsFrame(null);
  };

  const stopCamera = () => {
    if (frameLoopRef.current !== null) {
      window.cancelAnimationFrame(frameLoopRef.current);
      frameLoopRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const closeSocket = () => {
    if (websocketRef.current) {
      websocketRef.current.close();
      websocketRef.current = null;
    }
    setConnectionState('disconnected');
  };

  const resetSession = () => {
    stopCamera();
    closeSocket();
    clearFrame();
    setStreamReady(false);
  };

  const deriveRisk = (count: number, violations: number, restricted: boolean, abnormal: boolean) => {
    const activeIncidents = Number(Boolean(restricted)) + Number(Boolean(abnormal)) + Number(violations > 0);
    setIncidentCount(activeIncidents);

    if (activeIncidents > 1 || count > 60) {
      setRiskLevel('HIGH');
    } else if (activeIncidents === 1 || count > 25) {
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

  const handleStatusMessage = (payload: WsStatusPayload) => {
    if (payload.type === 'zone_updated' && Array.isArray(payload.restricted_zone)) {
      const points = payload.restricted_zone
        .filter((pt) => Array.isArray(pt) && pt.length === 2)
        .map((pt) => ({ x: Number(pt[0]) || 0, y: Number(pt[1]) || 0 }));
      setZonePoints(points);
      return;
    }

    if (payload.type === 'error') {
      const message = payload.message || payload.error || 'WebSocket error occurred';
      setStreamError(message);
      setPipelineError(message);
      setPipelineStatus('error');
      notifyError(message);
      return;
    }

    if (payload.status) {
      setPipelineStatus(payload.status);
    }

    if (typeof payload.error === 'string') {
      setPipelineError(payload.error);
      if (payload.error) {
        setStreamError(payload.error);
      }
    }

    if (typeof payload.stream_ready === 'boolean') {
      setStreamReady(payload.stream_ready);
    }

    if (typeof payload.human_count === 'number') {
      setHumanCount(payload.human_count);
      deriveRisk(payload.human_count, payload.violations ?? 0, Boolean(payload.restricted), Boolean(payload.abnormal));
    }
  };

  const sendZoneMessage = async (payload: Record<string, unknown>) => {
    const socket = websocketRef.current ?? attachWebSocket();
    await waitForSocketOpen(socket);
    socket.send(JSON.stringify(payload));
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
      await sendZoneMessage({
        type: 'set_restricted_zone',
        points: zonePoints.map((p) => [p.x, p.y]),
      });
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
      await sendZoneMessage({ type: 'clear_restricted_zone' });
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

  const handleZoneClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!drawingZone) return;
    const next = mapClientToFramePoint(event.clientX, event.clientY);
    if (!next) return;
    setZonePoints((current) => [...current, next]);
  };

  const attachWebSocket = () => {
    const socket = new WebSocket(websocketUrl('/api/ws/stream'));
    websocketRef.current = socket;
    setConnectionState('connecting');

    socket.onopen = () => {
      setConnectionState('connected');
    };

    socket.onmessage = async (event) => {
      if (typeof event.data === 'string') {
        try {
          handleStatusMessage(JSON.parse(event.data) as WsStatusPayload);
        } catch {
          // Ignore malformed control messages.
        }
        return;
      }

      if (event.data instanceof Blob && event.data.size > 0) {
        const nextUrl = URL.createObjectURL(event.data);
        setWsFrame((current) => {
          if (current) {
            URL.revokeObjectURL(current);
          }
          wsFrameRef.current = nextUrl;
          return nextUrl;
        });
        setStreamReady(true);
      }
    };

    socket.onerror = () => {
      setConnectionState('disconnected');
      const message = `WebSocket connection failed (${websocketUrl('/api/ws/stream')})`;
      setStreamError(message);
      notifyError(message);
    };

    socket.onclose = () => {
      setConnectionState('disconnected');
    };

    return socket;
  };

  const waitForSocketOpen = (socket: WebSocket) => {
    if (socket.readyState === WebSocket.OPEN) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        socket.removeEventListener('open', onOpen);
        socket.removeEventListener('error', onError);
      };

      const onOpen = () => {
        cleanup();
        resolve();
      };

      const onError = () => {
        cleanup();
        reject(new Error(`WebSocket connection failed (${websocketUrl('/api/ws/stream')})`));
      };

      socket.addEventListener('open', onOpen);
      socket.addEventListener('error', onError);
    });
  };

  const startBrowserStream = async () => {
    const socket = websocketRef.current ?? attachWebSocket();
    await waitForSocketOpen(socket);

    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    mediaStreamRef.current = stream;

    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
    }

    const sendFrame = () => {
      const activeSocket = websocketRef.current;
      if (!activeSocket || activeSocket.readyState !== WebSocket.OPEN) {
        return;
      }

      if (videoRef.current && canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
          const width = videoRef.current.videoWidth || 1280;
          const height = videoRef.current.videoHeight || 720;
          canvasRef.current.width = width;
          canvasRef.current.height = height;
          context.drawImage(videoRef.current, 0, 0, width, height);
          canvasRef.current.toBlob((blob) => {
            if (blob && activeSocket.readyState === WebSocket.OPEN) {
              activeSocket.send(blob);
            }
          }, 'image/jpeg', 0.72);
        }
      }

      frameLoopRef.current = window.requestAnimationFrame(sendFrame);
    };

    socket.send(JSON.stringify({ type: 'start', source: 'browser' }));
    frameLoopRef.current = window.requestAnimationFrame(sendFrame);
  };

  const startRemoteSource = async () => {
    const socket = websocketRef.current ?? attachWebSocket();
    await waitForSocketOpen(socket);

    if (sourceMode === 'mp4') {
      const file = fileInputRef.current?.files?.[0];
      if (!file) {
        throw new Error('Choose an MP4 file first');
      }

      const formData = new FormData();
      formData.append('file', file);

      const uploadResponse = await fetch(`${backendUrl()}/api/upload`, {
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
      socket.send(JSON.stringify({ type: 'start', source: 'file', path: uploadData.file_path }));
      return;
    }

    if (!rtspUrl.trim()) {
      throw new Error('Enter an RTSP URL first');
    }

    socket.send(JSON.stringify({ type: 'start', source: 'rtsp', url: rtspUrl.trim() }));
  };

  const handleStart = async () => {
    setStarting(true);
    setStreamError(null);
    setPipelineError(null);
    setPipelineStatus('idle');
    setStreamReady(false);
    deriveRisk(0, 0, false, false);
    const toastId = toast.loading('Starting monitoring session...');

    try {
      resetSession();
      if (sourceMode === 'webcam') {
        await startBrowserStream();
      } else {
        await startRemoteSource();
      }
      toast.success('Monitoring session started.', { id: toastId });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start stream';
      setStreamError(message);
      setPipelineError(message);
      setPipelineStatus('error');
      resetSession();
      toast.error(message, { id: toastId });
    } finally {
      setStarting(false);
    }
  };

  const handleStop = () => {
    const socket = websocketRef.current;
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type: 'stop' }));
    }
    resetSession();
    setPipelineStatus('idle');
    setPipelineError(null);
    setStreamError(null);
    toast.success('Monitoring session stopped.');
  };

  useEffect(() => {
    return () => {
      resetSession();
    };
  }, []);

  useEffect(() => {
    const onResize = () => refreshOverlayGeometry();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadZoneFromConfig = async () => {
      try {
        const cfg = await getConfig();
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
  }, []);

  const overlayPoints = zonePoints
    .map((point) => framePointToOverlay(point))
    .filter((point): point is Point => point !== null);
  const overlayPolygon = overlayPoints.map((p) => `${p.x},${p.y}`).join(' ');

  const liveLabel = sourceMode === 'webcam' ? 'Laptop webcam' : sourceMode === 'mp4' ? 'MP4 upload' : 'RTSP source';
  const frameSource = wsFrame;

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
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Choose a source and stream it to the backend over websocket.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Use the laptop webcam for browser capture, upload an MP4 for batch processing, or provide an RTSP URL for a remote camera feed. The backend returns processed frames and live stats in the same websocket session.
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.7fr_1fr]">
        <div className="space-y-6">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="overflow-hidden border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-[#141b25]"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 px-5 py-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Stream source</p>
                <h3 className="mt-1 text-xl font-semibold text-slate-900 dark:text-white">Select input mode</h3>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <Camera className="h-4 w-4" />
                Frames are encoded in the browser and streamed directly to the backend.
              </div>
            </div>

            <div className="grid gap-5 px-5 py-5 md:grid-cols-[16rem_1fr]">
              <div className="space-y-2">
                <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-400">Mode</label>
                <Select value={sourceMode} onValueChange={(value) => setSourceMode(value as SourceMode)}>
                  <SelectTrigger className="h-12 w-full border-slate-300 bg-white text-slate-900 dark:border-slate-700 dark:bg-[#101721] dark:text-white">
                    <SelectValue placeholder="Choose source" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="webcam">Laptop webcam</SelectItem>
                    <SelectItem value="mp4">Video MP4 upload</SelectItem>
                    <SelectItem value="rtsp">RTSP URL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                {sourceMode === 'webcam' && (
                  <div className="border border-dashed border-slate-400/70 bg-slate-100 p-4 text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-800/30 dark:text-slate-300">
                    <p className="font-medium text-slate-900 dark:text-white">Browser webcam capture</p>
                    <p className="mt-1 leading-6">Your laptop camera is captured in the browser, encoded as JPEG frames, and pushed to the backend through the websocket session.</p>
                  </div>
                )}

                {sourceMode === 'mp4' && (
                  <div className="space-y-3 border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#101721]">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      <Upload className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      Upload a video file
                    </div>
                    <Input ref={fileInputRef} type="file" accept="video/mp4" className="h-12 border-slate-300 bg-white dark:border-slate-700 dark:bg-[#0f141c]" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Selected file: {selectedFileName || 'No MP4 selected yet'}
                    </p>
                  </div>
                )}

                {sourceMode === 'rtsp' && (
                  <div className="space-y-3 border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#101721]">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      <Link2 className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                      RTSP camera URL
                    </div>
                    <Input
                      value={rtspUrl}
                      onChange={(event) => setRtspUrl(event.target.value)}
                      placeholder="rtsp://user:password@camera-ip:554/stream"
                      className="h-12 border-slate-300 bg-white font-mono text-sm dark:border-slate-700 dark:bg-[#0f141c]"
                    />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      The URL is sent to the backend, which opens and processes the stream server-side.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 px-5 py-5 dark:border-slate-800">
              <Button
                onClick={handleStart}
                disabled={starting || connectionState === 'connecting'}
                        className="h-12 bg-emerald-900 px-5 font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
              >
                <Play className="mr-2 h-4 w-4" />
                {starting ? 'Starting...' : 'Start session'}
              </Button>
              <Button
                variant="outline"
                onClick={handleStop}
                className="h-12 border-slate-300 bg-white px-5 text-slate-900 hover:bg-slate-100 dark:border-slate-700 dark:bg-[#101721] dark:text-white dark:hover:bg-[#182231]"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop session
              </Button>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MonitorPlay className="h-4 w-4 text-slate-600 dark:text-slate-300" />
                Backend: {backendUrl()}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-5 py-4 dark:border-slate-800">
              <Button
                type="button"
                variant={drawingZone ? 'default' : 'outline'}
                onClick={() => setDrawingZone((v) => !v)}
                className="h-10 px-4"
              >
                {drawingZone ? 'Drawing enabled' : 'Draw restricted zone'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setZonePoints((pts) => pts.slice(0, -1))}
                disabled={zonePoints.length === 0 || zoneSaving}
                className="h-10 px-4"
              >
                Undo point
              </Button>
              <Button
                type="button"
                onClick={handleZoneSave}
                disabled={zoneSaving || zonePoints.length < 3}
                className="h-10 bg-slate-700 px-4 font-semibold text-white hover:bg-slate-600 dark:bg-slate-200 dark:text-slate-900 dark:hover:bg-white"
              >
                {zoneSaving ? 'Saving...' : 'Save zone'}
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleZoneClear}
                disabled={zoneSaving}
                className="h-10 px-4"
              >
                Clear zone
              </Button>
              <p className="ml-auto text-xs text-slate-500 dark:text-slate-400">
                Points: {zonePoints.length} {drawingZone ? '• click on the video to place points' : ''}
              </p>
            </div>

          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="overflow-hidden border border-slate-300 bg-black dark:border-slate-700"
          >
            <div
              ref={imageWrapRef}
              className="relative aspect-video overflow-hidden bg-black"
              onClick={handleZoneClick}
            >
              <video ref={videoRef} playsInline muted autoPlay className="hidden" />
              <canvas ref={canvasRef} className="hidden" />

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
          </motion.section>
        </div>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4"
        >
          <div className="border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Live metrics</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#101721]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Crowd size</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{humanCount}</p>
              </div>
              <div className="border border-slate-300 bg-white p-4 dark:border-slate-700 dark:bg-[#101721]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Incidents</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{incidentCount}</p>
              </div>
            </div>
            <div className="mt-5">
              <div className={clsx('flex items-center gap-2 px-3 py-2 border', riskBg, riskBorder)}>
                <RiskIcon className={clsx('w-4 h-4', riskColor)} />
                <span className={clsx('text-xs font-medium', riskColor)}>RISK: {riskLevel}</span>
              </div>
            </div>
          </div>

          <div className="border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">How it works</p>
            <div className="mt-4 space-y-4 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <p>
                1. Select the source mode in the dropdown.
              </p>
              <p>
                2. Upload the MP4 or enter the RTSP URL, or allow webcam capture permissions in the browser.
              </p>
              <p>
                3. The backend streams processed frames and live detection status back through the websocket.
              </p>
            </div>
          </div>
        </motion.aside>
      </div>
    </div>
  );
}
