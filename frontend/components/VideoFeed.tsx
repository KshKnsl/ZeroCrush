export default function VideoFeed({ showHeatmap }: { showHeatmap: boolean }) {
  return (
    <div className="relative h-96 overflow-hidden bg-slate-200 dark:bg-black transition-colors">
      <iframe
        className="absolute inset-0 h-full w-full"
        src="https://www.youtube-nocookie.com/embed/ffu93KhnSKg?autoplay=1&mute=1&controls=1&playsinline=1&rel=0"
        title="Live entrance stream"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
      />

      <div className="absolute inset-0 pointer-events-none bg-linear-to-b from-black/10 via-transparent to-black/35" />

      {showHeatmap && (
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute top-[18%] left-[22%] h-24 w-28 rounded-full bg-rose-500/40 blur-2xl" />
          <div className="absolute top-[42%] left-[48%] h-28 w-32 rounded-full bg-rose-500/45 blur-2xl" />
          <div className="absolute top-[28%] left-[66%] h-20 w-24 rounded-full bg-amber-500/40 blur-2xl" />
        </div>
      )}

      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-3 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 backdrop-blur-md">
        <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-white">Live Feed</span>
      </div>

      <div className="pointer-events-none absolute right-5 top-5 rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono uppercase tracking-[0.22em] text-emerald-200 backdrop-blur-md">
        Cam-01
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-black/80 to-transparent flex items-center px-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono">LIVE</span>
          </div>
          <div className="flex-1" />
          <span className="text-slate-300 dark:text-slate-400 text-xs font-mono">CAM-01 | MAIN ENTRANCE</span>
      </div>
    </div>
  );
}
  