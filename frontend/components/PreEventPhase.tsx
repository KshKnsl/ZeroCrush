import { motion } from 'framer-motion';
import FlowNode from './FlowNode';
import DecisionDiamond from './DecisionDiamond';
import Arrow from './Arrow';

const nodes = [
  {
    id: 'registration',
    label: 'Registration',
    type: 'registration' as const,
    description: 'User signs up',
  },
  {
    id: 'validation',
    label: 'Validate',
    type: 'decision' as const,
    description: 'Check eligibility',
  },
  {
    id: 'capacity',
    label: 'Capacity Check',
    type: 'success' as const,
    description: 'Slots available',
  },
];

export default function PreEventPhase() {
  return (
    <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-r from-blue-100/30 via-transparent to-purple-100/30 pointer-events-none" />
      
      <div className="relative px-6 py-4 border-b border-slate-200/50">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Pre-Event Phase</span>
      </div>
      
      <div className="relative p-8">
        <div className="flex items-center justify-start gap-4 flex-wrap">
          <FlowNode {...nodes[0]} />
          <Arrow />
          <DecisionDiamond {...nodes[1]} />
          <Arrow />
          <FlowNode {...nodes[2]} />
        </div>
      </div>
    </div>
  );
}
