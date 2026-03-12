import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, BarChart3, Send, Plus, Trash2, Calendar, MapPin } from 'lucide-react';
import CapacityGauge from './CapacityGauge';

export default function RegistrationManagement() {
  const [eventName, setEventName] = useState('Tech Summit 2025');
  const [maxCapacity, setMaxCapacity] = useState(1500);
  const [eventDate, setEventDate] = useState('2025-03-15');
  const [eventLocation, setEventLocation] = useState('Convention Center Hall A');

  const stats = [
    { label: 'Total Registered', value: '1,247', change: '+12%' },
    { label: 'Checked In', value: '892', change: '+8%' },
    { label: 'Pending', value: '355', change: '-5%' },
    { label: 'Capacity', value: '83%', change: '98%' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h2 className="text-white font-bold text-xl">Registration Management</h2>
          <p className="text-slate-400 text-sm">Configure events and monitor registrations</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium hover:bg-emerald-500/30 transition-all">
          <Send className="w-4 h-4" />
          Broadcast Link
        </button>
      </motion.div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-4"
          >
            <p className="text-slate-500 text-xs uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="text-white font-bold text-2xl font-mono">{stat.value}</p>
            <span className="text-emerald-400 text-xs">{stat.change}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-emerald-400" />
            <h3 className="text-white font-semibold">Event Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider">Event Name</label>
              <input
                type="text"
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                placeholder="Enter event name"
                className="w-full mt-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider">Date</label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  placeholder="Select event date"
                  title="Event Date"
                  className="w-full mt-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider">Max Capacity</label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={(e) => setMaxCapacity(Number(e.target.value))}
                  placeholder="Enter max capacity"
                  className="w-full mt-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider">Location</label>
              <div className="flex items-center gap-2 mt-1 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg">
                <MapPin className="w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={eventLocation}
                  onChange={(e) => setEventLocation(e.target.value)}
                  placeholder="Enter event location"
                  title="Event Location"
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                />
              </div>
            </div>

            <button className="w-full py-3 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-medium hover:border-emerald-500 hover:bg-slate-800/80 transition-all">
              Update Event Details
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h3 className="text-white font-semibold">Capacity Monitor</h3>
          </div>
          <CapacityGauge current={1247} max={maxCapacity} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/80 backdrop-blur-xl rounded-xl border border-slate-800 overflow-hidden"
      >
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-white font-semibold">Recent Registrations</h3>
          <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-xs hover:border-emerald-500 transition-all">
            <Plus className="w-3 h-3" />
            Add Manual
          </button>
        </div>
        <table className="w-full">
          <thead>
            <tr className="bg-slate-800/50">
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Email</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Gate</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            <RegistrationRow name="John Smith" email="john@example.com" status="checked-in" gate={1} />
            <RegistrationRow name="Sarah Johnson" email="sarah@example.com" status="registered" gate={3} />
            <RegistrationRow name="Mike Davis" email="mike@example.com" status="registered" gate={2} />
            <RegistrationRow name="Emily Chen" email="emily@example.com" status="checked-in" gate={1} />
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}

function RegistrationRow({ name, email, status, gate }: { name: string; email: string; status: string; gate: number }) {
  const statusColors: Record<string, string> = {
    'checked-in': 'text-emerald-400 bg-emerald-500/20',
    registered: 'text-blue-400 bg-blue-500/20',
  };

  return (
    <tr className="hover:bg-slate-800/30 transition-colors">
      <td className="px-4 py-3 text-white text-sm font-medium">{name}</td>
      <td className="px-4 py-3 text-slate-400 text-sm font-mono">{email}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || 'text-slate-400'}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 text-slate-400 text-sm font-mono">GATE-{gate}</td>
      <td className="px-4 py-3 text-right">
        <button className="p-1.5 text-slate-500 hover:text-rose-400 transition-colors" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
}
