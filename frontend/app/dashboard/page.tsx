"use client";

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Sidebar, { DashboardTab } from '@/components/Sidebar';
import LiveMonitoring from '@/components/LiveMonitoring';
import RegistrationManagement from '@/components/RegistrationManagement';
import UsersManagement from '@/components/UsersManagement';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import SettingsPanel from '@/components/SettingsPanel';
import IncidentsManagement from '@/components/IncidentsManagement';
import { clearStoredSession, getStoredSession, type AppSession } from '@/lib/auth';

type Theme = 'light' | 'dark';

interface EventOption {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  date: string;
  capacity: number;
}

function DashboardPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>('live');
  const [theme, setTheme] = useState<Theme>('light');
  const [session, setSession] = useState<AppSession | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const currentSession = getStoredSession();
    if (!currentSession) {
      router.replace('/login');
      return;
    }

    const storedTheme = window.localStorage.getItem('theme') as Theme | null;

    setSession(currentSession);
    const tabFromUrl = searchParams.get('activeTab') as DashboardTab;
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
    setTheme(storedTheme ?? 'light');
    setIsReady(true);
  }, [router, searchParams]);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [isReady, theme]);

  useEffect(() => {
    if (!session) return;
    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) return;

        const loadedEvents = (data.events ?? []) as EventOption[];
        setEvents(loadedEvents);

        if (loadedEvents.length > 0) {
          setSelectedEventId((prev) => prev ?? loadedEvents[0].id);
        }
      } catch {
      }
    };

    loadEvents();
  }, [session]);

  if (!isReady || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 dark:bg-[#111111] dark:text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  const handleLogout = () => {
    clearStoredSession();
    router.push('/login');
  };

  const handleCreateEvent = async (payload: { name: string; location: string; description: string; capacity: number; date: string }) => {
    setCreateEventLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not create event.');

      const event = data.event as EventOption;
      setEvents((prev) => [event, ...prev]);
      setSelectedEventId(event.id);
    } finally {
      setCreateEventLoading(false);
    }
  };

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 transition-colors overflow-hidden dark:bg-[#0a0a0a] dark:text-white md:h-screen md:flex-row">
        <Sidebar
        activeTab={activeTab}
        onTabChange={(t: DashboardTab) => { setActiveTab(t); router.replace(`${pathname}?activeTab=${t}`, { scroll: false }); }}
        theme={theme}
        role={session.role}
        identifier={session.email || session.name || 'Unknown'}
        selectedEventId={selectedEventId}
        events={events.map(({ id, name, location }) => ({ id, name, location }))}
        createEventLoading={createEventLoading}
        onEventChange={(eventId: number) => {
          setSelectedEventId(eventId);
        }}
        onCreateEvent={handleCreateEvent}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto p-3 pb-24 pt-3 sm:p-6 sm:pb-24 md:pb-6">
        {selectedEvent ? (
          <>
            {activeTab === 'live' && <LiveMonitoring event={selectedEvent} />}
            {activeTab === 'registration' && <RegistrationManagement event={selectedEvent} />}
            {activeTab === 'incidents' && <IncidentsManagement />}
            {activeTab === 'analytics' && <AnalyticsDashboard eventId={selectedEvent.id} />}
            {activeTab === 'settings' && <SettingsPanel />}
            {activeTab === 'users' && <UsersManagement />}
          </>
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-[#111111] dark:text-slate-400">
            No event selected. Create an event from the sidebar to continue.
          </div>
        )}
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 dark:bg-[#111111] dark:text-slate-400">
          Loading dashboard...
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
