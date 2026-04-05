"use client";

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Sidebar, { DashboardTab } from '@/components/Sidebar';
import LiveMonitoring from '@/components/LiveMonitoring';
import UsersManagement from '@/components/UsersManagement';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import SettingsPanel from '@/components/SettingsPanel';
import IncidentsManagement from '@/components/IncidentsManagement';
import { clearStoredSession, getStoredSession, type AppSession } from '@/lib/auth';

type Theme = 'light' | 'dark';

function DashboardPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<DashboardTab>('live');
  const [theme, setTheme] = useState<Theme>('light');
  const [session, setSession] = useState<AppSession | null>(null);
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900 transition-colors overflow-hidden dark:bg-[#0a0a0a] dark:text-white md:h-screen md:flex-row">
      <Sidebar
        activeTab={activeTab}
        onTabChange={(t: DashboardTab) => { setActiveTab(t); router.replace(`${pathname}?activeTab=${t}`, { scroll: false }); }}
        theme={theme}
        role={session.role}
        identifier={session.email || session.name || 'Unknown'}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto p-3 pb-24 pt-3 sm:p-6 sm:pb-24 md:pb-6">
        {activeTab === 'live' && <LiveMonitoring />}
        {activeTab === 'incidents' && <IncidentsManagement />}
        {activeTab === 'analytics' && <AnalyticsDashboard />}
        {activeTab === 'settings' && <SettingsPanel />}
        {activeTab === 'users' && <UsersManagement />}
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
