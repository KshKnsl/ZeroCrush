"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import GateEntry from '@/components/GateEntry';
import LiveMonitoring from '@/components/LiveMonitoring';
import ManagementAccess from '@/components/ManagementAccess';
import RegistrationManagement from '@/components/RegistrationManagement';
import EventRegistration from '@/components/EventRegistration';
import { clearStoredSession, getStoredSession, getTabsForSession, type AppSession, type DashboardTab, type ManagementTab } from '@/lib/auth';

type Theme = 'light' | 'dark';

interface EventOption {
  id: number;
  type: string;
  plate: string | null;
  description: string | null;
  timestamp: string;
}

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('live');
  const [theme, setTheme] = useState<Theme>('light');
  const [session, setSession] = useState<AppSession | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [createEventLoading, setCreateEventLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const managementTabs: ManagementTab[] = getTabsForSession(session);

  useEffect(() => {
    const currentSession = getStoredSession();
    if (!currentSession) {
      router.replace('/login');
      return;
    }

    const storedTheme = window.localStorage.getItem('theme') as Theme | null;

    setSession(currentSession);
    setTheme(storedTheme ?? 'light');
    setIsReady(true);
  }, [router]);

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

        if (session.role === 'management') {
          if (session.eventId) {
            setSelectedEventId(session.eventId);
          }
          return;
        }

        if (loadedEvents.length > 0) {
          setSelectedEventId((prev) => prev ?? loadedEvents[0].id);
        }
      } catch {
        // ignore fetch failure and keep current UI state
      }
    };

    loadEvents();
  }, [session]);

  useEffect(() => {
    if (!session) return;

    if (session.role === 'admin') {
      return;
    }

    if (activeTab === 'access' || !managementTabs.includes(activeTab as ManagementTab)) {
      setActiveTab(managementTabs[0] ?? 'live');
    }
  }, [activeTab, managementTabs, session]);

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

  const handleCreateEvent = async (payload: { type: string; plate: string; description: string }) => {
    setCreateEventLoading(true);
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Could not create event.');
      }

      const event = data.event as EventOption;
      setEvents((prev) => [event, ...prev]);
      setSelectedEventId(event.id);
    } finally {
      setCreateEventLoading(false);
    }
  };

  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;

  return (
    <div className="h-screen flex bg-slate-100 text-slate-900 dark:bg-[#0a0a0a] dark:text-white transition-colors overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        role={session.role}
        identifier={session.identifier}
        managementRole={session.managementRole}
        availableTabs={managementTabs}
        selectedEventId={selectedEventId}
        events={events.map(({ id, type, plate }) => ({ id, type, plate }))}
        createEventLoading={createEventLoading}
        onEventChange={(eventId) => {
          if (session.role === 'management') return;
          setSelectedEventId(eventId);
        }}
        onCreateEvent={handleCreateEvent}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto p-4 pt-16 sm:p-6 sm:pt-6">
        {selectedEvent ? (
          <>
            {activeTab === 'live' && <LiveMonitoring event={selectedEvent} />}
            {activeTab === 'registration' && <RegistrationManagement event={selectedEvent} />}
            {activeTab === 'gate' && <GateEntry />}
            {activeTab === 'upload' && <EventRegistration eventId={selectedEvent.id} eventName={selectedEvent.type} />}
            {activeTab === 'access' && session.role === 'admin' && <ManagementAccess eventId={selectedEvent.id} eventName={selectedEvent.type} />}
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
