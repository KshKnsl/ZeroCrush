import { clsx } from 'clsx';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface RiskMeterProps {
  level: 'LOW' | 'MED' | 'HIGH';
}

export default function RiskMeter({ level }: RiskMeterProps) {
  const config = {
    LOW: { color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-100 dark:bg-slate-800/30', border: 'border-slate-300 dark:border-slate-700', Icon: ShieldCheck },
    MED: { color: 'text-slate-800 dark:text-slate-100', bg: 'bg-slate-200 dark:bg-slate-700/40', border: 'border-slate-400 dark:border-slate-600', Icon: ShieldAlert },
    HIGH: { color: 'text-rose-700 dark:text-rose-300', bg: 'bg-rose-100 dark:bg-rose-900/20', border: 'border-rose-300 dark:border-rose-700', Icon: ShieldX },
  };

  const { color, bg, border, Icon } = config[level];

  return (
    <div className={clsx('flex items-center gap-2 px-3 py-2 border', bg, border)}>
      <Icon className={clsx('w-4 h-4', color)} />
      <span className={clsx('text-xs font-medium', color)}>RISK: {level}</span>
    </div>
  );
}
