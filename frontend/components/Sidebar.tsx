import { motion } from 'framer-motion';
import { Activity, Users, ScanLine, LayoutDashboard, Moon, Sun, KeyRound, LogOut } from 'lucide-react';
import { clsx } from 'clsx';
import type { DashboardTab, ManagementTab, UserRole } from '@/lib/auth';

type Theme = 'light' | 'dark';

interface SidebarProps {
  activeTab: DashboardTab;
  onTabChange: (tab: DashboardTab) => void;
  theme: Theme;
  role: UserRole;
  identifier: string;
  availableTabs?: ManagementTab[];
  onToggleTheme: () => void;
  onLogout: () => void;
}

const baseTabs: { id: DashboardTab; label: string; icon: typeof Activity }[] = [
  { id: 'live', label: 'Live Monitoring', icon: Activity },
  { id: 'registration', label: 'Registration', icon: Users },
  { id: 'gate', label: 'Gate Entry', icon: ScanLine },
  { id: 'upload', label: 'CSV Upload', icon: LayoutDashboard },
];

export default function Sidebar({ activeTab, onTabChange, theme, role, identifier, availableTabs, onToggleTheme, onLogout }: SidebarProps) {
  const tabs = role === 'admin'
    ? [{ id: 'access' as DashboardTab, label: 'Access Control', icon: KeyRound }, ...baseTabs]
    : baseTabs.filter((tab) => (availableTabs ?? []).includes(tab.id as ManagementTab));

  return (
    <aside className="w-64 h-screen sticky top-0 border-r border-slate-200 bg-white/90 dark:border-[#1e1e1e] dark:bg-[#0a0a0a] flex flex-col transition-colors overflow-hidden">
      <div className="p-6 border-b border-slate-200 dark:border-[#1e1e1e]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-lime-500 to-lime-600 flex items-center justify-center shadow-lg shadow-lime-500/20">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="app-heading font-bold text-sm tracking-tight">COMMAND CENTER</h1>
            <p className="app-muted text-xs">Event Operations</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-[#1e1e1e] dark:bg-[#111111] transition-colors">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-[#555555]">Signed In</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-white">{role === 'admin' ? 'Admin' : 'Management'}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-[#666666] break-all">{identifier}</p>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        {tabs.map((tab) => {
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
        <button
          onClick={onToggleTheme}
          className="w-full flex items-center justify-between rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#777777] dark:hover:bg-[#151515]"
        >
          <span>{theme === 'dark' ? 'Switch to Light' : 'Switch to Dark'}</span>
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
        <div className="rounded-lg p-4 border border-slate-200 bg-slate-50 dark:border-[#1e1e1e] dark:bg-[#111111] transition-colors">
          <p className="app-muted text-xs mb-2">SYSTEM STATUS</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-lime-500 animate-pulse" />
            <span className="text-lime-600 dark:text-[#c8f04a] text-xs font-mono">ALL SYSTEMS ONLINE</span>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors dark:border-[#2a2a2a] dark:bg-[#111111] dark:text-[#bbbbbb] dark:hover:bg-[#151515]"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
