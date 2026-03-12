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
    bg: 'bg-sky-100',
    border: 'border-sky-200',
    icon: UserPlus,
    shadow: 'shadow-sky-200/50',
  },
  success: {
    bg: 'bg-emerald-100',
    border: 'border-emerald-200',
    icon: CheckCircle,
    shadow: 'shadow-emerald-200/50',
  },
  'id-issuance': {
    bg: 'bg-purple-100',
    border: 'border-purple-200',
    icon: IdCard,
    shadow: 'shadow-purple-200/50',
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
        <Icon className="w-6 h-6 text-slate-700" strokeWidth={2} />
      </div>
      <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
        {label}
      </span>
      <span className="text-xs text-slate-500 mt-1">{description}</span>
    </motion.div>
  );
}
