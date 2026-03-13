import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export default function Arrow() {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3 }}
      className="flex items-center justify-center"
    >
      <div className="relative">
        <div className="absolute inset-0 bg-linear-to-r from-lime-300 to-lime-500 blur-sm opacity-40 dark:opacity-30" />
        <ChevronRight className="relative w-8 h-8 text-lime-600 dark:text-[#c8f04a]" strokeWidth={2.5} />
      </div>
    </motion.div>
  );
}
