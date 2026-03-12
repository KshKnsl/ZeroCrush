export default function VideoFeed({ showHeatmap }: { showHeatmap: boolean }) {
    return (
      <div className="relative h-96 bg-black">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="w-64 h-40 bg-slate-800 rounded-lg mx-auto flex items-center justify-center border border-slate-700 relative overflow-hidden">
              <div className="absolute inset-0 bg-linear-to-br from-slate-800 to-slate-900" />
              <div className="text-slate-600 text-xs font-mono">CAMERA FEED</div>
              
              <div className="absolute top-8 left-16 w-12 h-16 border-2 border-emerald-500/60 rounded" />
              <div className="absolute top-12 left-32 w-10 h-14 border-2 border-emerald-500/60 rounded" />
              <div className="absolute top-20 left-48 w-14 h-12 border-2 border-emerald-500/60 rounded" />
              <div className="absolute top-16 left-24 w-8 h-10 border-2 border-amber-500/60 rounded" />
              
              {showHeatmap && (
                <div className="absolute inset-0 opacity-60">
                  <div className="absolute top-1/4 left-1/3 w-20 h-16 bg-rose-500/40 rounded-full blur-xl" />
                  <div className="absolute top-1/2 left-1/2 w-24 h-20 bg-rose-500/50 rounded-full blur-xl" />
                  <div className="absolute top-1/3 left-2/3 w-16 h-12 bg-amber-500/40 rounded-full blur-xl" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-linear-to-t from-black/80 to-transparent flex items-center px-4 gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-white text-xs font-mono">LIVE</span>
          </div>
          <div className="flex-1" />
          <span className="text-slate-400 text-xs font-mono">CAM-01 | MAIN ENTRANCE</span>
        </div>
      </div>
    );
  }
  