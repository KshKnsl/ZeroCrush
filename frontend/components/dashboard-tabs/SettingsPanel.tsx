"use client";

import { useEffect, useState } from 'react';
import { Settings, Save } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { backendUrl } from '@/lib/api';

export default function SettingsPanel() {
  const apiUrl = backendUrl();
  const [config, setConfig] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/config`);
        const data = await res.json();
        setConfig(data);
      } catch (err) {
        console.error("Failed to fetch settings", err);
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
    
    // Convert numbered string values back to proper types where needed
    const payload = { ...config };
    if (typeof payload['FRAME_WIDTH'] !== 'undefined') payload['FRAME_WIDTH'] = Number(payload['FRAME_WIDTH']);
    if (typeof payload['DATA_RECORD_RATE'] !== 'undefined') payload['DATA_RECORD_RATE'] = Number(payload['DATA_RECORD_RATE']);
    if (typeof payload['CROWD_DENSITY_THRESHOLD'] !== 'undefined') payload['CROWD_DENSITY_THRESHOLD'] = Number(payload['CROWD_DENSITY_THRESHOLD']);

    try {
      const res = await fetch(`${apiUrl}/api/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setMessage('Settings successfully saved to AI pipeline.');
      } else {
        setMessage('Failed to save settings.');
      }
    } catch {
      setMessage('Network error while saving settings.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500 animate-pulse">Loading configuration...</div>;
  }

  // Filter out non-uppercase keys as per python convention
  const settingsKeys = Object.keys(config).filter(k => /^[A-Z_]+$/.test(k));

  return (
    <div className="max-w-2xl bg-white border border-slate-200 rounded-3xl dark:bg-[#111111] dark:border-slate-800 p-8 shadow-sm">
      <div className="flex items-center gap-3 mb-8 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="bg-lime-500/20 text-lime-600 dark:text-lime-400 p-3 rounded-2xl">
          <Settings className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">AI Engine Configuration</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-1">Modify global parameters for the surveillance system. Changes will apply on the next pipeline cycle.</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {settingsKeys.map((key) => {
            const val = config[key];
            const isBool = typeof val === 'boolean';
            const isList = Array.isArray(val);
            
            if (isList) return null; // Skipping complex list configs for simple UI

            return (
              <div key={key}>
                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-2 block dark:text-slate-400">
                  {key.replace(/_/g, ' ')}
                </label>
                {isBool ? (
                  <select
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-4 py-2 text-sm text-slate-900 focus:outline-none focus:border-lime-500 dark:border-slate-700 dark:bg-[#151515] dark:text-slate-100"
                    value={val ? 'true' : 'false'}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value === 'true' })}
                  >
                    <option value="true">Enabled</option>
                    <option value="false">Disabled</option>
                  </select>
                ) : (
                  <Input
                    type={typeof val === 'number' ? 'number' : 'text'}
                    value={val ?? ''}
                    onChange={(e) => setConfig({ ...config, [key]: e.target.value })}
                    className="bg-slate-50 border-slate-200 dark:bg-[#151515] dark:border-slate-800 font-mono text-sm"
                  />
                )}
              </div>
            );
          })}
        </div>

        {message && (
          <div className={`p-4 text-sm font-medium rounded-xl border ${message.includes('success') ? 'bg-lime-50 text-lime-700 border-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/20' : 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'}`}>
            {message}
          </div>
        )}

        <div className="pt-6 mt-6 border-t border-slate-100 dark:border-slate-800 flex justify-end">
          <Button disabled={saving} type="submit" className="bg-lime-500 text-lime-950 hover:bg-lime-600 font-semibold px-8 h-12 dark:bg-lime-500/20 dark:text-lime-300 dark:hover:bg-lime-500/30">
            {saving ? 'Saving...' : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Commit Configuration
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
