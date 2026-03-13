"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { QrCode, CheckCircle, XCircle, ArrowRight, Camera, Keyboard, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
interface VerifySuccess {
  success: true;
  message: string;
  user: { id: number; name: string | null; email: string };
  event: { id: number; type: string; description: string | null; plate: string | null; verifiedAt: string };
}
interface VerifyError {
  error: string;
  verifiedAt?: string;
}
type VerifyResult = VerifySuccess | VerifyError;

interface CheckInEntry {
  name: string;
  email: string;
  gate: number;
  time: string;
  eventType: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", { hour12: false });
}

// QR codes from email are encoded as:  EMAIL|CODE
// e.g.  john@example.com|A3F9K2
function parseQRData(raw: string): { email: string; code: string } | null {
  const parts = raw.trim().split("|");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { email: parts[0].trim(), code: parts[1].trim().toUpperCase() };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function GateEntry() {
  const [scanStatus, setScanStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [manualEmail, setManualEmail] = useState("");
  const [manualCode, setManualCode]   = useState("");
  const [manualStatus, setManualStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [activeGate, setActiveGate]   = useState(1);
  const [resultData, setResultData]   = useState<VerifyResult | null>(null);
  const [manualResult, setManualResult] = useState<VerifyResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<CheckInEntry[]>([]);

  // QR scanner via device camera
  const videoRef   = useRef<HTMLVideoElement>(null);
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const streamRef  = useRef<MediaStream | null>(null);
  const scanningRef = useRef(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError]   = useState<string | null>(null);

  const gates = [1, 2, 3, 4];

  // ── Verify API call ──────────────────────────────────────────────────────────
  const verify = useCallback(async (
    email: string,
    code: string,
    mode: "scan" | "manual"
  ) => {
    if (mode === "scan") { setScanStatus("loading"); setResultData(null); }
    else                 { setManualStatus("loading"); setManualResult(null); }

    try {
      const res  = await fetch("/api/events/verify", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, code }),
      });
      const data: VerifyResult = await res.json();

      if (mode === "scan") {
        setResultData(data);
        setScanStatus(res.ok ? "success" : "error");
      } else {
        setManualResult(data);
        setManualStatus(res.ok ? "success" : "error");
      }

      // Append to recent list on success
      if (res.ok && "user" in data) {
        setRecentCheckIns((prev) => [
          {
            name:      data.user.name || data.user.email,
            email:     data.user.email,
            gate:      activeGate,
            time:      data.event.verifiedAt,
            eventType: data.event.type,
          },
          ...prev.slice(0, 19),
        ]);
      }
    } catch {
      if (mode === "scan") { setResultData({ error: "Network error." }); setScanStatus("error"); }
      else                 { setManualResult({ error: "Network error." }); setManualStatus("error"); }
    }

    // Auto-reset scan overlay after 3 s
    if (mode === "scan") {
      setTimeout(() => { setScanStatus("idle"); setResultData(null); }, 3500);
    }
  }, [activeGate]);

  // ── Camera / QR scanning ─────────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera access denied. Use manual check-in instead.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    scanningRef.current = false;
  }, []);

  // Poll canvas frames and look for a QR code using the BarcodeDetector API
  useEffect(() => {
    if (!cameraActive) return;
    // BarcodeDetector is available in Chrome/Edge/Android WebView
    const BarcodeDetector = (window as any).BarcodeDetector;
    if (!BarcodeDetector) return; // fallback: manual entry only

    const detector = new BarcodeDetector({ formats: ["qr_code"] });
    let rafId: number;

    const tick = async () => {
      if (!videoRef.current || !canvasRef.current || scanningRef.current) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const video  = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width  = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext("2d")?.drawImage(video, 0, 0);

      try {
        const codes = await detector.detect(canvas);
        if (codes.length > 0) {
          const raw    = codes[0].rawValue as string;
          const parsed = parseQRData(raw);
          if (parsed) {
            scanningRef.current = true; // debounce — stop scanning until reset
            await verify(parsed.email, parsed.code, "scan");
            setTimeout(() => { scanningRef.current = false; }, 4000);
          }
        }
      } catch { /* ignore decode errors */ }

      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [cameraActive, verify]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  // ── Manual submit ────────────────────────────────────────────────────────────
  const handleManualSubmit = () => {
    const email = manualEmail.trim().toLowerCase();
    const code  = manualCode.trim().toUpperCase();
    if (!email || !code) return;
    verify(email, code, "manual");
  };

  const resetManual = () => {
    setManualEmail(""); setManualCode("");
    setManualStatus("idle"); setManualResult(null);
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-white font-bold text-xl">Gate Entry</h2>
          <p className="text-slate-400 text-sm">Scan QR codes or manually check-in attendees</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs uppercase">Active Gate:</span>
          <div className="flex gap-1">
            {gates.map((gate) => (
              <button
                key={gate}
                onClick={() => setActiveGate(gate)}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                  activeGate === gate
                    ? "bg-emerald-500/20 border border-emerald-500 text-emerald-400"
                    : "bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600"
                }`}
              >
                G{gate}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        {/* ── QR Scanner ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold">QR Scanner</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">CAM-0{activeGate}</span>
          </div>

          <div className="p-6">
            <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
              {/* Camera feed */}
              <video
                ref={videoRef}
                className={`absolute inset-0 w-full h-full object-cover ${cameraActive ? "block" : "hidden"}`}
                muted playsInline
              />
              <canvas ref={canvasRef} className="hidden" />

              {/* Idle placeholder */}
              {!cameraActive && (
                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                  <QrCode className="w-24 h-24 text-slate-700" />
                </div>
              )}

              {/* Scanner corners + sweep */}
              {cameraActive && scanStatus !== "loading" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-48 h-48 relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500 rounded-br-lg" />
                    <motion.div
                      animate={{ y: [-80, 80, -80] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="absolute left-2 right-2 h-0.5 bg-emerald-500/60 shadow-lg shadow-emerald-500"
                    />
                  </div>
                </div>
              )}

              {/* Loading spinner */}
              {scanStatus === "loading" && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <Loader2 className="w-10 h-10 text-emerald-400 animate-spin" />
                </div>
              )}

              {/* Result overlay */}
              <AnimatePresence>
                {(scanStatus === "success" || scanStatus === "error") && resultData && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 flex flex-col items-center justify-center px-4 ${
                      scanStatus === "success" ? "bg-emerald-500/25" : "bg-rose-500/25"
                    }`}
                  >
                    {scanStatus === "success" && "user" in resultData ? (
                      <>
                        <CheckCircle className="w-14 h-14 text-emerald-400 mb-2" />
                        <p className="text-emerald-300 text-xl font-bold">ACCESS GRANTED</p>
                        <p className="text-emerald-200 text-sm mt-1 font-medium">
                          {resultData.user.name || resultData.user.email}
                        </p>
                        <p className="text-emerald-400/70 text-xs mt-0.5">{resultData.event.type}</p>
                        <div className="mt-3 flex items-center gap-2 text-emerald-300 text-sm">
                          <ArrowRight className="w-4 h-4" />
                          <span className="font-mono">GATE {activeGate}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-14 h-14 text-rose-400 mb-2" />
                        <p className="text-rose-300 text-xl font-bold">DENIED</p>
                        <p className="text-rose-400/80 text-xs mt-2 text-center">
                          {"error" in resultData ? resultData.error : ""}
                        </p>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Camera error */}
              {cameraError && !cameraActive && (
                <div className="absolute inset-0 flex items-center justify-center px-4">
                  <p className="text-rose-400 text-xs text-center">{cameraError}</p>
                </div>
              )}
            </div>

            <button
              onClick={cameraActive ? stopCamera : startCamera}
              className={`w-full py-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                cameraActive
                  ? "bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:bg-rose-500/30"
                  : "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
              }`}
            >
              <Camera className="w-4 h-4" />
              {cameraActive ? "Stop Camera" : "Start Camera"}
            </button>
          </div>
        </motion.div>

        {/* ── Manual Check-In ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-semibold">Manual Check-In</h3>
          </div>

          <div className="p-6 space-y-4">
            {/* Result banner */}
            <AnimatePresence>
              {manualResult && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`rounded-lg p-4 border ${
                    manualStatus === "success"
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-rose-500/10 border-rose-500/30"
                  }`}
                >
                  {manualStatus === "success" && "user" in manualResult ? (
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-emerald-300 font-semibold text-sm">{manualResult.message}</p>
                        <p className="text-emerald-400/70 text-xs mt-0.5">{manualResult.event.type}</p>
                        <p className="text-slate-500 text-xs">{manualResult.user.email}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3">
                      <XCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                      <p className="text-rose-300 text-sm">
                        {"error" in manualResult ? manualResult.error : "Verification failed."}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider">Email Address</label>
              <input
                type="email"
                value={manualEmail}
                onChange={(e) => setManualEmail(e.target.value)}
                placeholder="attendee@example.com"
                className="w-full mt-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-blue-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider">Entry Code</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === "Enter" && handleManualSubmit()}
                placeholder="A3F9K2"
                maxLength={6}
                className="w-full mt-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono tracking-widest focus:border-blue-500 focus:outline-none placeholder:text-slate-600"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleManualSubmit}
                disabled={!manualEmail || !manualCode || manualStatus === "loading"}
                className="flex-1 py-3 bg-blue-500/20 border border-blue-500/30 rounded-lg text-blue-300 text-sm font-medium hover:bg-blue-500/30 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {manualStatus === "loading"
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Checking...</>
                  : <><QrCode className="w-4 h-4" /> Verify Code</>
                }
              </button>
              {manualResult && (
                <button
                  onClick={resetManual}
                  className="px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 text-sm hover:border-slate-500 transition-all"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* ── Recent Check-ins ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Recent Check-ins</h3>
          <span className="text-slate-500 text-xs font-mono">{recentCheckIns.length} this session</span>
        </div>

        {recentCheckIns.length === 0 ? (
          <div className="p-8 text-center text-slate-600 text-sm">
            No check-ins yet. Verified attendees will appear here.
          </div>
        ) : (
          <div className="divide-y divide-slate-800 max-h-72 overflow-y-auto">
            <AnimatePresence initial={false}>
              {recentCheckIns.map((entry, i) => (
                <motion.div
                  key={`${entry.email}-${entry.time}`}
                  initial={{ opacity: 0, y: -12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i === 0 ? 0 : 0 }}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                      <CheckCircle className="w-4 h-4 text-emerald-400" />
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{entry.name}</p>
                      <p className="text-slate-500 text-xs">{entry.email} · {entry.eventType}</p>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-slate-400 text-xs font-mono">{formatTime(entry.time)}</p>
                    <p className="text-slate-600 text-xs">GATE-{entry.gate}</p>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </motion.div>
    </div>
  );
}