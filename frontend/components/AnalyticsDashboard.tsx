"use client";

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Activity, Flame, Route } from 'lucide-react';

interface AnalyticsDashboardProps {
  eventId: number;
}

export default function AnalyticsDashboard({ eventId }: AnalyticsDashboardProps) {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  const [sessions, setSessions] = useState<string[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Energy distribution buckets
  const [energyBuckets, setEnergyBuckets] = useState<{bucket: string, count: number}[]>([]);

  useEffect(() => {
    // Fetch available sessions from the backend
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
      <div className="flex flex-col items-center justify-center p-10 bg-white border border-slate-200 rounded-3xl dark:bg-[#111111] dark:border-slate-800">
        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No analytical data available</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">Run the AI pipeline processing engine first to generate tracking sessions.</p>
      </div>
    );
  }

  const tracksUrl = selectedSession ? `${apiUrl}/api/analytics/tracks-image?session=${selectedSession}` : '';
  const heatmapUrl = selectedSession ? `${apiUrl}/api/analytics/heatmap-image?session=${selectedSession}` : '';

  // Calculate highest energy bucket for scaling bars
  const maxEnergy = Math.max(...(energyBuckets.map(b => b.count) || [1]));

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
              {sessions.map(s => (
                <SelectItem key={s} value={s}>{s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Heatmap Card */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden dark:bg-[#111111] dark:border-slate-800 relative group">
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 dark:bg-black/60 dark:border-slate-800 text-xs font-semibold flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-orange-500" />
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

        {/* Tracks Card */}
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden dark:bg-[#111111] dark:border-slate-800 relative group">
          <div className="absolute top-4 left-4 z-10 bg-white/90 backdrop-blur px-3 py-1.5 rounded-full border border-slate-200 dark:bg-black/60 dark:border-slate-800 text-xs font-semibold flex items-center gap-1.5">
            <Route className="w-3.5 h-3.5 text-blue-500" />
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

      {/* Energy chart */}
      {energyBuckets.length > 0 && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 dark:bg-[#111111] dark:border-slate-800">
          <h3 className="text-sm font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-4 h-4 text-lime-500" />
            Kinetic Energy Distribution
          </h3>
          <div className="flex items-end gap-1 h-48 w-full">
            {energyBuckets.map((bucket, i) => {
              const heightPct = Math.max((bucket.count / maxEnergy) * 100, 2);
              return (
                <div key={i} className="flex-1 flex flex-col justify-end group">
                  <div 
                    className="w-full bg-lime-500/20 hover:bg-lime-500 rounded-t-sm transition-all relative dark:bg-lime-500/30 dark:hover:bg-lime-400"
                    style={{ height: `${heightPct}%` }}
                  >
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[10px] py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                      {bucket.count} tracks
                    </div>
                  </div>
                </div>
              );
            })}
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
