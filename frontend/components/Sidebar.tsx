"use client";

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, ScanLine, LayoutDashboard, Moon, Sun, KeyRound, LogOut, CalendarPlus2 } from 'lucide-react';
import { clsx } from 'clsx';
import { getRoleDefinition, type DashboardTab, type ManagementTab, type UserRole, type VenueRole } from '@/lib/auth';

type Theme = 'light' | 'dark';

interface EventOption {
  id: number;
  type: string;
  plate: string | null;
}

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  theme: Theme;
  role: UserRole;
  identifier: string;
  managementRole?: VenueRole;
  availableTabs?: ManagementTab[];
  selectedEventId: number | null;
  events: EventOption[];
  createEventLoading: boolean;
  onEventChange: (eventId: number) => void;
  onCreateEvent: (payload: { type: string; plate: string; description: string }) => Promise<void>;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const baseTabs: { id: DashboardTab; label: string; icon: typeof Activity }[] = [
  { id: 'live', label: 'Live Monitoring', icon: Activity },
  { id: 'registration', label: 'Registration', icon: Users },
  { id: 'gate', label: 'Gate Entry', icon: ScanLine },
  { id: 'upload', label: 'CSV Upload', icon: LayoutDashboard },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  theme,
  role,
  identifier,
  managementRole,
  availableTabs,
  selectedEventId,
  events,
  createEventLoading,
  onEventChange,
  onCreateEvent,
  onToggleTheme,
  onLogout,
}: SidebarProps) {
  const tabs = role === 'admin'
    ? [{ id: 'access' as DashboardTab, label: 'Roles & Teams', icon: KeyRound }, ...baseTabs]
    : baseTabs.filter((tab) => (availableTabs ?? []).includes(tab.id as ManagementTab));

  const managementRoleLabel = role === 'management' ? getRoleDefinition(managementRole).label : null;

  const [showDialog, setShowDialog] = useState(false);
  const [eventType, setEventType] = useState('');
  const [eventPlate, setEventPlate] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [dialogError, setDialogError] = useState('');

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  const submitCreateEvent = async () => {
    if (!eventType.trim()) {
      setDialogError('Event name is required.');
      return;
    }

    setDialogError('');
    try {
      await onCreateEvent({
        type: eventType.trim(),
        plate: eventPlate.trim(),
        description: eventDescription.trim(),
      });

      setEventType('');
      setEventPlate('');
      setEventDescription('');
      setShowDialog(false);
    } catch (error) {
      setDialogError(error instanceof Error ? error.message : 'Failed to create event.');
    }
  };

  return (
    <>
      <aside className="w-72 h-screen sticky top-0 border-r border-slate-200 bg-white/90 dark:border-[#1e1e1e] dark:bg-[#0a0a0a] flex flex-col transition-colors overflow-hidden">
        <div className="px-4 pt-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1e1e1e] dark:bg-[#111111] transition-colors">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Signed In</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{role === 'admin' ? 'Admin' : managementRoleLabel}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#666666] break-all">{identifier}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1e1e1e] dark:bg-[#111111]">
            <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Current Event</p>
            <select
              value={selectedEventId ?? ''}
              onChange={(event) => onEventChange(Number(event.target.value))}
              disabled={role === 'management'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2a2a2a] dark:bg-[#0c0c0c] dark:text-[#dddddd]"
              title="Select event"
            >
              {events.length === 0 ? <option value="">No events</option> : null}
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.type}{event.plate ? ` · ${event.plate}` : ''}
                </option>
              ))}
            </select>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-[#666666]">
              {selectedEvent ? `Event #${selectedEvent.id}` : 'Create an event to continue'}
            </p>
            {role === 'admin' ? (
              <button
                onClick={() => {
                  setDialogError('');
                  setShowDialog(true);
                }}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-lime-300 bg-lime-50 px-3 py-2 text-xs font-medium text-lime-700 hover:bg-lime-100 transition-colors dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-300"
              >
                <CalendarPlus2 className="w-4 h-4" />
                Create Event
              </button>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <motion.button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                whileHover={{ x: 4 }}
                whileTap={{ scale: 0.98 }}
                className={clsx(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-lime-100 text-slate-900 border-l-2 border-lime-500 shadow-sm dark:bg-lime-500/15 dark:text-[#c8f04a] dark:shadow-lg dark:shadow-lime-500/10'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#666666] dark:hover:text-white dark:hover:bg-[#111111]'
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive && 'text-lime-500 dark:text-[#c8f04a]')} />
                {tab.label}
              </motion.button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-[#1e1e1e] space-y-3">
          <button
            onClick={onToggleTheme}
            className="w-full flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#777777] dark:hover:bg-[#151515]"
          >
            <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="rounded-lg p-4 border border-slate-200 bg-slate-50 dark:border-[#1e1e1e] dark:bg-[#111111] transition-colors">
            <p className="app-muted text-xs mb-2">SYSTEM STATUS</p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
              <span className="text-lime-600 dark:text-[#c8f04a] text-xs font-mono">ALL SYSTEMS ONLINE</span>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#bbbbbb] dark:hover:bg-[#151515]"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <AnimatePresence>
        {showDialog ? (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111111]"
            >
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create Event</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">This event will become available in the event dropdown.</p>

              <div className="mt-5 space-y-3">
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Event Name</label>
                  <input
                    value={eventType}
                    onChange={(event) => setEventType(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Reference</label>
                  <input
                    value={eventPlate}
                    onChange={(event) => setEventPlate(event.target.value)}
                    className="w-full rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Description</label>
                  <textarea
                    rows={3}
                    value={eventDescription}
                    onChange={(event) => setEventDescription(event.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>

              {dialogError ? (
                <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                  {dialogError}
                </div>
              ) : null}

              <div className="mt-5 flex justify-end gap-2">
                <button
                  onClick={() => setShowDialog(false)}
                  className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={submitCreateEvent}
                  disabled={createEventLoading}
                  className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
                >
                  {createEventLoading ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
