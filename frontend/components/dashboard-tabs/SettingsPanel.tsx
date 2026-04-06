"use client";

import { useEffect, useState } from 'react';
import { RotateCcw, Save, Settings, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { backendUrl } from '@/lib/api';

type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };

const SETTING_DESCRIPTIONS: Record<string, string> = {
  VIDEO_SOURCE: 'Default video source path or camera index used by the pipeline.',
  IS_REALTIME: 'Controls real-time mode behavior and frame-timestamp handling.',
  CAMERA_ELEVATED: 'Switches distance logic between centroid mode and box-edge mode.',
  FRAME_WIDTH: 'Target width used when resizing frames before inference.',
  YOLO_MODEL_PATH: 'Path to the YOLO model weights file.',
  YOLO_CONFIDENCE: 'Minimum confidence required to keep person detections.',
  TRACK_SMOOTHING_ALPHA: 'Bounding-box smoothing factor. Lower is steadier, higher is more reactive.',
  FRAME_SMOOTHING_ALPHA: 'Temporal frame blend factor for smoother output frames.',
  STREAM_JPEG_QUALITY: 'JPEG quality used for stream encoding (1-100).',
  TRACK_MAX_AGE: 'Maximum tracker age before stale tracks are dropped.',
  DISTANCE_THRESHOLD: 'Minimum spacing threshold used for social-distance checks.',
  MIN_CROWD_FOR_ANALYSIS: 'Minimum people count required for certain crowd analysis views.',
  RESTRICTED_ZONE: 'Polygon points defining the restricted area as [[x,y], ...].',
  CHECK_ABNORMAL: 'Enables kinetic-energy based abnormal movement detection.',
  MIN_PERSONS_ABNORMAL: 'Minimum people required before abnormal ratio checks are applied.',
  ENERGY_THRESHOLD: 'Energy threshold to classify an individual as abnormal.',
  ABNORMAL_RATIO_THRESHOLD: 'Crowd ratio threshold that triggers abnormal crowd alert.',
  DATA_RECORD_RATE: 'How many processed data points are recorded per second.',
  LOG_DIR: 'Directory where CSV logs and session artifacts are stored.',
  START_TIME: 'Start timestamp used for offline video timeline alignment.',
  API_HOST: 'Host interface used by the backend API server.',
  API_PORT: 'Port used by the backend API server.',
};

const PRIORITY_ORDER = [
  'VIDEO_SOURCE',
  'IS_REALTIME',
  'CAMERA_ELEVATED',
  'FRAME_WIDTH',
  'YOLO_MODEL_PATH',
  'YOLO_CONFIDENCE',
  'TRACK_SMOOTHING_ALPHA',
  'FRAME_SMOOTHING_ALPHA',
  'STREAM_JPEG_QUALITY',
  'TRACK_MAX_AGE',
  'DISTANCE_THRESHOLD',
  'MIN_CROWD_FOR_ANALYSIS',
  'RESTRICTED_ZONE',
  'CHECK_ABNORMAL',
  'MIN_PERSONS_ABNORMAL',
  'ENERGY_THRESHOLD',
  'ABNORMAL_RATIO_THRESHOLD',
  'DATA_RECORD_RATE',
  'LOG_DIR',
  'START_TIME',
  'API_HOST',
  'API_PORT',
];

const prettifyKey = (key: string) => key.toLowerCase().replace(/_/g, ' ');

