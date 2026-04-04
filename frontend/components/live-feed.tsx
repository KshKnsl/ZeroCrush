"use client";

import { useState } from "react";
import { streamUrl } from "@/lib/api";
import { cn } from "@/lib/utils";

export function LiveFeed({
  violenceActive,
  crowdCount,
}: {
  violenceActive: boolean;
  crowdCount: number;
}) {
  const [imgOk, setImgOk] = useState(false);
  const src = streamUrl();

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-black/40">
      {!imgOk ? (
        <div className="flex aspect-video w-full items-center justify-center bg-muted/30 px-4 text-center text-sm text-muted-foreground">
          No feed — click Start to begin (ensure the Python API is running).
        </div>
      ) : null}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Live CCTV stream"
        className={cn("aspect-video w-full object-contain", !imgOk && "hidden")}
        onLoad={() => setImgOk(true)}
        onError={() => setImgOk(false)}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-2 bg-gradient-to-t from-black/80 to-transparent p-4 pt-12">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-background/90 px-3 py-1 text-xs font-medium text-foreground shadow">
            Crowd: {crowdCount}
          </span>
          {violenceActive ? (
            <span
              className={cn(
                "rounded-full bg-red-600 px-3 py-1 text-xs font-bold uppercase text-white",
                "animate-pulse"
              )}
            >
              Violence detected
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
