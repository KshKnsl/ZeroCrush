"use client";

import { Toaster } from "sonner";
import { SmartWatchAnalyticsPanel, SmartWatchAlertsPanel, SmartWatchDashboardPanel, SmartWatchSettingsPanel } from "@/components/smartwatch-panels";
import { SmartWatchSidebar } from "@/components/smartwatch-sidebar";
import { SmartWatchTopBar } from "@/components/smartwatch-top-bar";

export type SmartWatchTab = "dashboard" | "analytics" | "alerts" | "settings";

export function SmartWatchWorkspace({
  activeTab,
  onExitOperations,
}: {
  activeTab: SmartWatchTab;
  onExitOperations: () => void;
}) {
  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <SmartWatchSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <SmartWatchTopBar onExitOperations={onExitOperations} />
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {activeTab === "dashboard" && <SmartWatchDashboardPanel />}
          {activeTab === "analytics" && <SmartWatchAnalyticsPanel />}
          {activeTab === "alerts" && <SmartWatchAlertsPanel />}
          {activeTab === "settings" && <SmartWatchSettingsPanel />}
        </main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
