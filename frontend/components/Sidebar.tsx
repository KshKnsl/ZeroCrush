"use client";

import { motion } from 'motion/react';
import { Activity, CalendarPlus2, KeyRound, LayoutDashboard, LogOut, Moon, Sun, Users } from 'lucide-react';
import { clsx } from 'clsx';
import { type UserRole } from '@/lib/auth';

type Theme = 'light' | 'dark';

export type DashboardTab = 'live' | 'analytics' | 'incidents' | 'settings' | 'users';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  theme: Theme;
  role: UserRole;
  identifier: string;
  onToggleTheme: () => void;
  onLogout: () => void;
}

const tabs: { id: DashboardTab; label: string; icon: typeof Activity; roles: UserRole[] }[] = [
  { id: 'live', label: 'Live Dashboard', icon: Activity, roles: ['ADMIN', 'OPERATOR', 'VIEWER'] },
  { id: 'incidents', label: 'Incidents', icon: Users, roles: ['ADMIN', 'OPERATOR'] },
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
  onToggleTheme,
  onLogout,
}: SidebarProps) {
  const visibleTabs = tabs.filter((tab) => tab.roles.includes(role));

  return (
    <>
      <aside className="hidden md:flex md:w-72 md:h-screen md:sticky md:top-0 border-r border-slate-300/80 bg-slate-50/95 dark:border-slate-700 dark:bg-[#0f141b] flex-col overflow-hidden">
        <div className="p-4 space-y-3">
          <div className="border border-slate-300 bg-slate-100 px-4 py-3 dark:border-slate-700 dark:bg-[#121923]">
            <p className="text-[11px] uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Signed In</p>
            <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{role}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-400 break-all">{identifier}</p>
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
                  'w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all duration-200 border',
                  isActive
                    ? 'bg-emerald-200/80 text-emerald-950 border-emerald-800/50 dark:bg-emerald-950/45 dark:text-emerald-200 dark:border-emerald-700/55'
                    : 'text-slate-600 border-transparent hover:text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400 dark:text-slate-400 dark:hover:text-emerald-200 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-700/45'
                )}
              >
                <Icon className={clsx('w-5 h-5', isActive && 'text-emerald-900 dark:text-emerald-200')} />
                {tab.label}
              </motion.button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-300 dark:border-slate-700 space-y-3">
          <button onClick={onToggleTheme} className="w-full flex items-center justify-between border border-emerald-500/40 bg-emerald-200/70 px-3 py-2 text-xs font-medium text-emerald-950 hover:bg-emerald-300/70 transition-colors dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-900/45">
            <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button onClick={onLogout} className="w-full flex items-center justify-center gap-2 border border-slate-300 bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors dark:border-slate-700 dark:bg-[#121923] dark:text-slate-300 dark:hover:bg-[#17202b]">
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </aside>

      <aside className="fixed inset-x-0 bottom-0 z-40 md:hidden">
        <div className="mx-auto w-full max-w-xl px-3 pb-[max(env(safe-area-inset-bottom),0.6rem)]">
          <div className="rounded-[1.5rem] border border-slate-300/80 bg-slate-50/92 p-2 shadow-[0_18px_32px_-16px_rgba(15,23,42,0.55)] backdrop-blur dark:border-slate-700/80 dark:bg-[#0f141b]/92 dark:shadow-[0_20px_34px_-14px_rgba(0,0,0,0.72)]">
          <nav className="flex items-stretch gap-1 overflow-x-auto pb-1">
            {visibleTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={clsx(
                    'min-w-[72px] flex-1 rounded-xl border px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors',
                    isActive
                      ? 'border-emerald-700/50 bg-emerald-200/80 text-emerald-950 dark:border-emerald-700/60 dark:bg-emerald-950/45 dark:text-emerald-200'
                      : 'border-transparent text-slate-600 hover:border-emerald-400 hover:bg-emerald-100 dark:text-slate-300 dark:hover:border-emerald-700/50 dark:hover:bg-emerald-950/35'
                  )}
                >
                  <span className="flex flex-col items-center gap-1">
                    <Icon className={clsx('h-4 w-4', isActive && 'text-emerald-900 dark:text-emerald-200')} />
                    <span className="truncate max-w-full">{tab.label.replace(' Dashboard', '')}</span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="mt-1 grid grid-cols-2 gap-1">
            <button onClick={onToggleTheme} className="flex items-center justify-center gap-1 rounded-xl border border-emerald-500/40 bg-emerald-200/70 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-emerald-950 transition-colors hover:bg-emerald-300/70 dark:border-emerald-700/50 dark:bg-emerald-950/35 dark:text-emerald-200 dark:hover:bg-emerald-900/45">
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
              Theme
            </button>
            <button onClick={onLogout} className="flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-slate-100 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-700 transition-colors hover:bg-slate-200 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-300 dark:hover:bg-[#17202b]">
              <LogOut className="h-3.5 w-3.5" />
              Logout
            </button>
          </div>
          </div>
        </div>
      </aside>
    </>
  );
}
