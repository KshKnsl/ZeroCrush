import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { QrCode, CheckCircle, XCircle, ArrowRight, Camera, Keyboard } from 'lucide-react';

export default function GateEntry() {
  const [scanResult, setScanResult] = useState<'success' | 'error' | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [activeGate, setActiveGate] = useState(1);

  const gates = [1, 2, 3, 4];

  const handleScan = (result: 'success' | 'error') => {
    setScanResult(result);
    setTimeout(() => setScanResult(null), 3000);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-white font-bold text-xl">Gate Entry</h2>
          <p className="text-slate-400 text-sm">Scan QR codes or manually check-in attendees</p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-slate-500 text-xs uppercase">Active Gate:</span>
          <div className="flex gap-1">
            {gates.map((gate) => (
              <button
                key={gate}
                onClick={() => setActiveGate(gate)}
                className={`px-3 py-1.5 rounded-lg text-sm font-mono transition-all ${
                  activeGate === gate
                    ? 'bg-emerald-500/20 border border-emerald-500 text-emerald-400'
                    : 'bg-slate-800 border border-slate-700 text-slate-400 hover:border-slate-600'
                }`}
              >
                G{gate}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <h3 className="text-white font-semibold">QR Scanner</h3>
            </div>
            <span className="text-xs text-slate-500 font-mono">CAM-0{activeGate}</span>
          </div>

          <div className="p-6">
            <div className="relative aspect-square bg-black rounded-xl overflow-hidden mb-4">
              <div className="absolute inset-0 bg-slate-900 flex items-center justify-center">
                <QrCode className="w-24 h-24 text-slate-700" />
              </div>
              
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 relative">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-emerald-500 rounded-tl-lg" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-emerald-500 rounded-tr-lg" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-emerald-500 rounded-bl-lg" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-emerald-500 rounded-br-lg" />
                  
                  <motion.div
                    animate={{ y: [ -80, 80, -80 ] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="absolute left-2 right-2 h-0.5 bg-emerald-500/50 shadow-lg shadow-emerald-500"
                  />
                </div>
              </div>

              <AnimatePresence>
                {scanResult && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className={`absolute inset-0 flex items-center justify-center ${
                      scanResult === 'success' ? 'bg-emerald-500/20' : 'bg-rose-500/20'
                    }`}
                  >
                    <div className="text-center">
                      {scanResult === 'success' ? (
                        <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-2" />
                      ) : (
                        <XCircle className="w-16 h-16 text-rose-400 mx-auto mb-2" />
                      )}
                      <p className={`text-xl font-bold ${
                        scanResult === 'success' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {scanResult === 'success' ? 'ACCESS GRANTED' : 'INVALID CODE'}
                      </p>
                      {scanResult === 'success' && (
                        <div className="mt-4 flex items-center justify-center gap-2 text-emerald-300">
                          <ArrowRight className="w-5 h-5" />
                          <span className="font-mono">GATE {activeGate}</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleScan('success')}
                className="flex-1 py-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 font-medium hover:bg-emerald-500/30 transition-all"
              >
                Simulate Valid Scan
              </button>
              <button
                onClick={() => handleScan('error')}
                className="flex-1 py-3 bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-400 font-medium hover:bg-rose-500/30 transition-all"
              >
                Simulate Invalid
              </button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
        >
          <div className="p-4 border-b border-slate-800 flex items-center gap-2">
            <Keyboard className="w-4 h-4 text-blue-400" />
            <h3 className="text-white font-semibold">Manual Check-In</h3>
          </div>

          <div className="p-6 space-y-4">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider">Registration Code</label>
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket code..."
                className="w-full mt-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <button className="w-full py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-medium hover:border-emerald-500 hover:bg-slate-800/80 transition-all flex items-center justify-center gap-2">
              <QrCode className="w-4 h-4" />
              Validate Code
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-700" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-slate-900 px-2 text-slate-500">OR</span>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider">Quick Actions</label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button className="py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm hover:border-blue-500 hover:text-blue-400 transition-all">
                  Find by Name
                </button>
                <button className="py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm hover:border-purple-500 hover:text-purple-400 transition-all">
                  Issue Day Pass
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800">
          <h3 className="text-white font-semibold">Recent Check-ins</h3>
        </div>
        <div className="divide-y divide-slate-800">
          <CheckInItem name="John Smith" gate={1} time="14:32:05" />
          <CheckInItem name="Sarah Johnson" gate={2} time="14:31:48" />
          <CheckInItem name="Mike Davis" gate={1} time="14:31:22" />
          <CheckInItem name="Emily Chen" gate={3} time="14:30:55" />
        </div>
      </motion.div>
    </div>
  );
}

function CheckInItem({ name, gate, time }: { name: string; gate: number; time: string }) {
  return (
    <div className="p-4 flex items-center justify-between hover:bg-slate-800/30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <p className="text-white text-sm font-medium">{name}</p>
          <p className="text-slate-500 text-xs">GATE-{gate}</p>
        </div>
      </div>
      <span className="text-slate-400 text-xs font-mono">{time}</span>
    </div>
  );
}
