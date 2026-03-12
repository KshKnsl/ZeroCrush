"use client"
import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import LiveMonitoring from '../components/LiveMonitoring';
import RegistrationManagement from '../components/RegistrationManagement';
import GateEntry from '../components/GateEntry';

type Tab = 'live' | 'registration' | 'gate';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('live');

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6 overflow-auto">
        {activeTab === 'live' && <LiveMonitoring />}
        {activeTab === 'registration' && <RegistrationManagement />}
        {activeTab === 'gate' && <GateEntry />}
      </main>
    </div>
  );
}
