import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Send, Calendar, MapPin } from 'lucide-react';
import CapacityGauge from './CapacityGauge';
import { Input } from '@/components/ui/input';

interface RegistrationEvent {
  id: number;
  type: string;
  plate: string | null;
  description: string | null;
  timestamp: string;
}

interface RegistrationManagementProps {
  event: RegistrationEvent;
}

interface RegisteredAttendee {
  id: number;
  name: string | null;
  email: string;
  registeredAt: string;
}

function toDateInputValue(timestamp: string) {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

export default function RegistrationManagement({ event }: RegistrationManagementProps) {
  const eventName = event.type;
  const eventDate = toDateInputValue(event.timestamp);
  const eventPlate = event.plate ?? '';
  const eventLocation = event.description ?? '';

  const configuredCapacity = useMemo(() => {
    const byType: Record<string, number> = {
      conference: 1800,
      concert: 3000,
      sports: 2500,
      exhibition: 1500,
      festival: 5000,
      marathon: 8000,
    };

    return byType[event.type.toLowerCase()] ?? 1500;
  }, [event.type]);

  const [attendees, setAttendees] = useState<RegisteredAttendee[]>([]);
  const [attendeesLoading, setAttendeesLoading] = useState(false);
  const [attendeesError, setAttendeesError] = useState<string | null>(null);
  const [totalRegistered, setTotalRegistered] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadAttendees = async () => {
      setAttendeesLoading(true);
      setAttendeesError(null);

      try {
        const response = await fetch(`/api/events/${event.id}/attendees`, {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Failed to load attendees.');
        }

        setAttendees(Array.isArray(data.attendees) ? data.attendees : []);
        setTotalRegistered(typeof data.totalRegistered === 'number' ? data.totalRegistered : 0);
      } catch (error) {
        if (controller.signal.aborted) return;
        setAttendees([]);
        setTotalRegistered(0);
        setAttendeesError(error instanceof Error ? error.message : 'Failed to load attendees.');
      } finally {
        if (!controller.signal.aborted) {
          setAttendeesLoading(false);
        }
      }
    };

    loadAttendees();

    return () => controller.abort();
  }, [event.id]);

  const stats = [
    { label: 'Total Registered', value: totalRegistered.toLocaleString(), change: 'Live' },
    { label: 'Checked In', value: '892', change: '+8%' },
    { label: 'Pending', value: '355', change: '-5%' },
    { label: 'Capacity', value: '83%', change: '98%' },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <h2 className="app-heading font-bold text-xl">Registration Management</h2>
          <p className="app-muted text-sm">Configure events and monitor registrations</p>
        </div>
        <button className="app-btn-primary flex items-center gap-2">
          <Send className="w-4 h-4" />
          Broadcast Link
        </button>
      </motion.div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="app-panel p-4"
          >
            <p className="app-muted text-xs uppercase tracking-wider mb-1">{stat.label}</p>
            <p className="app-heading font-bold text-2xl font-mono">{stat.value}</p>
            <span className="text-lime-600 dark:text-[#c8f04a] text-xs">{stat.change}</span>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="app-panel p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <Calendar className="w-4 h-4 text-lime-600 dark:text-[#c8f04a]" />
            <h3 className="app-heading font-semibold">Event Configuration</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="app-muted text-xs uppercase tracking-wider">Event Name</label>
              <Input
                type="text"
                value={eventName}
                readOnly
                placeholder="Enter event name"
                className="app-field mt-1"
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="app-muted text-xs uppercase tracking-wider">Date</label>
                <Input
                  type="date"
                  value={eventDate}
                  readOnly
                  placeholder="Select event date"
                  title="Event Date"
                  className="app-field mt-1"
                />
              </div>
              <div>
                <label className="app-muted text-xs uppercase tracking-wider">Plate / Code</label>
                <Input
                  type="text"
                  value={eventPlate}
                  readOnly
                  placeholder="Event plate or internal code"
                  className="app-field mt-1"
                />
              </div>
            </div>

            <div>
              <label className="app-muted text-xs uppercase tracking-wider">Location</label>
              <div className="flex items-center gap-2 mt-1 px-4 py-2 rounded-lg bg-slate-50 border border-slate-300 dark:bg-[#111111] dark:border-[#2a2a2a]">
                <MapPin className="w-4 h-4 app-muted" />
                <Input
                  type="text"
                  value={eventLocation}
                  readOnly
                  placeholder="Enter event location"
                  title="Event Location"
                  className="flex-1 border-0 bg-transparent p-0 shadow-none app-heading text-sm focus-visible:ring-0"
                />
              </div>
            </div>

            <button disabled className="w-full py-3 app-btn-secondary font-medium opacity-60 cursor-not-allowed">
              Event Details Synced From Active Event
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="app-panel p-6"
        >
          <div className="flex items-center gap-2 mb-6">
            <BarChart3 className="w-4 h-4 text-amber-400" />
            <h3 className="app-heading font-semibold">Capacity Monitor</h3>
          </div>
          <CapacityGauge current={1247} max={configuredCapacity} />
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="app-panel overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 dark:border-[#1e1e1e] flex items-center justify-between">
          <h3 className="app-heading font-semibold">Recent Registrations</h3>
          <button
            onClick={() => window.location.reload()}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs border bg-slate-100 border-slate-300 text-slate-700 hover:border-lime-500 transition-all dark:bg-[#111111] dark:border-[#2a2a2a] dark:text-[#777777]"
          >
            Refresh
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-160">
            <thead>
              <tr className="bg-slate-100 dark:bg-[#111111]">
                <th className="px-4 py-3 text-left text-xs font-medium app-muted uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium app-muted uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-medium app-muted uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium app-muted uppercase">Gate</th>
                <th className="px-4 py-3 text-right text-xs font-medium app-muted uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-[#1e1e1e]">
              {attendeesLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm app-muted">Loading registrations...</td>
                </tr>
              ) : attendeesError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-rose-500">{attendeesError}</td>
                </tr>
              ) : attendees.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm app-muted">No registrations yet for this event.</td>
                </tr>
              ) : (
                attendees.map((attendee, index) => (
                  <RegistrationRow
                    key={attendee.id}
                    name={attendee.name || 'Unnamed attendee'}
                    email={attendee.email}
                    status="registered"
                    gate="-"
                    rowNumber={index + 1}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
}

function RegistrationRow({
  name,
  email,
  status,
  gate,
  rowNumber,
}: {
  name: string;
  email: string;
  status: string;
  gate: string;
  rowNumber: number;
}) {
  const statusColors: Record<string, string> = {
    'checked-in': 'text-emerald-400 bg-emerald-500/20',
    registered: 'text-blue-400 bg-blue-500/20',
  };

  return (
    <tr className="hover:bg-slate-100 dark:hover:bg-[#151515] transition-colors">
      <td className="px-4 py-3 app-heading text-sm font-medium">{name}</td>
      <td className="px-4 py-3 app-muted text-sm font-mono">{email}</td>
      <td className="px-4 py-3">
        <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status] || 'text-slate-400'}`}>
          {status}
        </span>
      </td>
      <td className="px-4 py-3 app-muted text-sm font-mono">{gate}</td>
      <td className="px-4 py-3 text-right">
        <span className="text-xs app-muted">#{rowNumber}</span>
      </td>
    </tr>
  );
}
