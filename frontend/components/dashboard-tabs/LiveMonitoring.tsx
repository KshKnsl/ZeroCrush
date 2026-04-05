"use client";

import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Activity, AlertTriangle, Camera, Link2, MonitorPlay, Play, Square, Upload, Waves } from 'lucide-react';
import RiskMeter from '../RiskMeter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { backendUrl, websocketUrl } from '@/lib/api';

type SourceMode = 'webcam' | 'mp4' | 'rtsp';
type PipelineStatus = 'idle' | 'running' | 'error';

type WsStatusPayload = {
  type?: 'status' | 'error';
  status?: PipelineStatus;
  error?: string | null;
  stream_ready?: boolean;
  human_count?: number;
  violations?: number;
  restricted?: boolean;
  abnormal?: boolean;
  message?: string;
};

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

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const websocketRef = useRef<WebSocket | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const frameLoopRef = useRef<number | null>(null);
  const wsFrameRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleStatusMessage = (payload: WsStatusPayload) => {
    if (payload.type === 'error') {
      const message = payload.message || payload.error || 'WebSocket error occurred';
      setStreamError(message);
      setPipelineError(message);
      setPipelineStatus('error');
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
      setStreamError('WebSocket connection failed');
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
        reject(new Error('WebSocket connection failed'));
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

    try {
      resetSession();
      if (sourceMode === 'webcam') {
        await startBrowserStream();
      } else {
        await startRemoteSource();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start stream';
      setStreamError(message);
      setPipelineError(message);
      setPipelineStatus('error');
      resetSession();
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
  };

  useEffect(() => {
    return () => {
      resetSession();
    };
  }, []);

  const liveLabel = sourceMode === 'webcam' ? 'Laptop webcam' : sourceMode === 'mp4' ? 'MP4 upload' : 'RTSP source';
  const frameSource = sourceMode === 'webcam' ? wsFrame : wsFrame;

  return (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[radial-gradient(circle_at_top_left,_rgba(132,204,22,0.16),_transparent_36%),linear-gradient(160deg,rgba(8,9,11,0.96),rgba(16,17,21,0.98))] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]"
      >
        <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:28px_28px]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-lime-300/70">
              <Waves className="h-3.5 w-3.5" />
              Live monitoring control room
            </p>
            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Choose a source and stream it to the backend over websocket.</h2>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">
              Use the laptop webcam for browser capture, upload an MP4 for batch processing, or provide an RTSP URL for a remote camera feed. The backend returns processed frames and live stats in the same websocket session.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[22rem]">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Connection</p>
              <p className="mt-1 text-sm font-medium text-white">{connectionState}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Source</p>
              <p className="mt-1 text-sm font-medium text-white">{liveLabel}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-center backdrop-blur">
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
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#0f1115]"
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
                  <SelectTrigger className="h-12 w-full rounded-2xl border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-800 dark:bg-[#151821] dark:text-white">
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
                  <div className="rounded-3xl border border-dashed border-lime-500/30 bg-lime-500/5 p-4 text-sm text-slate-600 dark:text-slate-300">
                    <p className="font-medium text-slate-900 dark:text-white">Browser webcam capture</p>
                    <p className="mt-1 leading-6">Your laptop camera is captured in the browser, encoded as JPEG frames, and pushed to the backend through the websocket session.</p>
                  </div>
                )}

                {sourceMode === 'mp4' && (
                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#151821]">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      <Upload className="h-4 w-4 text-lime-500" />
                      Upload a video file
                    </div>
                    <Input ref={fileInputRef} type="file" accept="video/mp4" className="h-12 rounded-2xl border-slate-200 bg-white dark:border-slate-700 dark:bg-[#101319]" />
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Selected file: {selectedFileName || 'No MP4 selected yet'}
                    </p>
                  </div>
                )}

                {sourceMode === 'rtsp' && (
                  <div className="space-y-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#151821]">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-900 dark:text-white">
                      <Link2 className="h-4 w-4 text-cyan-500" />
                      RTSP camera URL
                    </div>
                    <Input
                      value={rtspUrl}
                      onChange={(event) => setRtspUrl(event.target.value)}
                      placeholder="rtsp://user:password@camera-ip:554/stream"
                      className="h-12 rounded-2xl border-slate-200 bg-white font-mono text-sm dark:border-slate-700 dark:bg-[#101319]"
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
                className="h-12 rounded-2xl bg-lime-500 px-5 font-semibold text-lime-950 hover:bg-lime-400"
              >
                <Play className="mr-2 h-4 w-4" />
                {starting ? 'Starting...' : 'Start session'}
              </Button>
              <Button
                variant="outline"
                onClick={handleStop}
                className="h-12 rounded-2xl border-slate-200 bg-white px-5 text-slate-900 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#151821] dark:text-white dark:hover:bg-[#1a1f29]"
              >
                <Square className="mr-2 h-4 w-4" />
                Stop session
              </Button>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <MonitorPlay className="h-4 w-4 text-lime-500" />
                Backend: {backendUrl()}
              </div>
            </div>

            {(pipelineError || streamError) && (
              <div className="border-t border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
                  <div>
                    <p className="font-medium">Session error</p>
                    <p className="mt-1 leading-6">{streamError || pipelineError}</p>
                  </div>
                </div>
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.08 }}
            className="overflow-hidden rounded-[28px] border border-slate-200 bg-black shadow-[0_20px_50px_rgba(15,23,42,0.12)] dark:border-slate-800"
          >
            <div className="relative aspect-video overflow-hidden bg-black">
              <video ref={videoRef} playsInline muted autoPlay className="hidden" />
              <canvas ref={canvasRef} className="hidden" />

              {pipelineStatus === 'running' ? (
                <>
                  <img
                    src={frameSource || ''}
                    alt="Live AI feed"
                    className="h-full w-full object-contain"
                    onLoad={() => setStreamReady(true)}
                    onError={() => setStreamError('Unable to load live stream')}
                  />
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
                <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(132,204,22,0.12),_transparent_40%),linear-gradient(180deg,rgba(3,7,18,0.95),rgba(15,23,42,0.98))] text-white">
                  <MonitorPlay className="mb-4 h-16 w-16 opacity-30" />
                  <p className="text-lg font-medium tracking-wide">Stream offline</p>
                  <p className="mt-2 max-w-md px-6 text-center text-sm text-slate-400">Pick a source, start the session, and the backend will return live processed frames here.</p>
                </div>
              )}

              <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur">
                <Activity className="h-3.5 w-3.5 text-lime-400" />
                {pipelineStatus.toUpperCase()}
              </div>
              <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-xs text-white backdrop-blur">
                <Waves className="h-3.5 w-3.5 text-cyan-300" />
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
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#0f1115]">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-400">Live metrics</p>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#151821]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Crowd size</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{humanCount}</p>
              </div>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-[#151821]">
                <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">Incidents</p>
                <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">{incidentCount}</p>
              </div>
            </div>
            <div className="mt-5">
              <RiskMeter level={riskLevel} />
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#0f1115]">
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
