import { useState } from 'react';
import { motion } from 'framer-motion';
import VideoFeed from './VideoFeed';
import PanicPrediction from './PanicPrediction';
import LiveDensityHeatmap from './LiveDensityHeatmap';
import RiskMeter from './RiskMeter';
import { Users, AlertTriangle, Zap } from 'lucide-react';

export default function LiveMonitoring() {
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [riskLevel, setRiskLevel] = useState<'LOW' | 'MED' | 'HIGH'>('LOW');
  const [liveCount, setLiveCount] = useState(1247);

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, }}
        className="bg-slate y: 0-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-4 flex items-center justify-between"
      >
        <div className="flex items-center gap-6">
          <div>
            <p className="text-slate-500 text-xs uppercase tracking-wider">Active Event</p>
            <h2 className="text-white font-bold text-lg">Tech Summit 2025</h2>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-400" />
            <span className="text-white font-mono text-sm">{liveCount.toLocaleString()}</span>
            <span className="text-slate-500 text-xs">in venue</span>
          </div>
          <div className="h-10 w-px bg-slate-700" />
          <RiskMeter level={riskLevel} />
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`px-4 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
              showHeatmap
                ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-lg shadow-emerald-500/20'
                : 'bg-transparent border-slate-600 text-slate-400 hover:border-slate-400'
            }`}
          >
            <Zap className="w-4 h-4 inline mr-2" />
            Thermal Overlay
          </button>
        </div>
      </motion.div>

      <div className="grid grid-cols-3 gap-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="col-span-2 bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
        >
          <VideoFeed showHeatmap={showHeatmap} />
        </motion.div>

        <div className="space-y-6">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h3 className="text-white font-semibold text-sm">PANIC PREDICTION</h3>
            </div>
            <PanicPrediction />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-4"
          >
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-rose-400" />
              <h3 className="text-white font-semibold text-sm">LIVE DENSITY</h3>
            </div>
            <LiveDensityHeatmap />
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-4"
      >
        <h3 className="text-white font-semibold text-sm mb-4">LIVE ALERTS</h3>
        <div className="space-y-2 font-mono text-xs">
          <AlertItem time="14:32:05" message="Gate 3: Crowd density approaching threshold" type="warning" />
          <AlertItem time="14:31:42" message="Registration: New batch of 50 attendees checked in" type="info" />
          <AlertItem time="14:30:18" message="AI Model: Stampede risk assessment updated" type="safe" />
          <AlertItem time="14:29:55" message="Gate 1: QR scan rate increased by 15%" type="info" />
        </div>
      </motion.div>
    </div>
  );
}

function AlertItem({ time, message, type }: { time: string; message: string; type: 'safe' | 'warning' | 'info' }) {
  const colors = {
    safe: 'text-emerald-400',
    warning: 'text-amber-400',
    info: 'text-blue-400',
  };

  return (
    <div className="flex items-start gap-3 p-2 rounded bg-slate-800/50">
      <span className="text-slate-500 font-mono">{time}</span>
      <span className={colors[type]}>{message}</span>
    </div>
  );
}
