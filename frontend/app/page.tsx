"use client"
import { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import LiveMonitoring from '../components/LiveMonitoring';
import RegistrationManagement from '../components/RegistrationManagement';
import GateEntry from '../components/GateEntry';
import EventRegistration from '@/components/EventRegistration';

type Tab = 'live' | 'registration' | 'gate' | 'upload';
type Theme = 'light' | 'dark';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('live');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const stored = window.localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initialTheme: Theme = stored ?? (systemDark ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <div className="min-h-screen flex bg-slate-100 text-slate-900 dark:bg-[#0a0a0a] dark:text-white transition-colors">
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
      />
      <main className="flex-1 overflow-auto p-6">
        {activeTab === 'live' && <LiveMonitoring />}
        {activeTab === 'registration' && <RegistrationManagement />}
        {activeTab === 'gate' && <GateEntry />}
        {activeTab === 'upload' && <EventRegistration />}
      </main>
    </div>
  );
}
