import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, LayoutDashboard, BarChart3, Bell, Settings } from 'lucide-react';
import { SmartWatchAlertsPanel, SmartWatchAnalyticsPanel, SmartWatchDashboardPanel, SmartWatchSettingsPanel } from '@/components/smartwatch-panels';
import RiskMeter from './RiskMeter';

interface LiveMonitoringEvent {
  id: number;
  type: string;
  plate: string | null;
  description: string | null;
  timestamp: string;
}

interface LiveMonitoringProps {
  event: LiveMonitoringEvent;
}

type LiveMonitoringTab = 'dashboard' | 'analytics' | 'alerts' | 'settings';

const tabs: { id: LiveMonitoringTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'alerts', label: 'Alerts', icon: Bell },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function LiveMonitoring({ event }: LiveMonitoringProps) {
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MED' | 'HIGH'>('LOW');
  const [liveCount, setLiveCount] = useState(1247);
  const [activeTab, setActiveTab] = useState<LiveMonitoringTab>('dashboard');

  const activeTabObj = tabs.find(t => t.id === activeTab);

  const renderContent = () => {
    switch (activeTab) {
      case 'analytics':
        return <SmartWatchAnalyticsPanel />;
      case 'alerts':
        return <SmartWatchAlertsPanel />;
      case 'settings':
        return <SmartWatchSettingsPanel />;
      case 'dashboard':
      default:
        return <SmartWatchDashboardPanel />;
    }
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, }}
        className="app-panel flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-wrap items-center gap-4 lg:gap-6">
          <div>
            <p className="app-muted text-xs uppercase tracking-wider">Active Event</p>
            <h2 className="app-heading font-bold text-lg">{event.type}</h2>
            <p className="app-muted text-[11px] mt-0.5">
              {event.plate ? `${event.plate} · ` : ''}Event #{event.id}
            </p>
          </div>
          <div className="hidden h-10 w-px bg-slate-300 dark:bg-[#2a2a2a] lg:block" />
          <div className="flex items-center gap-2">
            <span className="app-heading font-mono text-sm">{liveCount.toLocaleString()}</span>
            <span className="app-muted text-xs">in venue</span>
          </div>
          <div className="hidden h-10 w-px bg-slate-300 dark:bg-[#2a2a2a] lg:block" />
          <RiskMeter level={riskLevel} />
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2 flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-lime-500 text-white shadow-lg dark:bg-lime-600'
                  : 'bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
}
