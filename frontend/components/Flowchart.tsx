import { motion } from 'framer-motion';
import PreEventPhase from './PreEventPhase';
import EntryPhase from './EntryPhase';

export default function Flowchart() {
  return (
    <div className="space-y-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <PreEventPhase />
      </motion.div>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <EntryPhase />
      </motion.div>
    </div>
  );
}
