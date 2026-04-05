import { motion } from 'motion/react';

interface CapacityGaugeProps {
  current: number;
  max: number;
}

export default function CapacityGauge({ current, max }: CapacityGaugeProps) {
  const percentage = Math.min((current / max) * 100, 105);
  const isOverBuffer = percentage > 100;

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-48 h-48">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke="#1e293b"
            strokeWidth="12"
          />
          <motion.circle
            cx="96"
            cy="96"
            r="80"
            fill="none"
            stroke={isOverBuffer ? '#f43f5e' : '#10b981'}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={502}
            initial={{ strokeDashoffset: 502 }}
            animate={{ 
              strokeDashoffset: 502 - (502 * Math.min(percentage, 100)) / 100 
            }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold font-mono text-slate-900 dark:text-white">
            {percentage.toFixed(0)}%
          </span>
          <span className="text-slate-500 dark:text-slate-400 text-xs mt-1">CAPACITY</span>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-6 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">Current:</span>
          <span className="text-slate-900 dark:text-white font-mono ml-2">{current.toLocaleString()}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">Max:</span>
          <span className="text-slate-900 dark:text-white font-mono ml-2">{max.toLocaleString()}</span>
        </div>
      </div>

      {isOverBuffer && (
        <div className="mt-4 px-4 py-2 bg-rose-500/20 border border-rose-500/30 rounded-lg">
          <span className="text-rose-400 text-xs font-medium">
            WARNING: 5% Buffer Exceeded
          </span>
        </div>
      )}

      <div className="mt-4 w-full bg-slate-200 dark:bg-[#111111] rounded-full h-2 overflow-hidden">
        <motion.div
          className="h-full bg-linear-to-r from-emerald-500 to-amber-500"
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percentage, 100)}%` }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      </div>
      <div className="mt-2 flex justify-between w-full text-xs text-slate-500 dark:text-slate-400">
        <span>0%</span>
        <span>100%</span>
        <span className="text-amber-400">Buffer</span>
      </div>
    </div>
  );
}
