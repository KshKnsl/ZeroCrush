import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import { CheckCircle, UserPlus, IdCard } from 'lucide-react';

type NodeType = 'registration' | 'success' | 'id-issuance';

interface FlowNodeProps {
  id: string;
  label: string;
  type: NodeType;
  description: string;
}

const typeStyles: Record<NodeType, { bg: string; border: string; icon: typeof CheckCircle; shadow: string }> = {
  registration: {
    bg: 'bg-slate-100 dark:bg-[#141414]',
    border: 'border-slate-300 dark:border-[#2a2a2a]',
    icon: UserPlus,
    shadow: 'shadow-slate-200/50 dark:shadow-black/20',
  },
  success: {
    bg: 'bg-lime-100 dark:bg-lime-500/10',
    border: 'border-lime-300 dark:border-lime-500/30',
    icon: CheckCircle,
    shadow: 'shadow-lime-200/50 dark:shadow-lime-500/10',
  },
  'id-issuance': {
    bg: 'bg-slate-100 dark:bg-[#141414]',
    border: 'border-slate-300 dark:border-[#2a2a2a]',
    icon: IdCard,
    shadow: 'shadow-slate-200/50 dark:shadow-black/20',
  },
};

export default function FlowNode({ id, label, type, description }: FlowNodeProps) {
  const style = typeStyles[type];
  const Icon = style.icon;

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -4 }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'relative flex flex-col items-center p-5 rounded-xl border-2 cursor-pointer',
        'backdrop-blur-md shadow-lg transition-all duration-300',
        style.bg,
        style.border,
        style.shadow
      )}
    >
      <div className="mb-3">
        <Icon className="w-6 h-6 text-slate-700 dark:text-[#c8f04a]" strokeWidth={2} />
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-800 dark:text-white">
        {label}
      </span>
      <span className="text-xs app-muted mt-1">{description}</span>
    </motion.div>
  );
}
