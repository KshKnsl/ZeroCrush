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
    <div className="relative bg-white/70 backdrop-blur-xl rounded-2xl border border-white/50 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-r from-green-100/30 via-transparent to-blue-100/30 pointer-events-none" />
      
      <div className="relative px-6 py-4 border-b border-slate-200/50">
        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Entry Phase</span>
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
