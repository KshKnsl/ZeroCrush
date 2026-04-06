"use client";

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Flame, Route } from 'lucide-react';
import { backendUrl } from '@/lib/api';

export default function AnalyticsDashboard() {
  const apiUrl = backendUrl();

  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const [energyBuckets, setEnergyBuckets] = useState<{ bucket: string; count: number }[]>([]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/sessions`);
        const data = await res.json();
        if (data.sessions && data.sessions.length > 0) {
          setSessions(data.sessions);
          setSelectedSession(data.sessions[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSessions();
  }, [apiUrl]);

  useEffect(() => {
    if (!selectedSession) return;

    const fetchEnergyData = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/analytics/energy?session=${selectedSession}`);
        const data = await res.json();
        if (data.buckets) {
          setEnergyBuckets(data.buckets);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchEnergyData();
  }, [selectedSession, apiUrl]);

  if (loading) {
    return <div className="text-slate-500 animate-pulse p-4">Loading analytics...</div>;
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-slate-300 dark:bg-[#141b25] dark:border-slate-700">
        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No analytical data available</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">Run the AI pipeline processing engine first to generate tracking sessions.</p>
      </div>
    );
  }

  const tracksUrl = selectedSession ? `${apiUrl}/api/analytics/tracks-image?session=${selectedSession}` : '';
  const heatmapUrl = selectedSession ? `${apiUrl}/api/analytics/heatmap-image?session=${selectedSession}` : '';
  const maxEnergy = Math.max(...(energyBuckets.map((b) => b.count) || [1]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">Venue Analytics</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Post-processing insights on crowd density and trajectories.</p>
        </div>

        <div className="w-full sm:w-64">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="bg-white dark:bg-[#151515] dark:border-slate-800">
              <SelectValue placeholder="Select session log" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((session) => (
                <SelectItem key={session} value={session}>
                  {session}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-50 border border-slate-300 overflow-hidden dark:bg-[#141b25] dark:border-slate-700 relative group">
          <div className="absolute top-4 left-4 z-10 bg-slate-100/95 px-3 py-1.5 border border-slate-300 dark:bg-[#0e131b]/90 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            Density Heatmap
          </div>
          <div className="aspect-video w-full bg-slate-100 dark:bg-black flex items-center justify-center">
            {heatmapUrl ? (
              <img src={heatmapUrl} alt="Heatmap" className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-screen" />
            ) : (
              <span className="text-slate-400">No Image</span>
            )}
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-300 overflow-hidden dark:bg-[#141b25] dark:border-slate-700 relative group">
          <div className="absolute top-4 left-4 z-10 bg-slate-100/95 px-3 py-1.5 border border-slate-300 dark:bg-[#0e131b]/90 dark:border-slate-700 text-xs font-semibold flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
            Movement Trajectories
          </div>
          <div className="aspect-video w-full bg-slate-100 dark:bg-black flex items-center justify-center">
            {tracksUrl ? (
              <img src={tracksUrl} alt="Tracks" className="w-full h-full object-cover mix-blend-multiply dark:mix-blend-screen" />
            ) : (
              <span className="text-slate-400">No Image</span>
            )}
          </div>
        </div>
      </div>

      {energyBuckets.length > 0 && (
        <div className="bg-slate-50 border border-slate-300 p-6 dark:bg-[#141b25] dark:border-slate-700">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-700 dark:text-slate-300" />
            Kinetic Energy Distribution
          </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {energyBuckets.map((bucket, i) => (
              <div key={i} className="border border-slate-300 bg-white p-6 dark:border-slate-700 dark:bg-[#0f141c]">
                <p className="text-sm text-slate-500 dark:text-slate-400">{bucket.bucket}</p>
                <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{bucket.count}</p>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-4 text-xs font-semibold tracking-wider text-slate-400 uppercase">
            <span>Low Energy (Stationary)</span>
            <span>High Energy (Running)</span>
          </div>
        </div>
      )}
    </div>
  );
}
