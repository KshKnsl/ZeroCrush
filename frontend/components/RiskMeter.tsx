import { clsx } from 'clsx';
import { ShieldCheck, ShieldAlert, ShieldX } from 'lucide-react';

interface RiskMeterProps {
  level: 'LOW' | 'MED' | 'HIGH';
}

export default function RiskMeter({ level }: RiskMeterProps) {
  const config = {
    LOW: { color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', Icon: ShieldCheck },
    MED: { color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', Icon: ShieldAlert },
    HIGH: { color: 'text-rose-400', bg: 'bg-rose-500/20', border: 'border-rose-500/30', Icon: ShieldX },
  };

  const { color, bg, border, Icon } = config[level];

  return (
    <div className={clsx('flex items-center gap-2 px-3 py-2 rounded-lg border', bg, border)}>
      <Icon className={clsx('w-4 h-4', color)} />
      <span className={clsx('text-xs font-medium', color)}>RISK: {level}</span>
    </div>
  );
}
