export default function LiveDensityHeatmap() {
    const grid = [
      [0.2, 0.4, 0.8, 0.6, 0.3],
      [0.3, 0.7, 0.9, 0.8, 0.4],
      [0.4, 0.8, 1.0, 0.9, 0.5],
      [0.3, 0.6, 0.8, 0.7, 0.3],
      [0.2, 0.4, 0.5, 0.4, 0.2],
    ];
  
    const getColor = (value: number) => {
      if (value < 0.3) return 'bg-emerald-500/30';
      if (value < 0.6) return 'bg-emerald-500/50';
      if (value < 0.8) return 'bg-amber-500/50';
      return 'bg-rose-500/60';
    };
  
    return (
      <div className="space-y-3">
        <div className="grid grid-cols-5 gap-1">
          {grid.flat().map((value, i) => (
            <div
              key={i}
              className={`h-6 rounded ${getColor(value)} transition-all duration-300`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Zone Density</span>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded bg-emerald-500/30" />
            <span className="text-slate-400">Low</span>
            <span className="w-3 h-3 rounded bg-amber-500/50" />
            <span className="text-slate-400">Med</span>
            <span className="w-3 h-3 rounded bg-rose-500/60" />
            <span className="text-slate-400">High</span>
          </div>
        </div>
      </div>
    );
  }
  