"use client";

import { useState } from "react";
import { AlertTriangle, Flame, Zap } from "lucide-react";
import type { LogEvent } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
function iconFor(type: LogEvent["type"]) {
  switch (type) {
    case "violence":
      return Flame;
    case "restricted_zone":
      return AlertTriangle;
    default:
      return Zap;
  }
}

export function EventFeed({
  events,
}: {
  events: LogEvent[];
  sessionStart?: number | null;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<string | null>(null);

  const visible = events.filter((e) => !dismissed.has(`${e.type}-${e.time}`));

  return (
    <div className="flex max-h-[min(70vh,560px)] flex-col gap-2 overflow-y-auto rounded-xl border border-border bg-card p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Live events</p>
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No events yet.</p>
      ) : (
        <ul className="space-y-2">
          {visible.map((e) => {
            const key = `${e.type}-${e.time}`;
            const Icon = iconFor(e.type);
            const color =
              e.type === "violence"
                ? "text-red-500"
                : e.type === "restricted_zone"
                  ? "text-orange-500"
                  : "text-blue-500";
            return (
              <li
                key={key}
                className="rounded-lg border border-border bg-muted/30 p-3 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", color)} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left text-sm font-medium"
                      onClick={() => setExpanded((x) => (x === key ? null : key))}
                    >
                      {e.label}
                    </button>
                    <p className="text-xs text-muted-foreground">{String(e.time)}</p>
                    {expanded === key ? (
                      <p className="mt-2 text-xs text-muted-foreground">Type: {e.type}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    className="shrink-0 text-xs"
                    onClick={() =>
                      setDismissed((prev) => new Set(prev).add(key))
                    }
                  >
                    Dismiss
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
