import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { SmartWatchSidebar } from "@/components/smartwatch-sidebar";
import { SmartWatchTopBar } from "@/components/smartwatch-top-bar";

export default function SmartWatchLayout({ children }: { children: ReactNode }) {
  return (
    <div className="dark flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      <SmartWatchSidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <SmartWatchTopBar />
        <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
      <Toaster richColors position="top-right" />
    </div>
  );
}
