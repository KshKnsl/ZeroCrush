"use client";

import Link from 'next/link';
import { useState } from 'react';
import { motion } from 'motion/react';
import { Activity, CalendarPlus2, KeyRound, LayoutDashboard, LogOut, Moon, ScanLine, Sun, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { type UserRole } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Theme = 'light' | 'dark';

interface EventOption {
  id: number;
  name: string;
  location: string | null;
}

export type DashboardTab = 'live' | 'registration' | 'analytics' | 'incidents' | 'settings' | 'users';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  theme: Theme;
  role: UserRole;
  identifier: string;
  selectedEventId: number | null;
  events: EventOption[];
  createEventLoading: boolean;
  onEventChange: (eventId: number) => void;
  onCreateEvent: (payload: { name: string; location: string; description: string; capacity: number; date: string }) => Promise<void>;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const tabs: { id: DashboardTab; label: string; icon: typeof Activity; roles: UserRole[] }[] = [
  { id: 'live', label: 'Live Dashboard', icon: Activity, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { id: 'incidents', label: 'Incidents', icon: ScanLine, roles: ['ADMIN', 'OPERATOR'] },
  { id: 'registration', label: 'Events & Registrations', icon: Users, roles: ['ADMIN', 'OPERATOR'] },
  { id: 'analytics', label: 'Analytics', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { id: 'settings', label: 'Settings', icon: CalendarPlus2, roles: ['ADMIN'] },
  { id: 'users', label: 'Users', icon: KeyRound, roles: ['ADMIN'] },
];

export default function Sidebar({
  activeTab,
  onTabChange,
  theme,
  role,
  identifier,
  selectedEventId,
  events,
  createEventLoading,
  onEventChange,
  onCreateEvent,
  onToggleTheme,
  onLogout,
}: SidebarProps) {
  const visibleTabs = tabs.filter((tab) => tab.roles.includes(role));
  const [showDialog, setShowDialog] = useState(false);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [capacity, setCapacity] = useState('0');
  const [date, setDate] = useState(new Date(Date.now() + 86_400_000).toISOString().slice(0, 16));
  const [error, setError] = useState('');

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  const submitCreateEvent = async () => {
    if (!name.trim()) {
      setError('Event name is required.');
      return;
    }

    try {
      setError('');
      await onCreateEvent({
        name: name.trim(),
        location: location.trim(),
        description: description.trim(),
        capacity: Number(capacity) || 0,
        date: new Date(date).toISOString(),
      });

      setName('');
      setLocation('');
      setDescription('');
      setCapacity('0');
      setShowDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
    }
  };

  return (
    <>
      <aside className="hidden md:flex md:w-72 md:h-screen md:sticky md:top-0 border-r border-slate-200 bg-white/90 dark:border-[#1e1e1e] dark:bg-[#0a0a0a] flex-col overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1e1e1e] dark:bg-[#111111]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Signed In</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{role}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-[#666666] break-all">{identifier}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-[#1e1e1e] dark:bg-[#111111]">
            <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Current Event</p>
            <Select value={selectedEventId ? String(selectedEventId) : undefined} onValueChange={(value) => onEventChange(Number(value))} disabled={events.length === 0}>
              <SelectTrigger className="w-full rounded-xl border-slate-300 bg-white text-xs font-medium text-slate-700 dark:border-[#2a2a2a] dark:bg-[#0c0c0c] dark:text-[#dddddd]">
                <SelectValue placeholder="No events" />
              </SelectTrigger>
              <SelectContent>
                {events.map((event) => (
                  <SelectItem key={event.id} value={String(event.id)}>
                    {event.name}{event.location ? ` · ${event.location}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-[#666666]">{selectedEvent ? `Event #${selectedEvent.id}` : 'Create an event to continue'}</p>
            {role !== 'VIEWER' ? (
              <button
                onClick={() => setShowDialog(true)}
                className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-lime-300 bg-lime-50 px-3 py-2 text-xs font-medium text-lime-700 hover:bg-lime-100 transition-colors dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-300"
              >
                <CalendarPlus2 className="w-4 h-4" />
                Create Event
              </button>
            ) : null}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {visibleTabs.map((tab) => {
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

          <Link href="/qrtokens" className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#666666] dark:hover:text-white dark:hover:bg-[#111111]">
            <Users className="w-5 h-5" />
            QR Tokens & Gate
          </Link>
        </nav>

        <div className="p-4 border-t border-slate-200 dark:border-[#1e1e1e] space-y-3">
          <button onClick={onToggleTheme} className="w-full flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#777777] dark:hover:bg-[#151515]">
            <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#bbbbbb] dark:hover:bg-[#151515]">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="md:hidden sticky top-0 z-30 border-b border-slate-200 bg-white/95 px-3 py-3 backdrop-blur dark:border-[#1e1e1e] dark:bg-[#0a0a0a]/95">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Signed In</p>
            <p className="mt-1 truncate text-sm font-semibold text-slate-900 dark:text-white">{role}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-[#666666]">{identifier}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onToggleTheme} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#bbbbbb]" title={theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}>
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={onLogout} className="rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-2 text-xs text-slate-700 dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#bbbbbb]" title="Logout">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-2">
          <Select value={selectedEventId ? String(selectedEventId) : undefined} onValueChange={(value) => onEventChange(Number(value))} disabled={events.length === 0}>
            <SelectTrigger className="w-full rounded-xl border-slate-300 bg-white text-xs font-medium text-slate-700 dark:border-[#2a2a2a] dark:bg-[#0c0c0c] dark:text-[#dddddd]">
              <SelectValue placeholder="No events" />
            </SelectTrigger>
            <SelectContent>
              {events.map((event) => (
                <SelectItem key={event.id} value={String(event.id)}>
                  {event.name}{event.location ? ` · ${event.location}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {role !== 'VIEWER' ? (
            <button onClick={() => setShowDialog(true)} className="shrink-0 rounded-lg border border-lime-300 bg-lime-50 px-3 py-2 text-xs font-medium text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-300">
              <CalendarPlus2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>

        <div className="mt-3 flex items-center gap-1 overflow-x-auto">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => onTabChange(tab.id)} className={clsx('flex min-w-20 flex-col items-center justify-center rounded-lg px-2 py-2 text-[10px] font-medium transition-colors', isActive ? 'bg-lime-100 text-slate-900 dark:bg-lime-500/15 dark:text-[#c8f04a]' : 'text-slate-500 dark:text-[#777777]')}>
                <Icon className={clsx('mb-1 h-4 w-4', isActive && 'text-lime-500 dark:text-[#c8f04a]')} />
                <span className="truncate leading-tight">{tab.label.split(' ')[0]}</span>
              </button>
            );
          })}
          <Link href="/qrtokens" className="flex min-w-20 flex-col items-center justify-center rounded-lg px-2 py-2 text-[10px] font-medium transition-colors text-slate-500 dark:text-[#777777]">
            <Users className="mb-1 h-4 w-4" />
            <span className="truncate leading-tight">Tokens</span>
          </Link>
        </div>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-[#111111] dark:text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Create Event</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400">This event will become available in the event dropdown.</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Event Name</label>
              <Input value={name} onChange={(event) => setName(event.target.value)} className="rounded-xl border-slate-300 bg-slate-50 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Location</label>
              <Input value={location} onChange={(event) => setLocation(event.target.value)} className="rounded-xl border-slate-300 bg-slate-50 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div>
              <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Description</label>
              <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} className="w-full resize-none rounded-xl border border-slate-300 bg-slate-50 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/20 focus:border-lime-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Capacity</label>
                <Input type="number" min="0" value={capacity} onChange={(event) => setCapacity(event.target.value)} className="rounded-xl border-slate-300 bg-slate-50 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
              <div>
                <label className="mb-1 block text-xs uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Date</label>
                <Input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-xl border-slate-300 bg-slate-50 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100" />
              </div>
            </div>
          </div>

          {error ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">{error}</div> : null}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={submitCreateEvent} disabled={createEventLoading}>{createEventLoading ? 'Creating...' : 'Create Event'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
