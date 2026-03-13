"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import GateEntry from '@/components/GateEntry';
import LiveMonitoring from '@/components/LiveMonitoring';
import ManagementAccess from '@/components/ManagementAccess';
import RegistrationManagement from '@/components/RegistrationManagement';
import EventRegistration from '@/components/EventRegistration';
import { clearStoredSession, getStoredSession, type AppSession, type DashboardTab } from '@/lib/auth';

type Theme = 'light' | 'dark';

export default function DashboardPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DashboardTab>('live');
  const [theme, setTheme] = useState<Theme>('dark');
  const [session, setSession] = useState<AppSession | null>(null);
  const [isReady, setIsReady] = useState(false);

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
    if (session?.role !== 'admin' && activeTab === 'access') {
      setActiveTab('live');
    }
  }, [activeTab, session]);

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
    <div className="min-h-screen flex bg-slate-100 text-slate-900 dark:bg-[#0a0a0a] dark:text-white transition-colors">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        role={session.role}
        identifier={session.identifier}
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