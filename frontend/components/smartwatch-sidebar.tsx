"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Bell, Camera, LayoutDashboard, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/smartwatch/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/smartwatch/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/smartwatch/alerts", label: "Alerts", icon: Bell },
  { href: "/smartwatch/settings", label: "Settings", icon: Settings },
] as const;

export function SmartWatchSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-full w-16 flex-col border-r border-border bg-sidebar md:w-60">
      <div className="flex h-14 items-center border-b border-border px-3 md:px-4">
        <Camera className="size-6 shrink-0 text-primary" aria-hidden />
        <span className="ml-2 hidden font-semibold tracking-tight md:inline">SmartWatch</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {items.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className="hidden md:inline">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
