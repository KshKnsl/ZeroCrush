"use client";

import { Suspense, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Sidebar, { DashboardTab } from '@/components/Sidebar';
import LiveMonitoring from '@/components/dashboard-tabs/LiveMonitoring';
import UsersManagement from '@/components/dashboard-tabs/UsersManagement';
import AnalyticsDashboard from '@/components/dashboard-tabs/AnalyticsDashboard';
import SettingsPanel from '@/components/dashboard-tabs/SettingsPanel';
import IncidentsManagement from '@/components/dashboard-tabs/IncidentsManagement';
import { clearStoredSession, getStoredSession, ROLE_LABELS, type AppSession } from '@/lib/auth';

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
      router.replace('/');
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
      <div className="min-h-dvh px-4 py-4">
        <div className="mx-auto w-full max-w-xl space-y-3 rounded-3xl border border-slate-300/70 bg-white/70 p-4 backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/70">
          <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
          <div className="h-20 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70" />
          <div className="h-56 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70" />
        </div>
      </div>
    );
  }

  const handleLogout = () => {
    clearStoredSession();
    router.push('/');
  };

  return (
    <div className="min-h-dvh flex flex-col text-slate-900 transition-colors dark:text-white md:h-screen md:flex-row">
      <header className="sticky top-0 z-30 border-b border-slate-300/70 bg-white/80 px-4 py-3 backdrop-blur md:hidden dark:border-slate-700/70 dark:bg-[#0f141b]/85">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">ZeroCrush</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{ROLE_LABELS[session.role]} Console</p>
          </div>
          <div className="rounded-full border border-slate-300/80 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-300">
            {activeTab}
          </div>
        </div>
      </header>

      <Sidebar
        activeTab={activeTab}
        onTabChange={(t: DashboardTab) => { setActiveTab(t); router.replace(`${pathname}?activeTab=${t}`, { scroll: false }); }}
        theme={theme}
        role={session.role}
        identifier={session.email || session.name || 'Unknown'}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
        onLogout={handleLogout}
      />
      <main className="flex-1 overflow-auto px-3 pb-28 pt-3 sm:px-5 md:pb-8 md:pt-5">
        <div className="mx-auto w-full max-w-7xl rounded-[1.35rem] border border-slate-300/70 bg-white/70 p-3 shadow-[0_26px_50px_-24px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-[#0f141b]/70 dark:shadow-[0_26px_52px_-22px_rgba(0,0,0,0.7)] sm:p-4 md:p-5">
          {activeTab === 'live' && <LiveMonitoring />}
          {activeTab === 'incidents' && <IncidentsManagement />}
          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'settings' && <SettingsPanel />}
          {activeTab === 'users' && <UsersManagement />}
        </div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh px-4 py-4">
          <div className="mx-auto w-full max-w-xl space-y-3 rounded-3xl border border-slate-300/70 bg-white/70 p-4 backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/70">
            <div className="h-4 w-36 animate-pulse rounded-full bg-slate-200 dark:bg-slate-700" />
            <div className="h-20 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70" />
            <div className="h-56 animate-pulse rounded-2xl bg-slate-200/80 dark:bg-slate-800/70" />
          </div>
        </div>
      }
    >
      <DashboardPageContent />
    </Suspense>
  );
}