const stringifyValue = (value: ConfigValue) => {
  if (value === null) return 'null';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

const parseEditedValue = (baseValue: ConfigValue, draftValue: string): ConfigValue => {
  const trimmed = draftValue.trim();
  if (trimmed.length === 0) {
    return baseValue;
  }

  if (typeof baseValue === 'boolean') {
    return trimmed === 'true';
  }

  if (typeof baseValue === 'number') {
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : baseValue;
  }

  if (Array.isArray(baseValue) || (typeof baseValue === 'object' && baseValue !== null)) {
    try {
      return JSON.parse(trimmed) as ConfigValue;
    } catch {
      return baseValue;
    }
  }

  if (baseValue === null) {
    if (trimmed === 'null') return null;
    return trimmed;
  }

  return trimmed;
};

export default function SettingsPanel() {
  const apiUrl = backendUrl();
  const [config, setConfig] = useState<Record<string, ConfigValue>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageKind, setMessageKind] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/config`);
        const data = await res.json();
        setConfig(data as Record<string, ConfigValue>);
        setDraft({});
      } catch (err) {
        console.error("Failed to fetch settings", err);
        setMessageKind('error');
        setMessage('Could not load backend configuration.');
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [apiUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const settingsKeys = Object.keys(config).filter((k) => /^[A-Z_]+$/.test(k));
    const payload: Record<string, ConfigValue> = {};
    for (const key of settingsKeys) {
      const baseValue = config[key];
      const rawDraft = draft[key] ?? '';
      payload[key] = parseEditedValue(baseValue, rawDraft);
    }

    try {
      const res = await fetch(`${apiUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setConfig(payload);
        setDraft({});
        setMessageKind('success');
        setMessage('Settings saved. New values will be used by the next pipeline cycle.');
      } else {
        setMessageKind('error');
        setMessage('Failed to save settings.');
      }
    } catch {
      setMessageKind('error');
      setMessage('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDraft({});
    setMessageKind('info');
    setMessage('Unsaved changes have been reset to current backend values.');
  };

  if (loading) {
    return <div className="p-6 text-slate-500 animate-pulse">Loading configuration...</div>;
  }

  const settingsKeys = Object.keys(config)
    .filter((k) => /^[A-Z_]+$/.test(k))
    .sort((a, b) => {
      const ai = PRIORITY_ORDER.indexOf(a);
      const bi = PRIORITY_ORDER.indexOf(b);
      if (ai !== -1 && bi !== -1) return ai - bi;
      if (ai !== -1) return -1;
      if (bi !== -1) return 1;
      return a.localeCompare(b);
    });

  return (
    <section className="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.1),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.09),_transparent_42%),linear-gradient(140deg,#ffffff,#f5f9ff)] p-6 shadow-[0_35px_80px_rgba(15,23,42,0.09)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.2),_transparent_34%),radial-gradient(circle_at_bottom_left,_rgba(56,189,248,0.15),_transparent_42%),linear-gradient(140deg,#0b1118,#101827)] sm:p-8">
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] [background-size:26px_26px] dark:[background-image:linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]" />

      <div className="relative mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-700/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-emerald-500/20 p-3 text-emerald-600 shadow-inner dark:text-emerald-300">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Pipeline control center</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">System Settings Matrix</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Every backend setting is editable here. Each field shows a short description, and the current backend value is shown as the placeholder.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 text-xs text-slate-600 backdrop-blur dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-500" />
            <span>{settingsKeys.length} settings detected</span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="relative space-y-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {settingsKeys.map((key) => {
            const currentValue = config[key];
            const isBool = typeof currentValue === 'boolean';
            const isComplex = Array.isArray(currentValue) || (typeof currentValue === 'object' && currentValue !== null);
            const value = draft[key] ?? '';
            const description = SETTING_DESCRIPTIONS[key] ?? 'Backend configuration value exposed from config.py.';

            return (
              <div
                key={key}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-4 shadow-[0_12px_30px_rgba(15,23,42,0.04)] backdrop-blur dark:border-slate-700/70 dark:bg-slate-900/40"
              >
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                  {prettifyKey(key)}
                </label>
                <p className="mb-3 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>

                {isBool ? (
                  <select
                    className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-100"
                    value={value}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  >
                    <option value="">Current: {currentValue ? 'Enabled' : 'Disabled'}</option>
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : isComplex ? (
                  <textarea
                    rows={3}
                    value={value}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={stringifyValue(currentValue)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-none dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-100"
                  />
                ) : (
                  <Input
                    type={typeof currentValue === 'number' ? 'number' : 'text'}
                    value={value}
                    onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                    placeholder={stringifyValue(currentValue)}
                    className="h-11 bg-slate-50 font-mono text-sm border-slate-300 dark:bg-[#0f1724] dark:border-slate-700"
                  />
                )}

                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Current value: <span className="font-mono">{stringifyValue(currentValue)}</span>
                </p>
              </div>
            );
          })}
        </div>

        {message && (
          <div
            className={`rounded-2xl border p-4 text-sm font-medium ${
              messageKind === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
                : messageKind === 'error'
                  ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300'
                  : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-500/30 dark:bg-sky-500/10 dark:text-sky-300'
            }`}
          >
            {message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-200/80 pt-6 dark:border-slate-700/70">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={saving}
            className="h-11 rounded-xl px-5"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset Changes
          </Button>
          <Button
            disabled={saving}
            type="submit"
            className="h-11 rounded-xl bg-emerald-500 px-6 font-semibold text-emerald-950 hover:bg-emerald-400 dark:bg-emerald-500/25 dark:text-emerald-300 dark:hover:bg-emerald-500/35"
          >
            {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save Settings</>}
          </Button>
        </div>
      </form>
    </section>
  );
}
