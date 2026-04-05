"use client";

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Input } from '@/components/ui/input';

interface EventData {
  id: number;
  name: string;
  description: string | null;
  location: string | null;
  date: string;
  capacity: number;
  registrationsCount: number;
}

export default function PublicRegistration() {
  const params = useParams();
  const eventId = params.eventId as string;

  const [eventData, setEventData] = useState<EventData | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!eventId) return;

    const fetchEvent = async () => {
      try {
        const res = await fetch(`/api/public/events/${eventId}`);
        const data = await res.json();
        if (data.event) setEventData(data.event);
        else setError('Event not found');
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };
    fetchEvent();
  }, [eventId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitLoading(true);

    try {
      const res = await fetch('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, eventId }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to register');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Network error');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#0a0a0a]">
        <p className="text-slate-500 dark:text-slate-400">Loading event details...</p>
      </div>
    );
  }

  if (!eventData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 dark:bg-[#0a0a0a]">
        <div className="p-8 bg-white border border-slate-200 rounded-3xl dark:bg-[#111111] dark:border-slate-800 text-center">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">Event Not Found</h2>
          <p className="text-slate-500 text-sm">The event you are looking for does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  const isFull = eventData.capacity > 0 && eventData.registrationsCount >= eventData.capacity;

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-[#0a0a0a] px-4 py-16 transition-colors font-sans">
      <div className="max-w-xl mx-auto">
        <div className="bg-white border border-slate-200 dark:bg-[#111111] dark:border-slate-800 rounded-4xl p-8 sm:p-10 shadow-sm relative overflow-hidden">
          
          <div className="absolute top-0 left-0 w-full h-1.5 bg-linear-to-r from-lime-400 to-lime-600 dark:from-lime-500 dark:to-lime-400"></div>
          
          <div className="space-y-6">
            <div>
              <div className="inline-flex rounded-full border border-lime-300/60 bg-lime-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300 mb-6">
                Event Registration
              </div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{eventData.name}</h1>
              {eventData.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm leading-relaxed mb-4">{eventData.description}</p>
              )}
              <div className="flex flex-wrap gap-4 text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-[#151515] p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                <div className="flex flex-col">
                  <span className="opacity-70 mb-0.5 uppercase tracking-wider text-[10px]">Location</span>
                  <span className="text-slate-700 dark:text-slate-200">{eventData.location || "TBA"}</span>
                </div>
                <div className="mx-2 w-px bg-slate-200 dark:bg-slate-700/50"></div>
                <div className="flex flex-col">
                  <span className="opacity-70 mb-0.5 uppercase tracking-wider text-[10px]">Date</span>
                  <span className="text-slate-700 dark:text-slate-200">{new Date(eventData.date).toLocaleDateString()}</span>
                </div>
                {eventData.capacity > 0 && (
                  <>
                    <div className="mx-2 w-px bg-slate-200 dark:bg-slate-700/50"></div>
                    <div className="flex flex-col">
                      <span className="opacity-70 mb-0.5 uppercase tracking-wider text-[10px]">Availability</span>
                      <span className={isFull ? 'text-rose-500' : 'text-lime-600 dark:text-lime-400'}>
                        {isFull ? 'Full capacity' : `${eventData.capacity - eventData.registrationsCount} spots left`}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="h-px bg-slate-100 dark:bg-slate-800/80 w-full my-8"></div>

            {success ? (
              <div className="bg-lime-50 dark:bg-lime-500/10 border border-lime-200 dark:border-lime-500/20 rounded-2xl p-6 text-center">
                <h3 className="text-lime-700 dark:text-lime-400 font-semibold mb-2 text-lg">Registration Successful!</h3>
                <p className="text-sm text-lime-600/80 dark:text-lime-300/80 mb-4">
                  Check your inbox. We've sent a unique QR code entry ticket to <strong>{email}</strong>.
                </p>
                <div className="w-16 h-16 mx-auto bg-white/50 dark:bg-black/20 rounded-xl flex items-center justify-center text-3xl">
                  🎟️
                </div>
              </div>
            ) : isFull ? (
              <div className="bg-rose-50 dark:bg-rose-500/10 border border-rose-200 dark:border-rose-500/20 rounded-2xl p-6 text-center">
                <h3 className="text-rose-700 dark:text-rose-400 font-semibold mb-2 text-lg">Event full</h3>
                <p className="text-sm text-rose-600/80 dark:text-rose-300/80">
                  We're sorry, but registration is currently closed because the event has reached its maximum capacity.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Your Name</label>
                  <Input
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#151515] dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Email Address</label>
                  <Input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="jane@example.com"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#151515] dark:text-slate-100"
                  />
                </div>

                {error && (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitLoading}
                  className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-lime-500 dark:text-lime-950 dark:hover:bg-lime-400 font-semibold mt-2"
                >
                  {submitLoading ? "Processing..." : "Claim Ticket"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
