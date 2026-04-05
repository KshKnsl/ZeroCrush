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
    <aside className="hidden md:flex md:w-72 md:h-screen md:sticky md:top-0 border-r border-slate-200 bg-white/90 dark:border-[#1e1e1e] dark:bg-[#0a0a0a] flex-col overflow-hidden">
      <div className="p-4 space-y-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1e1e1e] dark:bg-[#111111]">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Signed In</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{role}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#666666] break-all">{identifier}</p>
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
  );
}
