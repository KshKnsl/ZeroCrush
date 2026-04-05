"use client";

import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Play, Square, Activity, ShieldAlert, MonitorPlay } from 'lucide-react';
import RiskMeter from './RiskMeter';
import { Input } from './ui/input';

export default function LiveMonitoring() {
  const streamUrl = process.env.NEXT_PUBLIC_STREAM_URL || 'http://localhost:8000/api/stream';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [pipelineStatus, setPipelineStatus] = useState<'idle' | 'running' | 'error'>('idle');
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const [sourceInput, setSourceInput] = useState<string>('webcam');

  const [humanCount, setHumanCount] = useState(0);
  const [alertsCount, setAlertsCount] = useState(0);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MED' | 'HIGH'>('LOW');

  const pollStatus = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/status`);
      const data = await res.json();
      setPipelineStatus(data.status);
      setPipelineError(data.error);
    } catch {
      // ignore
    }
  };

  const pollStats = async () => {
    if (pipelineStatus !== 'running') return;
    try {
      const res = await fetch(`${apiUrl}/api/logs/crowd?limit=1`);
      const data = await res.json();
      if (data.rows && data.rows.length > 0) {
        const row = data.rows[0];
        setHumanCount(row.human_count || 0);
        let activeAlerts = 0;
        if (row.restricted) activeAlerts++;
        if (row.abnormal) activeAlerts++;
        if (row.violence) activeAlerts++;
        setAlertsCount(activeAlerts);

        if (row.violence || activeAlerts > 1) {
          setRiskLevel('HIGH');
        } else if (activeAlerts === 1 || (row.human_count > 50)) {
          setRiskLevel('MED');
        } else {
          setRiskLevel('LOW');
        }
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const statusInterval = setInterval(pollStatus, 2000);
    const statsInterval = setInterval(pollStats, 1000);
    pollStatus();
    return () => {
      clearInterval(statusInterval);
      clearInterval(statsInterval);
    };
  }, [pipelineStatus]);

  const handleStart = async () => {
    try {
      await fetch(`${apiUrl}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceInput }),
      });
      pollStatus();
    } catch {
      // ignore
    }
  };

  const handleStop = async () => {
    try {
      await fetch(`${apiUrl}/api/stop`, { method: 'POST' });
      pollStatus();
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800 dark:bg-[#111111]"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500 mb-1">Active Monitoring</p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-lime-500" />
              Live Monitoring
            </h2>
            <p className="text-sm text-slate-500 mt-1">Real-time video analysis for crowd safety and incident detection.</p>
          </div>

          <div className="flex items-center gap-6">
            <div className="bg-slate-50 dark:bg-[#151515] p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex flex-col items-center min-w-24">
              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{humanCount}</span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Crowd Size</span>
            </div>
            <div className="bg-slate-50 dark:bg-[#151515] p-3 rounded-xl border border-slate-100 dark:border-slate-800/50 flex flex-col items-center min-w-24">
              <span className="text-2xl font-mono font-bold text-slate-900 dark:text-white">{alertsCount}</span>
              <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Active Alerts</span>
            </div>
            <div className="hidden sm:block">
              <RiskMeter level={riskLevel} />
            </div>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <div className="relative rounded-2xl border border-slate-200 bg-black dark:border-slate-800 overflow-hidden aspect-video shadow-xl flex items-center justify-center">
            {pipelineStatus === 'running' ? (
              <img
                src={streamUrl}
                alt="Live AI Feed"
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-slate-600 dark:text-slate-500">
                <MonitorPlay className="w-16 h-16 mb-4 opacity-30" />
                <p className="font-medium tracking-wide">Stream Offline</p>
                <p className="text-xs opacity-70 mt-2 text-center max-w-xs">Start the pipeline using the controls to begin processing and monitoring the video feed.</p>
              </div>
            )}

            <div className="absolute top-4 left-4">
              {pipelineStatus === 'running' ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                  <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  <span className="text-xs font-medium text-white uppercase tracking-wider">Live Analysis</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/60 border border-white/10 backdrop-blur-md">
                  <div className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-xs font-medium text-white uppercase tracking-wider">Standby</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111111]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Pipeline Control</h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-500 uppercase tracking-wider block mb-2">Video Source</label>
                <Input
                  value={sourceInput}
                  onChange={(e) => setSourceInput(e.target.value)}
                  placeholder="webcam or file path"
                  disabled={pipelineStatus === 'running'}
                  className="bg-slate-50 border-slate-200 dark:bg-[#151515] dark:border-slate-800 text-sm"
                />
              </div>

              {pipelineError && (
                <div className="p-3 bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-xs dark:bg-rose-500/10 dark:border-rose-500/20 dark:text-rose-400">
                  {pipelineError}
                </div>
              )}

              {pipelineStatus === 'idle' || pipelineStatus === 'error' ? (
                <button
                  onClick={handleStart}
                  className="w-full flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-600 text-lime-950 font-semibold py-3 rounded-xl transition-all shadow-lg shadow-lime-500/20 dark:bg-lime-500/20 dark:hover:bg-lime-500/30 dark:text-lime-300 dark:shadow-none"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Start Processing
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="w-full flex items-center justify-center gap-2 bg-rose-500 hover:bg-rose-600 text-white font-semibold py-3 rounded-xl transition-all shadow-lg shadow-rose-500/20 dark:bg-rose-500/20 dark:hover:bg-rose-500/30 dark:text-rose-300 dark:shadow-none"
                >
                  <Square className="w-4 h-4 fill-current" />
                  Stop AI Pipeline
                </button>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#111111]">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Latest Incidents
            </h3>
            <div className="space-y-3">
              {alertsCount > 0 ? (
                <div className="bg-orange-50 dark:bg-orange-500/10 border border-orange-200 dark:border-orange-500/20 p-3 rounded-xl">
                  <p className="text-sm text-orange-800 dark:text-orange-400 font-medium">Critical violations detected.</p>
                  <p className="text-xs text-orange-600 dark:text-orange-500/80 mt-1">Review the incidents tab for specific alerts and to resolve pending flags.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-slate-400 dark:text-slate-600">
                  <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-[#151515] flex items-center justify-center mb-2">
                    <ShieldAlert className="w-5 h-5 opacity-50" />
                  </div>
                  <p className="text-xs">No active alerts</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
