"use client";

import { useEffect, useState } from 'react';
import { RotateCcw, Save, Settings, SlidersHorizontal } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

type ConfigValue = string | number | boolean | null | ConfigValue[] | { [key: string]: ConfigValue };

type SettingsSchema = {
  categories: Array<{
    id: string;
    description: string;
  }>;
  settings: Record<
    string,
    {
      default: ConfigValue;
      description: string;
      category: string;
    }
  >;
};

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
  if (trimmed.length === 0) return baseValue;

  if (typeof baseValue === 'boolean') return trimmed === 'true';

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

  if (baseValue === null) return trimmed === 'null' ? null : trimmed;
  return trimmed;
};

export default function SettingsPanel() {
  const [apiUrl, setApiUrl] = useState(() => (typeof window === 'undefined' ? 'http://localhost:8000' : window.localStorage.getItem('backend-url') || 'http://localhost:8000'));
  const [schema, setSchema] = useState<SettingsSchema | null>(null);
  const [config, setConfig] = useState<Record<string, ConfigValue>>({});
  const [defaultConfig, setDefaultConfig] = useState<Record<string, ConfigValue>>({});
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [backendUrlDraft, setBackendUrlDraft] = useState(apiUrl);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const applyBackendUrl = () => {
    const nextUrl = backendUrlDraft;
    setApiUrl(nextUrl);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('backend-url', nextUrl);
    }
    toast.success('Backend URL saved.');
  };

  const persistConfig = async (nextConfig: Record<string, ConfigValue>, loadingText: string, successText: string) => {
    setSaving(true);
    const toastId = toast.loading(loadingText);

    await fetch(`${apiUrl}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nextConfig),
    });

    setConfig(nextConfig);
    setDraft({});
    toast.success(successText, { id: toastId });
    setSaving(false);
  };

  useEffect(() => {
    let cancelled = false;

    const fetchConfig = async () => {
      setLoading(true);

      try {
        const schemaRes = await fetch('/settings.json', { cache: 'no-store' });
        if (!schemaRes.ok) throw new Error(`Failed to load settings schema (${schemaRes.status})`);

        const loadedSchema = (await schemaRes.json()) as SettingsSchema;
        const defaultsData: Record<string, ConfigValue> = {};
        for (const [key, meta] of Object.entries(loadedSchema.settings ?? {})) {
          if (/^[A-Z_]+$/.test(key)) defaultsData[key] = meta.default;
        }

        let configData: Record<string, ConfigValue> = {};
        try {
          const configRes = await fetch(`${apiUrl}/api/config`);
          if (!configRes.ok) throw new Error(`Failed to load runtime config (${configRes.status})`);
          configData = (await configRes.json()) as Record<string, ConfigValue>;
        } catch (configError) {
          configData = defaultsData;
        }

        const nextConfig: Record<string, ConfigValue> = {};
        for (const key of Object.keys(defaultsData)) {
          nextConfig[key] = key in configData ? configData[key] : defaultsData[key];
        }

        if (!cancelled) {
          setSchema(loadedSchema);
          setDefaultConfig(defaultsData);
          setConfig(nextConfig);
          setDraft({});
        }
      } catch (error) {
        if (!cancelled) {
          setSchema(null);
          setDefaultConfig({});
          setConfig({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchConfig();

    return () => {
      cancelled = true;
    };
  }, [apiUrl]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, ConfigValue> = {};
    for (const key of Object.keys(defaultConfig)) {
      const baseValue = key in config ? config[key] : defaultConfig[key];
      payload[key] = parseEditedValue(baseValue, draft[key] ?? '');
    }

    await persistConfig(payload, 'Saving runtime settings...', 'Settings saved.');
  };

  const handleReset = async () => {
    await persistConfig(defaultConfig, 'Resetting to frontend defaults...', 'Settings reset to defaults.');
  };

  const categoryDescription = Object.fromEntries((schema?.categories ?? []).map((c) => [c.id, c.description])) as Record<string, string>;

  const settingsKeys = schema
    ? Object.keys(config)
        .filter((k) => /^[A-Z_]+$/.test(k))
        .filter((key) => key in schema.settings)
    : [];

  const groupedSettings = schema
    ? [...schema.categories.map((category) => category.id), 'Other']
        .map((category) => {
          const keys = settingsKeys.filter((key) => (schema.settings[key]?.category ?? 'Other') === category);
          return { category, keys };
        })
        .filter((group) => group.keys.length > 0)
    : [];

  const leftColumn: typeof groupedSettings = [];
  const rightColumn: typeof groupedSettings = [];
  let leftWeight = 0;
  let rightWeight = 0;
  for (const group of groupedSettings) {
    const weight = group.keys.length;
    if (leftWeight <= rightWeight) {
      leftColumn.push(group);
      leftWeight += weight;
    } else {
      rightColumn.push(group);
      rightWeight += weight;
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative overflow-hidden border border-slate-300 bg-white/90 p-4 dark:border-slate-700 dark:bg-[#0f1724]/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Backend URL</p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">This value is shared across the app and cached in localStorage once per page load.</p>
          </div>
          <div className="flex flex-col gap-2 sm:min-w-80 sm:flex-row">
            <Input
              value={backendUrlDraft}
              onChange={(event) => setBackendUrlDraft(event.target.value)}
              placeholder="http://localhost:8000 or https://example.com"
              className="h-11 border-slate-300 bg-slate-50 font-mono text-sm text-slate-900 dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-100"
            />
            <Button type="button" onClick={applyBackendUrl} className="h-11 bg-emerald-900 px-4 text-sm font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900">
              Apply
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <button type="button" onClick={() => setBackendUrlDraft('http://localhost:8000')} className="border border-slate-300 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-300 dark:hover:bg-[#17202b]">
            Use localhost
          </button>
          <button type="button" onClick={() => setBackendUrlDraft('https://knsl-zero-crush-backend.hf.space')} className="border border-slate-300 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-300 dark:hover:bg-[#17202b]">
            Use HF Server
          </button>
          <button type="button" onClick={() => setBackendUrlDraft(apiUrl)} className="border border-slate-300 bg-slate-50 px-3 py-1.5 font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-300 dark:hover:bg-[#17202b]">
            Revert
          </button>
        </div>
        <p className="mt-3 font-mono text-xs break-all text-slate-500 dark:text-slate-400">Current: {apiUrl}</p>
      </div>

      <section className="relative overflow-hidden border border-slate-300 bg-[linear-gradient(140deg,#f7f9fc,#eef2f7)] p-6 dark:border-slate-700 dark:bg-[linear-gradient(140deg,#0f141b,#17202b)] sm:p-8">
        <div className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(rgba(15,23,42,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,0.04)_1px,transparent_1px)] bg-size-[26px_26px] dark:bg-[linear-gradient(rgba(148,163,184,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.08)_1px,transparent_1px)]" />

        <div className="relative mb-8 flex flex-col gap-4 border-b border-slate-200/80 pb-6 dark:border-slate-700/60 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="border border-emerald-500/45 bg-emerald-200/70 p-3 text-emerald-950 dark:border-emerald-700/55 dark:bg-emerald-950/35 dark:text-emerald-200">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Pipeline control center</p>
            <h2 className="mt-1 text-2xl font-semibold text-slate-900 dark:text-white">System Settings Matrix</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Settings metadata and defaults are loaded from one schema file, then only key/value runtime settings are sent to backend.
            </p>
          </div>
        </div>

        <div className="border border-emerald-500/40 bg-emerald-100/60 px-4 py-3 text-xs text-emerald-950 dark:border-emerald-700/50 dark:bg-emerald-950/30 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-emerald-900 dark:text-emerald-200" />
            <span>{settingsKeys.length} settings detected</span>
          </div>
        </div>
        </div>

        <form onSubmit={handleSave} className="relative space-y-6">
        {loading ? (
          <div className="space-y-4  border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
            <div className="h-4 w-44 animate-pulse  bg-slate-200 dark:bg-slate-700" />
            <div className="h-20 animate-pulse  bg-slate-200/80 dark:bg-slate-800/70" />
            <div className="h-20 animate-pulse  bg-slate-200/80 dark:bg-slate-800/70" />
          </div>
        ) : null}

        {!schema ? null : (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {[leftColumn, rightColumn].map((column, columnIndex) => (
            <div key={`settings-col-${columnIndex}`} className="space-y-6">
              {column.map(({ category, keys }) => (
                <section key={category} className="h-fit border border-slate-300 bg-white/90 dark:border-slate-700 dark:bg-slate-900/40">
                  <div className="border-b border-slate-300 px-4 py-3 dark:border-slate-700">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-700 dark:text-slate-300">{category}</h3>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{categoryDescription[category] ?? 'Settings group'}</p>
                  </div>

                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {keys.map((key) => {
                      const currentValue = config[key];
                      const isBool = typeof currentValue === 'boolean';
                      const isComplex = Array.isArray(currentValue) || (typeof currentValue === 'object' && currentValue !== null);
                      const value = draft[key] ?? '';
                      const description = schema.settings[key]?.description ?? 'Runtime setting value exposed by backend.';

                      return (
                        <div key={key} className="px-4 py-4">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500 dark:text-slate-400">
                              {prettifyKey(key)}
                            </label>
                            <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{description}</p>
                            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                              Current value: <span className="font-mono">{stringifyValue(currentValue)}</span>
                            </p>
                          </div>

                          <div className="mt-3">
                            {isBool ? (
                              <select
                                className="h-11 w-full border border-slate-300 bg-slate-50 px-3 text-sm text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-100"
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
                                className="w-full border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-[#0f1724] dark:text-slate-100"
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
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          ))}
        </div>
        )}

          <div className="sticky bottom-0 z-20 -mx-6 border-t border-slate-200/80 bg-white/90 px-6 py-4 backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/90 sm:-mx-8 sm:px-8">
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={handleReset} disabled={saving} className="h-11 px-5 ">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button
              disabled={saving}
              type="submit"
              className="h-11  bg-emerald-900 px-6 font-semibold text-white hover:bg-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
            >
              {saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />Save Settings</>}
            </Button>
          </div>
          </div>
        </form>
      </section>
    </div>
  );
}
