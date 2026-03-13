import { motion } from 'framer-motion';
import FlowNode from './FlowNode';
import Arrow from './Arrow';

const nodes = [
  {
    id: 'arrival',
    label: 'Arrival',
    type: 'registration' as const,
    description: 'User arrives',
  },
  {
    id: 'checkin',
    label: 'Check-In',
    type: 'success' as const,
    description: 'Verify ticket',
  },
  {
    id: 'id-issue',
    label: 'Issue ID',
    type: 'id-issuance' as const,
    description: 'Generate badge',
  },
  {
    id: 'entry',
    label: 'Entry Granted',
    type: 'success' as const,
    description: 'Access approved',
  },
];

export default function EntryPhase() {
  return (
    <div className="relative app-panel rounded-2xl shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-r from-lime-100/20 via-transparent to-slate-100/20 dark:from-lime-500/5 dark:to-transparent pointer-events-none" />
      
      <div className="relative px-6 py-4 border-b border-slate-200 dark:border-[#1e1e1e]">
        <span className="text-xs font-bold uppercase tracking-widest app-muted">Entry Phase</span>
      </div>
      
      <div className="relative p-8">
        <div className="flex items-center justify-start gap-4 flex-wrap">
          <FlowNode {...nodes[0]} />
          <Arrow />
          <FlowNode {...nodes[1]} />
          <Arrow />
          <FlowNode {...nodes[2]} />
          <Arrow />
          <FlowNode {...nodes[3]} />
        </div>
      </div>
    </div>
  );
}
