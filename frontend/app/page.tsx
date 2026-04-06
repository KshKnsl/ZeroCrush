"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession, setStoredSession } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

type Theme = 'light' | 'dark';

export default function HomePage() {
  const router = useRouter();
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
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

    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Authenticating your account...');

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
        toast.error(data.error || 'Invalid credentials.', { id: toastId });
        setLoading(false);
        return;
      }

      setStoredSession({
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role,
      });

      toast.success('Login successful. Redirecting to dashboard...', { id: toastId });
      router.push('/dashboard');
    } catch {
      toast.error('Network error. Failed to login.', { id: toastId });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh px-4 py-5 transition-colors sm:px-6 sm:py-8">
      <div className="mx-auto w-full max-w-md rounded-[2rem] border border-slate-300/70 bg-white/70 p-3 shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/80 dark:shadow-[0_30px_70px_-28px_rgba(0,0,0,0.7)]">
        <div className="overflow-hidden rounded-[1.5rem] border border-slate-200/80 bg-[linear-gradient(165deg,#f8fbff_0%,#edf3ff_45%,#e9fff8_100%)] p-5 dark:border-slate-800 dark:bg-[linear-gradient(165deg,#0f1726_0%,#141f2f_50%,#0f2621_100%)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">ZeroCrush Mobile</p>
              <h1 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-100">Secure access</h1>
            </div>
            <button
              onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}
              className="rounded-full border border-slate-300 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>
          </div>

          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Sign in and continue to live monitoring, incident handling, and analytics.
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-12 rounded-2xl border border-slate-300 bg-white/80 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-12 rounded-2xl border border-slate-300 bg-white/80 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-100"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-1 h-12 w-full rounded-2xl bg-emerald-900 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-70 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
            >
              {loading ? 'Authenticating...' : 'Unlock Dashboard'}
            </button>
          </form>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-300/70 bg-white/75 px-3 py-2 dark:border-slate-700 dark:bg-[#111111]/75">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Admin</p>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">User and system controls</p>
            </div>
            <div className="rounded-2xl border border-slate-300/70 bg-white/75 px-3 py-2 dark:border-slate-700 dark:bg-[#111111]/75">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Ops</p>
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Live stream and incidents</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
