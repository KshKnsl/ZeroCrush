"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { Activity, Camera, Clock3, Flame, Route, Timer } from 'lucide-react';
import { toast } from 'sonner';

type Session = {
  id: string;
  source: string;
  startTime: string | null;
  endTime: string | null;
  updatedAt: string | null;
  videoFps?: number;
  processedFrameSize?: number;
  trackMaxAge?: number;
  previewImageBase64?: string | null;
  crowdPeakBase64?: string | null;
  violationPeakBase64?: string | null;
  heatmapImageBase64?: string | null;
  tracksImageBase64?: string | null;
  crowdData?: unknown;
  energyBuckets?: unknown;
  logEvents?: unknown;
  createdAt?: string;
};

type CrowdPoint = {
  x: number;
  crowd: number;
  violations: number;
  restricted: boolean;
  abnormal: boolean;
};

type LogEvent = {
  type?: string;
  time?: string;
  severity?: string;
  label?: string;
};

const toNumber = (value: unknown) => Number(value) || 0;
const toBool = (value: unknown) => Boolean(Number(value) || value);

export default function AnalyticsDashboard() {
  const [streams, setStreams] = useState<Session[]>([]);
  const [selectedStreamId, setSelectedStreamId] = useState<string>('');
  const [sessionDetail, setSessionDetail] = useState<Session | null>(null);
  const [loadingStreams, setLoadingStreams] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    const fetchStreams = async () => {
      try {
        const res = await fetch('/api/sessions');
        if (!res.ok) throw new Error('Failed to fetch sessions');
        const data = await res.json();
        const rows: Session[] = (data.items || []).map((item: any) => ({
          id: item.id,
          source: item.source || String(item.id),
          startTime: item.startTime || null,
          endTime: item.endTime || null,
          updatedAt: item.updatedAt || null,
        }));
        setStreams(rows);
        if (rows.length > 0) {
          setSelectedStreamId(rows[0].id);
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to fetch stream sessions.');
      } finally {
        setLoadingStreams(false);
      }
    };

    fetchStreams();
    const interval = setInterval(fetchStreams, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!selectedStreamId) return;

    let active = true;
    const fetchDetail = async () => {
      setLoadingDetail(true);
      try {
        const res = await fetch(`/api/sessions?id=${selectedStreamId}`);
        if (!res.ok) throw new Error('Fetch failed');
        const data = (await res.json()) as Session;
        if (active) setSessionDetail(data);
      } catch (err) {
        console.error(err);
        if (active) {
          setSessionDetail(null);
          toast.error('Failed to load session details.');
        }
      } finally {
        if (active) setLoadingDetail(false);
      }
    };

    fetchDetail();
    return () => {
      active = false;
    };
  }, [selectedStreamId]);

  const selectedMeta = streams.find((stream) => stream.id === selectedStreamId) ?? null;
  const sessionStart = sessionDetail?.startTime ?? selectedMeta?.startTime;
  const sessionEnd = sessionDetail?.endTime ?? selectedMeta?.endTime;

  const crowdRows = Array.isArray(sessionDetail?.crowdData) ? (sessionDetail.crowdData as Record<string, unknown>[]) : [];
  const crowdSeries: CrowdPoint[] = crowdRows.map((row, index) => ({
    x: index,
    crowd: toNumber(row['Human Count']) || toNumber(row.human_count),
    violations: toNumber(row['Social Distance violate']) || toNumber(row.violations),
    restricted: toBool(row['Restricted Entry']) || toBool(row.restricted),
    abnormal: toBool(row['Abnormal Activity']) || toBool(row.abnormal),
  })).slice(-36);

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

  const energyBuckets = Array.isArray(sessionDetail?.energyBuckets) ? (sessionDetail.energyBuckets as Array<{ bucket: string; count: number }>) : [];
  const maxBucket = Math.max(1, ...energyBuckets.map((bucket) => bucket.count));
  const logEvents = Array.isArray(sessionDetail?.logEvents) ? (sessionDetail.logEvents as LogEvent[]) : [];
  const recentCrowdRows = crowdRows.slice(-20).reverse();

  const formatTimestamp = (value: string | null | undefined) => {
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
    <div className="border border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-[#141b25] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-slate-300 px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {icon}
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );

  const SessionImage = ({ src, alt }: { src?: string | null; alt: string }) => {
    if (!src) {
      return <div className="flex h-full w-full items-center justify-center text-sm text-slate-400 border border-dashed border-slate-300 dark:border-slate-700">Not generated for this session</div>;
    }
    return <img src={src} alt={alt} className="h-full w-full object-cover" />;
  };

  if (loadingStreams) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 animate-pulse bg-slate-200 dark:bg-slate-700" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
          <div className="h-72 animate-pulse bg-slate-200/80 dark:bg-slate-800/70" />
          <div className="aspect-video animate-pulse bg-slate-200/80 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  if (streams.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-slate-300 dark:bg-[#141b25] dark:border-slate-700">
        <Activity className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-4" />
        <h3 className="text-lg font-medium text-slate-900 dark:text-white">No stream sessions found</h3>
        <p className="text-slate-500 dark:text-slate-400 mt-1 max-w-sm text-center">Run the processing pipeline first. Sessions will automatically log here when they end.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">Session Analytics</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Pick a stream session in the sidebar to review full analytics visuals.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <aside className="border border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-[#141b25]">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-600 dark:text-slate-300">
            <Timer className="h-4 w-4" />
            Sessions
          </div>
          <div className="space-y-2 max-h-140 overflow-auto pr-1">
            {streams.map((stream) => {
              const active = selectedStreamId === stream.id;
              return (
                <button
                  key={stream.id}
                  onClick={() => setSelectedStreamId(stream.id)}
                  className={`w-full border p-3 text-left transition-colors ${
                    active
                      ? 'border-emerald-700/60 bg-emerald-200/70 dark:border-emerald-700/55 dark:bg-emerald-950/35'
                      : 'border-slate-300 bg-white hover:border-emerald-500 hover:bg-emerald-50 dark:border-slate-700 dark:bg-[#101821] dark:hover:border-emerald-700/45 dark:hover:bg-emerald-950/20'
                  }`}
                >
                  <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{stream.source || stream.id}</p>
                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Start: {formatTimestamp(stream.startTime)}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">End: {formatTimestamp(stream.endTime)}</p>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="border border-slate-300/70 bg-white/80 p-3 text-xs font-medium text-slate-600 dark:border-slate-700/70 dark:bg-[#0f141b]/80 dark:text-slate-300">
             Session: <span className="font-semibold">{sessionDetail?.source || selectedMeta?.source || selectedMeta?.id || 'None'}</span> | Start: {formatTimestamp(sessionStart)} | End: {formatTimestamp(sessionEnd)}
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <div className="border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#141b25]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Source</p>
              <p className="mt-2 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{sessionDetail?.source || selectedMeta?.source || 'Unknown'}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#141b25]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">FPS</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{toNumber(sessionDetail?.videoFps) || 'N/A'}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#141b25]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Frame Size</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{toNumber(sessionDetail?.processedFrameSize) || 'N/A'}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#141b25]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Track Age</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{toNumber(sessionDetail?.trackMaxAge) || 'N/A'}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#141b25]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Crowd Rows</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{crowdRows.length}</p>
            </div>
            <div className="border border-slate-300 bg-slate-50 p-3 dark:border-slate-700 dark:bg-[#141b25]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Events</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{logEvents.length}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <GraphFrame title="Processed Output Preview" icon={<Camera className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                <SessionImage src={sessionDetail?.previewImageBase64} alt="Processed preview" />
              </div>
            </GraphFrame>

            <GraphFrame title="Peak Crowd Frame" icon={<Timer className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                <SessionImage src={sessionDetail?.crowdPeakBase64} alt="Peak crowd frame" />
              </div>
            </GraphFrame>

            <GraphFrame title="Peak Violation Frame" icon={<Clock3 className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                <SessionImage src={sessionDetail?.violationPeakBase64} alt="Peak violation frame" />
              </div>
            </GraphFrame>

            <GraphFrame title="Density Heatmap" icon={<Flame className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                <SessionImage src={sessionDetail?.heatmapImageBase64} alt="Heatmap" />
              </div>
            </GraphFrame>

            <GraphFrame title="Movement Trajectories" icon={<Route className="h-4 w-4" />}>
              <div className="aspect-video overflow-hidden border border-slate-300 bg-slate-100 dark:border-slate-700 dark:bg-black">
                <SessionImage src={sessionDetail?.tracksImageBase64} alt="Tracks" />
              </div>
            </GraphFrame>

            <GraphFrame title="Crowd vs Violations" icon={<Activity className="h-4 w-4" />}>
              <div className="aspect-video border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-[#0f141c]">
                {crowdSeries.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No crowd data</div>
                ) : (
                  <svg viewBox="0 0 100 100" className="h-full w-full">
                    {crowdSeries.map((row, index) => {
                      const x = (index / Math.max(crowdSeries.length, 1)) * 100;
                      const width = 100 / Math.max(crowdSeries.length, 1);
                      return (
                        <g key={`band-${row.x}`}>
                          {row.restricted ? <rect x={x} y={90} width={width} height={10} fill="rgba(239,68,68,0.75)" /> : null}
                          {row.abnormal ? <rect x={x} y={82} width={width} height={8} fill="rgba(37,99,235,0.75)" /> : null}
                        </g>
                      );
                    })}
                    <polyline fill="none" stroke="rgb(16 185 129)" strokeWidth="1.8" points={crowdLine} />
                    <polyline fill="none" stroke="rgb(244 63 94)" strokeWidth="1.6" points={violationLine} />
                  </svg>
                )}
              </div>
            </GraphFrame>

            <GraphFrame title="Energy Distribution" icon={<Activity className="h-4 w-4" />}>
              <div className="aspect-video border border-slate-300 bg-white p-3 dark:border-slate-700 dark:bg-[#0f141c]">
                {energyBuckets.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-sm text-slate-400">No energy data</div>
                ) : (
                  <div className="flex h-full items-end gap-2 overflow-hidden">
                    {energyBuckets.slice(0, 16).map((bucket) => (
                      <div key={bucket.bucket} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2">
                        <div
                          className="w-full bg-emerald-500/80"
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

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <GraphFrame title="Recent Crowd Data Rows" icon={<Activity className="h-4 w-4" />}>
              {recentCrowdRows.length === 0 ? (
                <div className="text-sm text-slate-400">No crowd rows stored</div>
              ) : (
                <div className="max-h-72 overflow-auto text-xs">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="px-2 py-1">Time</th>
                        <th className="px-2 py-1">Crowd</th>
                        <th className="px-2 py-1">Violations</th>
                        <th className="px-2 py-1">Restricted</th>
                        <th className="px-2 py-1">Abnormal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentCrowdRows.map((row, index) => (
                        <tr key={`${row.time ?? index}-${index}`} className="border-b border-slate-100 dark:border-slate-800/70">
                          <td className="px-2 py-1">{String(row.time ?? '-')}</td>
                          <td className="px-2 py-1">{toNumber(row['Human Count']) || toNumber(row.human_count)}</td>
                          <td className="px-2 py-1">{toNumber(row['Social Distance violate']) || toNumber(row.violations)}</td>
                          <td className="px-2 py-1">{toBool(row['Restricted Entry']) || toBool(row.restricted) ? 'Yes' : 'No'}</td>
                          <td className="px-2 py-1">{toBool(row['Abnormal Activity']) || toBool(row.abnormal) ? 'Yes' : 'No'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </GraphFrame>

            <GraphFrame title="Session Events" icon={<Clock3 className="h-4 w-4" />}>
              {logEvents.length === 0 ? (
                <div className="text-sm text-slate-400">No events stored</div>
              ) : (
                <div className="max-h-72 space-y-2 overflow-auto">
                  {logEvents.map((event, index) => (
                    <div key={`${event.time ?? index}-${index}`} className="border border-slate-200 px-2 py-2 text-xs dark:border-slate-700">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{event.label || event.type || 'Event'}</p>
                      <p className="mt-1 text-slate-600 dark:text-slate-300">Time: {event.time ?? 'Unknown'}</p>
                      <p className="text-slate-600 dark:text-slate-300">Severity: {event.severity ?? 'unknown'}</p>
                    </div>
                  ))}
                </div>
              )}
            </GraphFrame>

            <GraphFrame title="Raw Session Analysis JSON" icon={<Route className="h-4 w-4" />}>
              <div className="max-h-72 overflow-auto border border-slate-300 bg-slate-100 p-2 text-[11px] dark:border-slate-700 dark:bg-[#0d131c]">
                <pre className="whitespace-pre-wrap wrap-break-word text-slate-700 dark:text-slate-300">
{JSON.stringify(
  {
    id: sessionDetail?.id,
    source: sessionDetail?.source,
    startTime: sessionDetail?.startTime,
    endTime: sessionDetail?.endTime,
    createdAt: sessionDetail?.createdAt,
    videoFps: sessionDetail?.videoFps,
    processedFrameSize: sessionDetail?.processedFrameSize,
    trackMaxAge: sessionDetail?.trackMaxAge,
    crowdData: sessionDetail?.crowdData ?? [],
    energyBuckets: sessionDetail?.energyBuckets ?? [],
    logEvents: sessionDetail?.logEvents ?? [],
  },
  null,
  2
)}
                </pre>
              </div>
            </GraphFrame>
          </div>

          {loadingDetail && <p className="text-xs text-slate-500 dark:text-slate-400">Loading session details...</p>}
        </section>
      </div>
    </div>
  );
}
