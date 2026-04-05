"use client";

import { useEffect, useState } from 'react';
import { getStoredSession } from '@/lib/auth';
import { ShieldAlert, CheckCircle2, Trash2 } from 'lucide-react';

interface Incident {
  id: number;
  type: 'VIOLENCE' | 'RESTRICTED_ZONE' | 'ABNORMAL' | 'MANUAL';
  status: 'OPEN' | 'RESOLVED';
  description: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

export default function IncidentsManagement() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const session = getStoredSession();

  const isAdmin = session?.role === 'ADMIN';

  const fetchIncidents = async () => {
    try {
      const res = await fetch('/api/incidents');
      const data = await res.json();
      if (data.incidents) setIncidents(data.incidents);
    } catch {
      console.error("Failed to fetch incidents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    // Refresh periodically
    const interval = setInterval(fetchIncidents, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResolve = async (id: number) => {
    try {
      setIncidents(prev => prev.map(i => i.id === id ? { ...i, status: 'RESOLVED' } : i));
      await fetch(`/api/incidents/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      });
      fetchIncidents();
    } catch {
      console.error("Failed to resolve incident");
    }
  };

  const handleDelete = async (id: number) => {
    if (!isAdmin) return;
    if (!confirm('Are you sure you want to permanently delete this incident record?')) return;
    try {
      setIncidents(prev => prev.filter(i => i.id !== id));
      await fetch(`/api/incidents/${id}`, { method: 'DELETE' });
    } catch {
      console.error("Failed to delete incident");
    }
  };

  const getTypeStyle = (type: Incident['type']) => {
    switch (type) {
      case 'VIOLENCE':
        return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 border-red-200 dark:border-red-500/30';
      case 'RESTRICTED_ZONE':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400 border-orange-200 dark:border-orange-500/30';
      case 'ABNORMAL':
        return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 border-yellow-200 dark:border-yellow-500/30';
      default:
        return 'bg-slate-100 text-slate-700 dark:bg-slate-500/20 dark:text-slate-400 border-slate-200 dark:border-slate-500/30';
    }
  };

  if (loading) {
    return <div className="p-6 text-slate-500 animate-pulse">Loading incidents...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-8">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-500" />
            Security Incidents Console
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mt-1">Review, resolve, and audit automated threat detections.</p>
        </div>
        
        <div className="flex gap-4">
            <div className="bg-white dark:bg-[#111111] px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-center">
              <span className="block text-xl font-bold text-slate-900 dark:text-white">{incidents.filter(i => i.status === 'OPEN').length}</span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-400">Open Alerts</span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {incidents.length === 0 ? (
          <div className="bg-white dark:bg-[#111111] border border-slate-200 dark:border-slate-800 rounded-2xl p-10 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-lime-50 dark:bg-lime-500/10 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8 text-lime-500" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">All clear</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm">No incidents have been logged by the automated AI analysis pipeline.</p>
          </div>
        ) : (
          incidents.map(incident => (
            <div 
              key={incident.id} 
              className={`bg-white dark:bg-[#111111] border ${incident.status === 'OPEN' ? 'border-l-4 border-l-rose-500 border-y-slate-200 border-r-slate-200 dark:border-y-slate-800 dark:border-r-slate-800 shadow-sm' : 'border-slate-200 dark:border-slate-800 opacity-70'} rounded-xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-6 transition-all`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider rounded border ${getTypeStyle(incident.type)}`}>
                    {incident.type.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-slate-400 font-medium font-mono">
                    {new Date(incident.createdAt).toLocaleString()}
                  </span>
                  {incident.status === 'RESOLVED' && (
                    <span className="text-xs text-lime-600 dark:text-lime-400 flex items-center gap-1 font-medium bg-lime-50 dark:bg-lime-500/10 px-2 py-0.5 rounded">
                      <CheckCircle2 className="w-3 h-3" />
                      Resolved
                    </span>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-white max-w-3xl">
                    {incident.description}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {incident.status === 'OPEN' && (
                  <button 
                    onClick={() => handleResolve(incident.id)}
                    className="px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors whitespace-nowrap dark:bg-white dark:text-black dark:hover:bg-slate-200 shadow-sm"
                  >
                    Mark Resolved
                  </button>
                )}
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(incident.id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors border border-transparent hover:border-rose-200 dark:hover:border-rose-500/30"
                    title="Permanently remove"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
