"use client";

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { Activity, CheckCircle2, Flame, Route, ShieldAlert, Timer, Trash2 } from 'lucide-react';
import {
  getCrowdLogs,
  getEnergyDistribution,
  getSessionSummaries,
  heatmapImageUrl,
  tracksImageUrl,
  type CrowdRow,
  type EnergyBucket,
  type SessionSummary,
  useBackendUrl,
} from '@/lib/api';
import { toast } from 'sonner';

type Incident = {
  id: number;
  type: 'VIOLENCE' | 'RESTRICTED_ZONE' | 'ABNORMAL' | 'MANUAL';
  status: 'OPEN' | 'RESOLVED';
  description: string | null;
  createdAt: string;
  resolvedAt: string | null;
};

function IncidentsPanel() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchErrorToastShown = useRef(false);

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents', { credentials: 'include' });
      const data = await res.json();
      if (data.incidents) {
        setIncidents(data.incidents);
        fetchErrorToastShown.current = false;
      }
    } catch {
      if (!fetchErrorToastShown.current) {
        toast.error('Failed to fetch incidents. Retrying in background...');
        fetchErrorToastShown.current = true;
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: number) => {
    const toastId = toast.loading('Resolving incident...');
    try {
      setIncidents((prev) => prev.map((item) => (item.id === id ? { ...item, status: 'RESOLVED' } : item)));
      const res = await fetch(`/api/incidents?id=${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (!res.ok) throw new Error('Failed to resolve incident');
      fetchIncidents();
      toast.success('Incident marked as resolved.', { id: toastId });
    } catch {
      toast.error('Failed to resolve incident.', { id: toastId });
      fetchIncidents();
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to permanently delete this incident record?')) return;
    const toastId = toast.loading('Deleting incident...');
    try {
      setIncidents((prev) => prev.filter((item) => item.id !== id));
      const res = await fetch(`/api/incidents?id=${id}`, { method: 'DELETE', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to delete incident');
      toast.success('Incident deleted.', { id: toastId });
    } catch {
      toast.error('Failed to delete incident.', { id: toastId });
      fetchIncidents();
    }
  };

  const typeStyle: Record<Incident['type'], string> = {
    VIOLENCE: 'bg-rose-100 text-rose-700 dark:bg-rose-900/25 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    RESTRICTED_ZONE: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    ABNORMAL: 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-200 border-slate-300 dark:border-slate-600',
    MANUAL: 'bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300 border-slate-300 dark:border-slate-700',
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70" />
        <div className="h-16 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70" />
      </div>
    );
  }

  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-300 bg-slate-50 p-6 text-sm text-slate-600 dark:border-slate-700 dark:bg-[#141b25] dark:text-slate-300">
        No incidents logged yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {incidents.map((incident) => (
        <div
          key={incident.id}
          className={`rounded-2xl border p-4 ${
            incident.status === 'OPEN'
              ? 'border-l-4 border-l-rose-600 border-y-slate-300 border-r-slate-300 dark:border-y-slate-700 dark:border-r-slate-700'
              : 'border-slate-300 opacity-80 dark:border-slate-700'
          }`}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className={`rounded border px-2 py-1 text-[10px] font-bold uppercase tracking-wider ${typeStyle[incident.type]}`}>
                  {incident.type.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-slate-400">{new Date(incident.createdAt).toLocaleString()}</span>
                {incident.status === 'RESOLVED' && (
                  <span className="flex items-center gap-1 border border-slate-300 bg-slate-200 px-2 py-0.5 text-xs text-slate-700 dark:border-slate-600 dark:bg-slate-700/40 dark:text-slate-200">
                    <CheckCircle2 className="h-3 w-3" />
                    Resolved
                  </span>
                )}
              </div>
              <p className="text-sm font-medium text-slate-900 dark:text-white">{incident.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {incident.status === 'OPEN' && (
                <button
                  onClick={() => handleResolve(incident.id)}
                  className="whitespace-nowrap bg-emerald-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
                >
                  Mark Resolved
                </button>
              )}
              <button
                onClick={() => handleDelete(incident.id)}
                className="border border-transparent p-2 text-rose-600 transition-colors hover:border-rose-300 hover:bg-rose-100 dark:hover:border-rose-700 dark:hover:bg-rose-900/25"
                title="Permanently remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsDashboard() {
  const apiUrl = useBackendUrl();
  const { data } = useSession();
  const [streams, setStreams] = useState<SessionSummary[]>([]);
  const [selectedStream, setSelectedStream] = useState<string>('');
  const [crowdRows, setCrowdRows] = useState<CrowdRow[]>([]);
  const [energyBuckets, setEnergyBuckets] = useState<EnergyBucket[]>([]);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [loadingGraphs, setLoadingGraphs] = useState(false);

  const role = ((data?.user as { role?: string } | undefined)?.role ?? 'VIEWER') as string;

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const rows: SessionSummary[] = await getSessionSummaries();
        setStreams(rows);
        if (rows.length > 0) {
          setSelectedStream((prev) => (prev && rows.some((r: SessionSummary) => r.id === prev) ? prev : rows[0].id));
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch stream sessions.');
      } finally {
        setLoadingStreams(false);
      }
    };

    fetchStreams();
  }, [apiUrl]);

  useEffect(() => {
    if (!selectedStream) return;

    let active = true;

    const loadGraphs = async () => {
      setLoadingGraphs(true);
      try {
        const [crowd, energy] = await Promise.all([
          getCrowdLogs({ session: selectedStream, limit: 120 }),
          getEnergyDistribution(selectedStream),
        ]);
        if (!active) return;
        setCrowdRows(crowd.rows ?? []);
        setEnergyBuckets(energy ?? []);
      } catch (err) {
        console.error(err);
        if (active) {
          setCrowdRows([]);
          setEnergyBuckets([]);
          toast.error('Failed to load analytics for this stream.');
        }
      } finally {
        if (active) setLoadingGraphs(false);
      }
    };

    loadGraphs();
    return () => {
      active = false;
    };
  }, [selectedStream, apiUrl]);

  const selectedMeta = streams.find((stream) => stream.id === selectedStream) ?? null;
  const tracksUrl = selectedStream ? tracksImageUrl(selectedStream) : '';
  const heatmapUrl = selectedStream ? heatmapImageUrl(selectedStream) : '';

  const crowdSeries = crowdRows
    .map((row, index) => ({
      x: index,
      crowd: Number(row.human_count) || 0,
      violations: Number(row.violations) || 0,
    }))
    .slice(-36);

  const maxSeriesValue = Math.max(
    1,
    ...crowdSeries.map((row) => Math.max(row.crowd, row.violations))
  );

  const crowdLine = crowdSeries
    .map((row, index) => `${(index / Math.max(crowdSeries.length - 1, 1)) * 100},${100 - (row.crowd / maxSeriesValue) * 100}`)
    .join(' ');

  const violationLine = crowdSeries
    .map((row, index) => `${(index / Math.max(crowdSeries.length - 1, 1)) * 100},${100 - (row.violations / maxSeriesValue) * 100}`)
    .join(' ');

  const maxBucket = Math.max(1, ...energyBuckets.map((bucket) => bucket.count));

  const formatTimestamp = (value: string | null) => {
    if (!value) return 'Unknown';
    const maybeDate = new Date(value);
    return Number.isNaN(maybeDate.getTime()) ? value : maybeDate.toLocaleString();
  };

  const GraphFrame = ({
    title,
    icon,
    children,
  }: {
    title: string;
    icon: ReactNode;
    children: ReactNode;
  }) => (
    <div className="rounded-3xl border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-[#141b25] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {icon}
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  if (loadingStreams) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="h-72 animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800/70" />
          <div className="aspect-video animate-pulse rounded-3xl bg-slate-200/80 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl p-10 bg-slate-50 border border-slate-300 dark:bg-[#141b25] dark:border-slate-700">
        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No stream sessions found</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">Run the processing pipeline first. Sessions will appear here with start and end timestamps.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Analytics + Incidents</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pick a stream in the sidebar to load all four analytics graphs, then review incidents below.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#141b25]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
            <Timer className="h-4 w-4" />
            Streams
          </div>
          <div className="space-y-2 max-h-[560px] overflow-auto pr-1">
            {streams.map((stream) => {
              const active = selectedStream === stream.id;
              return (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStream(stream.id)}
                  className={`w-full rounded-2xl border p-3 text-left transition-colors ${
                    active
                      ? 'border-emerald-700/60 bg-emerald-200/70 dark:border-emerald-700/55 dark:bg-emerald-950/35'
                      : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-[#101821] dark:hover:border-emerald-700/45 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{stream.id}</p>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Start: {formatTimestamp(stream.startTime)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">End: {formatTimestamp(stream.endTime)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-300/70 bg-white/80 p-3 text-xs font-medium text-slate-600 dark:border-slate-700/70 dark:bg-[#0f141b]/80 dark:text-slate-300">
            Selected stream: <span className="font-semibold">{selectedMeta?.id ?? 'None'}</span> | Start: {formatTimestamp(selectedMeta?.startTime ?? null)} | End: {formatTimestamp(selectedMeta?.endTime ?? null)}
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <GraphFrame title="Density Heatmap" icon={<Flame className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden rounded-xl border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                {selectedStream ? <img src={heatmapUrl} alt="Heatmap" className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-screen" /> : null}
              </div>
            </GraphFrame>

            <GraphFrame title="Movement Trajectories" icon={<Route className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden rounded-xl border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                {selectedStream ? <img src={tracksUrl} alt="Tracks" className="h-full w-full object-cover mix-blend-multiply dark:mix-blend-screen" /> : null}
              </div>
            </GraphFrame>

            <GraphFrame title="Crowd vs Violations" icon={<Activity className="h-4 w-4" />}>
              <div className="aspect-video rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-[#0f141c]">
                {crowdSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No crowd data</div>
                ) : (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    <polyline fill="none" stroke="rgb(16 185 129)" strokeWidth="1.8" points={crowdLine} />
                    <polyline fill="none" stroke="rgb(244 63 94)" strokeWidth="1.6" points={violationLine} />
                  </svg>
                )}
              </div>
            </GraphFrame>

            <GraphFrame title="Energy Distribution" icon={<Activity className="h-4 w-4" />}>
              <div className="aspect-video rounded-xl border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-[#0f141c]">
                {energyBuckets.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No energy data</div>
                ) : (
                  <div className="flex h-full items-end gap-2 overflow-hidden">
                    {energyBuckets.slice(0, 16).map((bucket) => (
                      <div key={bucket.bucket} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <div
                          className="w-full rounded-t bg-emerald-500/80"
                          style={{ height: `${Math.max(6, (bucket.count / maxBucket) * 88)}%` }}
                          title={`${bucket.bucket}: ${bucket.count}`}
                        />
                        <span className="w-full truncate text-center text-[10px] text-slate-500 dark:text-slate-400">{bucket.bucket}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </GraphFrame>
          </div>

          {loadingGraphs && <p className="text-xs text-slate-500 dark:text-slate-400">Loading selected stream graphs...</p>}
        </section>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-5 w-5 text-slate-700 dark:text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Incidents</h3>
        </div>
        {role === 'VIEWER' ? (
          <div className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-700 dark:bg-[#141b25] dark:text-slate-300">
            Incident management is restricted to operator and admin roles.
          </div>
        ) : (
          <IncidentsPanel />
        )}
      </div>
    </div>
  );
}
