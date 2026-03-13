import { motion } from 'framer-motion';
import { HelpCircle } from 'lucide-react';

interface DecisionDiamondProps {
  id: string;
  label: string;
  description: string;
}

export default function DecisionDiamond({ id, label, description }: DecisionDiamondProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.08, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="relative flex flex-col items-center p-4 rounded-xl border-2 border-slate-300 bg-slate-100/80 dark:border-[#2a2a2a] dark:bg-[#141414] backdrop-blur-md shadow-lg shadow-slate-200/50 dark:shadow-black/20 cursor-pointer transition-all duration-300"
      style={{ transform: 'rotate(0deg)' }}
    >
      <div 
        className="w-16 h-16 flex items-center justify-center rotate-45 bg-lime-100 border-2 border-lime-300 dark:bg-lime-500/10 dark:border-lime-500/30 rounded-lg diamondContainer"
      >
        <div className="-rotate-45 flex flex-col items-center">
          <HelpCircle className="w-5 h-5 text-lime-700 dark:text-[#c8f04a] mb-1" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-wide text-lime-800 dark:text-[#c8f04a] whitespace-nowrap">
            {label}
          </span>
        </div>
      </div>
      <span className="mt-3 text-xs app-muted font-medium">{description}</span>
    </motion.div>
  );
}
