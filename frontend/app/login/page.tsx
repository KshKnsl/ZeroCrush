"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_CREDENTIALS, authenticateAdmin, getStoredSession, setStoredSession, type UserRole } from '@/lib/auth';

type Theme = 'light' | 'dark';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>('admin');
  const [adminEmail, setAdminEmail] = useState<string>(ADMIN_CREDENTIALS.email);
  const [adminPassword, setAdminPassword] = useState<string>(ADMIN_CREDENTIALS.password);
  const [managementId, setManagementId] = useState('');
  const [managementPassword, setManagementPassword] = useState('');
  const [events, setEvents] = useState<Array<{ id: number; type: string; plate: string | null }>>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    const existingSession = getStoredSession();
    if (existingSession) {
      router.replace('/dashboard');
      return;
    }

    const storedTheme = window.localStorage.getItem('theme') as Theme | null;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const nextTheme = storedTheme ?? (systemDark ? 'dark' : 'light');
    setTheme(nextTheme);

    const loadEvents = async () => {
      try {
        const response = await fetch('/api/events', { cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) return;
        const nextEvents = (data.events ?? []) as Array<{ id: number; type: string; plate: string | null }>;
        setEvents(nextEvents);
        if (nextEvents.length > 0) {
          setSelectedEventId(nextEvents[0].id);
        }
      } catch {
        // ignore
      }
    };

    loadEvents();
  }, [router]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');

    if (role === 'admin') {
      if (!authenticateAdmin(adminEmail.trim(), adminPassword.trim())) {
        setError('Invalid admin email or password.');
        return;
      }

      setStoredSession({ role: 'admin', identifier: adminEmail.trim() });
      router.push('/dashboard');
      return;
    }

    if (!selectedEventId) {
      setError('Select an event first.');
      return;
    }

    const response = await fetch('/api/auth/management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId: selectedEventId,
        loginId: managementId.trim(),
        password: managementPassword.trim(),
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setError(data.error || 'Invalid management ID or password.');
      return;
    }

    setStoredSession({
      role: 'management',
      identifier: data.account.loginId,
      allowedTabs: data.account.allowedTabs,
      eventId: data.account.eventId,
      eventName: data.account.eventName,
    });
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-slate-950 transition-colors md:px-6 md:py-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-4xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 lg:p-10">
          <div className="inline-flex rounded-full border border-lime-300/60 bg-lime-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300">
            ZeroCrush Access
          </div>
          <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 md:text-5xl">
            Login first, then enter the operations dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400 md:text-base">
            Use the admin account to access the full dashboard and create management credentials. Use management login for day-to-day operations once credentials have been issued.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Admin Access</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Full dashboard control</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Includes live monitoring, registration, gate entry, CSV upload, and management credential creation.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/70">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Management Access</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Operational dashboard access</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Uses credentials created by the admin and excludes the access-management tab.</p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Authentication</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Choose a login mode</h2>
            </div>
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <div className="mt-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
            <button
              onClick={() => {
                setRole('admin');
                setError('');
              }}
              className={`rounded-[14px] px-4 py-3 text-sm font-medium transition-colors ${role === 'admin' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Admin Login
            </button>
            <button
              onClick={() => {
                setRole('management');
                setError('');
              }}
              className={`rounded-[14px] px-4 py-3 text-sm font-medium transition-colors ${role === 'management' ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-slate-100' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Management Login
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-5">
            {role === 'admin' ? (
              <>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Admin Email</label>
                  <input
                    type="email"
                    value={adminEmail}
                    onChange={(event) => setAdminEmail(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Password</label>
                  <input
                    type="password"
                    value={adminPassword}
                    onChange={(event) => setAdminPassword(event.target.value)}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  />
                </div>
                <div className="rounded-2xl border border-lime-300/60 bg-lime-50 px-4 py-3 text-sm text-lime-800 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300">
                  Admin login is prefilled with <span className="font-semibold">abcd@gmail.com</span> and <span className="font-semibold">abcd</span>.
                </div>
              </>
            ) : (
              <>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Event</label>
                  <select
                    value={selectedEventId ?? ''}
                    onChange={(event) => setSelectedEventId(Number(event.target.value))}
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  >
                    {events.length === 0 ? <option value="">No events available</option> : null}
                    {events.map((event) => (
                      <option key={event.id} value={event.id}>
                        {event.type}{event.plate ? ` · ${event.plate}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Management ID</label>
                  <input
                    type="text"
                    value={managementId}
                    onChange={(event) => setManagementId(event.target.value)}
                    placeholder="Enter management ID"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <div>
                  <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Password</label>
                  <input
                    type="password"
                    value={managementPassword}
                    onChange={(event) => setManagementPassword(event.target.value)}
                    placeholder="Enter password"
                    className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                  />
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                  Management credentials are created from the admin dashboard.
                </div>
              </>
            )}

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              {role === 'admin' ? 'Enter Admin Dashboard' : 'Enter Management Dashboard'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}