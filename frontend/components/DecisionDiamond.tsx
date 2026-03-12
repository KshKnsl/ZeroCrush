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
      className="relative flex flex-col items-center p-4 rounded-xl border-2 border-amber-200 bg-amber-50/80 backdrop-blur-md shadow-lg shadow-amber-200/50 cursor-pointer transition-all duration-300"
      style={{ transform: 'rotate(0deg)' }}
    >
      <div 
        className="w-16 h-16 flex items-center justify-center rotate-45 bg-amber-100 border-2 border-amber-300 rounded-lg diamondContainer"
      >
        <div className="-rotate-45 flex flex-col items-center">
          <HelpCircle className="w-5 h-5 text-amber-600 mb-1" strokeWidth={2} />
          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700 whitespace-nowrap">
            {label}
          </span>
        </div>
      </div>
      <span className="mt-3 text-xs text-amber-600 font-medium">{description}</span>
    </motion.div>
  );
}
