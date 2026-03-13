import { motion } from 'framer-motion';

const data = [
  { time: '14:25', value: 12 },
  { time: '14:27', value: 18 },
  { time: '14:29', value: 15 },
  { time: '14:31', value: 24 },
  { time: '14:33', value: 21 },
  { time: '14:35', value: 28 },
];

const maxValue = Math.max(...data.map(d => d.value));
const minValue = Math.min(...data.map(d => d.value));
const range = maxValue - minValue;

export default function PanicPrediction() {
  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((d.value - minValue) / range) * 80,
  }));

  const pathD = points.map((p, i) => 
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  const areaD = `${pathD} L 100 100 L 0 100 Z`;

  return (
    <div className="h-32">
      <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <path d={areaD} fill="url(#areaGradient)" />
        
        <motion.path
          d={pathD}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.5, ease: "easeInOut" }}
        />
        
        {points.map((p, i) => (
          <motion.circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="2"
            fill="#f59e0b"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 * i }}
          />
        ))}
        
        <line x1="0" y1="90" x2="100" y2="90" stroke="#334155" strokeWidth="0.5" />
        <line x1="0" y1="70" x2="100" y2="70" stroke="#334155" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#334155" strokeWidth="0.5" />
      </svg>
      
      <div className="mt-2 flex items-center justify-between">
        <span className="text-slate-500 dark:text-slate-400 text-xs">Risk Score</span>
        <span className="text-amber-400 font-mono text-sm">28%</span>
      </div>
    </div>
  );
}
