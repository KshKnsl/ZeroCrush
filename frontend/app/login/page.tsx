"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession, setStoredSession } from '@/lib/auth';
import { Input } from '@/components/ui/input';

type Theme = 'light' | 'dark';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');

  useEffect(() => {
    const existingSession = getStoredSession();
    if (existingSession) {
      router.replace('/dashboard');
      return;
    }

    const storedTheme = window.localStorage.getItem('theme') as Theme | null;
    const nextTheme = storedTheme ?? 'light';
    setTheme(nextTheme);
  }, [router]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    window.localStorage.setItem('theme', theme);
  }, [theme]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }
    
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Invalid credentials.');
        setLoading(false);
        return;
      }

      setStoredSession({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      });
      
      router.push('/dashboard');
    } catch {
      setError('Network error. Failed to login.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 dark:bg-[#111111] transition-colors md:px-6 md:py-14">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 lg:flex-row">
        <section className="flex-1 rounded-4xl border border-slate-200 bg-linear-to-br from-white via-white to-slate-50 p-8 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 lg:p-10">
          <div className="inline-flex rounded-full border border-lime-300/60 bg-lime-50 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300">
            ZeroCrush Central
          </div>
          <h1 className="mt-6 max-w-xl text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl md:text-5xl">
            Login first, then enter the operations dashboard.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400 md:text-base">
            Operational roles determine access privileges inside the system. 
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-[#111111]/70">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Admin Access</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Full dashboard control</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Settings, Incident deletions, Roles setup.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-[#111111]/70">
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Operator/Viewer</p>
              <p className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">Restricted operational access</p>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">View live metrics, log incidents organically based on capabilities.</p>
            </div>
          </div>
        </section>

        <section className="w-full max-w-xl rounded-4xl border border-slate-200 bg-white p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#111111] sm:p-6 md:p-8">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Authentication</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">Sign in to your account</h2>
            </div>
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-300 dark:hover:bg-[#151515]"
            >
              {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100"
              />
            </div>

            {error ? (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
                {error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-slate-900 py-3.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-[#111111] dark:border dark:border-slate-800 dark:text-slate-100 dark:hover:bg-[#151515]"
            >
              {loading ? "Authenticating..." : "Login to Workspace"}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}