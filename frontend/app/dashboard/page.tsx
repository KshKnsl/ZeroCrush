"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import GateEntry from '@/components/GateEntry';
import LiveMonitoring from '@/components/LiveMonitoring';
import ManagementAccess from '@/components/ManagementAccess';
import RegistrationManagement from '@/components/RegistrationManagement';
import EventRegistration from '@/components/EventRegistration';
import { clearStoredSession, DEFAULT_MANAGEMENT_TABS, getStoredSession, type AppSession, type DashboardTab, type ManagementTab } from '@/lib/auth';

type Theme = 'light' | 'dark';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('live');
  const [theme, setTheme] = useState<Theme>('dark');
  const [session, setSession] = useState<AppSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  const managementTabs: ManagementTab[] = session?.role === 'management'
    ? (session.allowedTabs && session.allowedTabs.length > 0 ? session.allowedTabs : DEFAULT_MANAGEMENT_TABS)
    : DEFAULT_MANAGEMENT_TABS;

  useEffect(() => {
    const currentSession = getStoredSession();
    if (!currentSession) {
      router.replace('/login');
      return;
    }

    const storedTheme = window.localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    setSession(currentSession);
    setTheme(storedTheme ?? (systemDark ? 'dark' : 'light'));
    setIsReady(true);
  }, [router]);

  useEffect(() => {
    if (!isReady) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [isReady, theme]);

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
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500 dark:bg-slate-950 dark:text-slate-400">
        Loading dashboard...
      </div>
    );
  }

  const handleLogout = () => {
    clearStoredSession();
    router.push('/login');
  };

  return (
    <div className="h-screen flex bg-slate-100 text-slate-900 dark:bg-[#0a0a0a] dark:text-white transition-colors overflow-hidden">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        role={session.role}
        identifier={session.identifier}
        availableTabs={managementTabs}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'live' && <LiveMonitoring />}
        {activeTab === 'registration' && <RegistrationManagement />}
        {activeTab === 'gate' && <GateEntry />}
        {activeTab === 'upload' && <EventRegistration />}
        {activeTab === 'access' && session.role === 'admin' && <ManagementAccess />}
      </main>
    </div>
  );
}