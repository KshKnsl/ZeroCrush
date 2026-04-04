"use client";

import useSWR from "swr";
import { getStatus } from "@/lib/api";
import { AlertBadge } from "@/components/alert-badge";

export function SmartWatchTopBar() {
  const { data } = useSWR("sw-status", () => getStatus(), {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });
  const status = data?.status ?? "unknown";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <span className="text-lg font-semibold tracking-tight">SmartWatch</span>
      <div className="flex items-center gap-3">
        {data?.error ? (
          <span className="max-w-[200px] truncate text-xs text-destructive md:max-w-md" title={data.error}>
            {data.error}
          </span>
        ) : null}
        <AlertBadge status={status} />
      </div>
    </header>
  );
}
