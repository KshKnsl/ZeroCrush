"use client";

import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Activity, CalendarPlus2, KeyRound, LayoutDashboard, LogOut, Moon, Sun } from 'lucide-react';
import LiveMonitoring from '@/components/dashboard-tabs/LiveMonitoring';
import UsersManagement from '@/components/dashboard-tabs/UsersManagement';
import AnalyticsDashboard from '@/components/dashboard-tabs/AnalyticsDashboard';
import SettingsPanel from '@/components/dashboard-tabs/SettingsPanel';
import { useThemeContext } from '@/components/ui/ThemeContext';

const tabs: { id: string; icon: typeof Activity; roles: string[] }[] = [
  { id: 'Live', icon: Activity, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { id: 'Analytics', icon: LayoutDashboard, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { id: 'Settings', icon: CalendarPlus2, roles: ['ADMIN'] },
  { id: 'Users', icon: KeyRound, roles: ['ADMIN'] },
];

function LoadingShell() {
  return (
    <div className="min-h-dvh px-4 py-4">
      <div className="mx-auto w-full max-w-xl space-y-3  border border-slate-300/70 bg-white/70 p-4 backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/70">
        <div className="h-4 w-36 animate-pulse  bg-slate-200 dark:bg-slate-700" />
        <div className="h-20 animate-pulse  bg-slate-200/80 dark:bg-slate-800/70" />
        <div className="h-56 animate-pulse  bg-slate-200/80 dark:bg-slate-800/70" />
      </div>
    </div>
  );
}

function DashboardPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, status } = useSession();
  const { theme, toggleTheme, ready: themeReady } = useThemeContext();
  const [activeTab, setActiveTab] = useState<string>('Live');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') return void router.replace('/');
    if (status !== 'authenticated') return;

    const tabFromUrl = searchParams.get('activeTab') as string;
    if (tabFromUrl) setActiveTab(tabFromUrl);
    setIsReady(true);
  }, [router, searchParams, status]);

  if (status === 'loading' || !isReady || !themeReady) return <LoadingShell />;
  if (status !== 'authenticated') return null;

  const role = ((data?.user as { role?: string } | undefined)?.role ?? 'VIEWER') as string;
  const identifier = data?.user?.email || data?.user?.name || 'Unknown';
  const visibleTabs = tabs.filter((tab) => tab.roles.includes(role));
  const isDark = theme === 'dark';

  const panelByTab: Record<string, ReactNode> = {
    Live: <LiveMonitoring />,
    Analytics: <AnalyticsDashboard />,
    Settings: <SettingsPanel />,
    Users: <UsersManagement />,
  };

  const onTabChange = (tab: string) => {
    setActiveTab(tab);
    router.replace(`${pathname}?activeTab=${tab}`, { scroll: false });
  };

  const onToggleTheme = () => toggleTheme();

  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/');
  };

  const renderTabButton = (tab: (typeof tabs)[number], mobile = false) => {
    const Icon = tab.icon;
    const isActive = activeTab === tab.id;

    const buttonClass = mobile
      ? clsx(
          'min-w-[72px] flex-1  border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
          isActive
            ? 'border-emerald-700/50 bg-emerald-200/80 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/45 dark:text-emerald-200'
            : 'border-transparent text-slate-600 hover:border-emerald-400 hover:bg-emerald-100 dark:text-slate-300 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-950/35'
        )
      : clsx(
          'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border',
          isActive
            ? 'bg-emerald-200/80 text-emerald-950 border-emerald-800/50 dark:bg-emerald-950/45 dark:text-emerald-200 dark:border-emerald-700/55'
            : 'text-slate-600 border-transparent hover:text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400 dark:text-slate-400 dark:hover:text-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700/45'
        );

    const content = (
      <>
        <Icon className={clsx(mobile ? 'h-4 w-4' : 'w-5 h-5', isActive && 'text-emerald-900 dark:text-emerald-200')} />
        {mobile ? (
          <span className="truncate max-w-full">{tab.id}</span>
        ) : (
          tab.id
        )}
      </>
    );

    if (mobile) {
      return (
        <button key={tab.id} onClick={() => onTabChange(tab.id)} className={buttonClass}>
          <span className="flex flex-col items-center gap-1">{content}</span>
        </button>
      );
    }

    return (
      <motion.button key={tab.id} onClick={() => onTabChange(tab.id)} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }} className={buttonClass}>
        {content}
      </motion.button>
    );
  };

  return (
    <div className="min-h-dvh flex flex-col text-slate-900 transition-colors dark:text-white md:h-screen md:flex-row">
      <header className="sticky top-0 z-30 border-b border-slate-300/70 bg-white/80 px-4 py-3 backdrop-blur md:hidden dark:border-slate-700/70 dark:bg-[#0f141b]/85">
        <div className="mx-auto flex w-full max-w-xl items-center justify-between">
          <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">SmartMonitor</p>
          </div>
          <div className=" border border-slate-300/80 bg-white/80 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-600 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-300">
            {activeTab}
          </div>
        </div>
      </header>

      <aside className="hidden md:flex md:w-72 md:h-screen md:sticky md:top-0 border-r border-slate-300/80 bg-slate-50/95 dark:border-slate-700 dark:bg-[#0f141b] flex-col overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="border border-slate-300 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-[#121923]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Signed In</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{role}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 break-all">{identifier}</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">{visibleTabs.map((tab) => renderTabButton(tab))}</nav>

        <div className="p-4 border-t border-slate-300 dark:border-slate-700 space-y-3">
          <button onClick={onToggleTheme} className="w-full flex items-center justify-between border border-emerald-500/40 bg-emerald-200/70 px-3 py-2 text-xs font-medium text-emerald-950 hover:bg-emerald-300/70 transition-colors dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-900/45">
            <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors dark:border-slate-700 dark:bg-[#121923] dark:text-slate-300 dark:hover:bg-[#17202b]">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <aside className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="mx-auto w-full max-w-xl px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
          <div className="border border-slate-300/80 bg-slate-50/92 p-2 shadow-[0_18px_32px_-16px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-700/80 dark:bg-[#0f141b]/92 dark:shadow-[0_20px_34px_-14px_rgba(0,0,0,0.72)]">
            <nav className="flex items-stretch gap-1 overflow-x-auto pb-1">{visibleTabs.map((tab) => renderTabButton(tab, true))}</nav>

            <div className="mt-1 grid grid-cols-2 gap-1">
              <button onClick={onToggleTheme} className="flex items-center justify-center gap-1  border border-emerald-500/40 bg-emerald-200/70 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-950 transition-colors hover:bg-emerald-300/70 dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-900/45">
                {isDark ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
                Theme
              </button>
              <button onClick={handleLogout} className="flex items-center justify-center gap-1  border border-slate-300 bg-slate-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-300 dark:hover:bg-[#17202b]">
                <LogOut className="h-3.5 w-3.5" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </aside>
      <main className="flex-1 overflow-auto px-3 pb-28 pt-3 sm:px-5 md:pb-8 md:pt-5">
        <div className="mx-auto w-full max-w-7xl border border-slate-300/70 bg-white/70 p-3 shadow-[0_26px_50px_-24px_rgba(15,23,42,0.45)] backdrop-blur dark:border-slate-700/60 dark:bg-[#0f141b]/70 dark:shadow-[0_26px_52px_-22px_rgba(0,0,0,0.7)] sm:p-4 md:p-5">{panelByTab[activeTab]}</div>
      </main>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingShell />}>
      <DashboardPageContent />
    </Suspense>
  );
}
