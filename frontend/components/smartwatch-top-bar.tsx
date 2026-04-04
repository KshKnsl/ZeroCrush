"use client";

import Link from "next/link";
import useSWR from "swr";
import { getStatus } from "@/lib/api";
import { AlertBadge } from "@/components/alert-badge";

export function SmartWatchTopBar({ onExitOperations }: { onExitOperations: () => void }) {
  const { data } = useSWR("sw-status", () => getStatus(), {
    refreshInterval: 3000,
    revalidateOnFocus: false,
  });
  const status = data?.status ?? "unknown";

  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 md:px-6">
      <div className="flex items-center gap-3">
        <span className="text-lg font-semibold tracking-tight">SmartWatch</span>
        <span className="hidden rounded-full border border-border bg-muted px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.24em] text-muted-foreground md:inline-flex">
          Integrated mode
        </span>
      </div>
      <div className="flex items-center gap-3">
        {data?.error ? (
          <span className="max-w-[200px] truncate text-xs text-destructive md:max-w-md" title={data.error}>
            {data.error}
          </span>
        ) : null}
        <Link
          href="/dashboard?mode=operations"
          onClick={onExitOperations}
          className="hidden rounded-full border border-border bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-background hover:text-foreground md:inline-flex"
        >
          Operations mode
        </Link>
        <AlertBadge status={status} />
      </div>
    </header>
  );
}
