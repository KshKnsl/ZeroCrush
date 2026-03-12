import { motion } from 'framer-motion';
import { Activity, Users, ScanLine, LayoutDashboard } from 'lucide-react';
import { clsx } from 'clsx';

type Tab = 'live' | 'registration' | 'gate';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: 'live', label: 'Live Monitoring', icon: Activity },
  { id: 'registration', label: 'Registration', icon: Users },
  { id: 'gate', label: 'Gate Entry', icon: ScanLine },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 bg-[#0F172A] border-r border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <LayoutDashboard className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm tracking-tight">COMMAND CENTER</h1>
            <p className="text-slate-500 text-xs">Event Operations</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-2">
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
                  ? 'bg-slate-800 text-white border-l-2 border-emerald-500 shadow-lg shadow-emerald-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              )}
            >
              <Icon className={clsx('w-5 h-5', isActive && 'text-emerald-400')} />
              {tab.label}
            </motion.button>
          );
        })}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800">
          <p className="text-slate-500 text-xs mb-2">SYSTEM STATUS</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-emerald-400 text-xs font-mono">ALL SYSTEMS ONLINE</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
