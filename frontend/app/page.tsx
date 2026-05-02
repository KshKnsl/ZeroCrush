"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn, useSession } from 'next-auth/react';
import { Input } from '@/components/ui/input';
import { useThemeContext } from '@/components/ui/ThemeContext';
import { toast } from 'sonner';
import { ArrowDownRight, BellRing, Radar, Shield } from 'lucide-react';

const highlights = [
  {
    icon: Shield,
    title: 'Live safety view',
    description: 'See crowd risk and safety signals in one clear dashboard.',
  },
  {
    icon: Radar,
    title: 'Multiple video inputs',
    description: 'Use RTSP or MP4 upload and track the stream status in real time.',
  },
  {
    icon: BellRing,
    title: 'Clear alerts and reports',
    description: 'Get quick alerts for unusual activity and review full session analytics later.',
  },
];

export default function HomePage() {
  const router = useRouter();
  const { status } = useSession();
  const [email, setEmail] = useState<string>('admin@gmail.com');
  const [password, setPassword] = useState<string>('admin123');
  const [loading, setLoading] = useState(false);
  const { theme, toggleTheme } = useThemeContext();

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/dashboard');
    }
  }, [router, status]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required.');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Authenticating your account...');

    try {
      const result = await signIn('credentials', {
        email: email.trim(),
        password: password.trim(),
        redirect: false,
      });

      if (!result || result.error) {
        toast.error('Invalid credentials.', { id: toastId });
        setLoading(false);
        return;
      }

      toast.success('Login successful. Redirecting to dashboard...', { id: toastId });
      router.push('/dashboard');
    } catch {
      toast.error('Network error. Failed to login.', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh px-4 py-5 transition-colors sm:px-6 sm:py-8">
      <div className="mx-auto grid w-full max-w-6xl gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="border border-slate-300/70 bg-white/70 p-4 shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/80 dark:shadow-[0_30px_70px_-28px_rgba(0,0,0,0.7)]">
          <div className="border border-slate-200/80 bg-[linear-gradient(165deg,#f8fbff_0%,#edf3ff_45%,#e9fff8_100%)] p-5 dark:border-slate-800 dark:bg-[linear-gradient(165deg,#0f1726_0%,#141f2f_50%,#0f2621_100%)] sm:p-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">CCTV Monitoring Platform</p>
              <button
                onClick={toggleTheme}
                className=" border border-slate-300 bg-white/75 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-700 transition-colors hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                {theme === 'dark' ? 'Light' : 'Dark'}
              </button>
            </div>

            <h1 className="mt-4 text-3xl font-semibold leading-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              Smart crowd monitoring, made simple.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
              This platform combines live video monitoring, safety alerts, and session analytics in one place.
              Sign in to start monitoring streams and reviewing insights.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => document.getElementById('login-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                className="inline-flex items-center gap-2  bg-emerald-900 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-white transition-colors hover:bg-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
              >
                Sign in
                <ArrowDownRight className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {highlights.map((item) => {
                const Icon = item.icon;
                return (
                  <article key={item.title} className=" border border-slate-300/70 bg-white/75 p-3 dark:border-slate-700 dark:bg-[#111111]/75">
                    <div className="inline-flex  border border-emerald-500/35 bg-emerald-100/70 p-2 text-emerald-900 dark:border-emerald-700/40 dark:bg-emerald-950/30 dark:text-emerald-200">
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="mt-3 text-sm font-semibold text-slate-900 dark:text-slate-100">{item.title}</h2>
                    <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{item.description}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section id="login-panel" className="border border-slate-300/70 bg-white/70 p-3 shadow-[0_22px_50px_-18px_rgba(15,23,42,0.35)] backdrop-blur dark:border-slate-700/70 dark:bg-[#0f141b]/80 dark:shadow-[0_30px_70px_-28px_rgba(0,0,0,0.7)]">
          <div className="overflow-hidden border border-slate-200/80 bg-[linear-gradient(165deg,#f8fbff_0%,#edf3ff_45%,#e9fff8_100%)] p-5 dark:border-slate-800 dark:bg-[linear-gradient(165deg,#0f1726_0%,#141f2f_50%,#0f2621_100%)] sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Secure access</p>
            <h2 className="mt-2 text-2xl font-semibold leading-tight text-slate-900 dark:text-slate-100">Sign in to continue</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Use your account to open the monitoring dashboard.
            </p>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="h-12  border border-slate-300 bg-white/80 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-12  border border-slate-300 bg-white/80 px-4 text-sm text-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-slate-700 dark:bg-[#121923] dark:text-slate-100"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-12 w-full  bg-emerald-900 text-sm font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-70 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900"
              >
                {loading ? 'Authenticating...' : 'Unlock Dashboard'}
              </button>
            </form>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className=" border border-slate-300/70 bg-white/75 px-3 py-2 dark:border-slate-700 dark:bg-[#111111]/75">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Live monitoring</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Watch stream health, crowd count, and active alerts.</p>
              </div>
              <div className=" border border-slate-300/70 bg-white/75 px-3 py-2 dark:border-slate-700 dark:bg-[#111111]/75">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">Session analytics</p>
                <p className="mt-1 text-xs text-slate-700 dark:text-slate-300">Review trend charts, incidents, and saved artifacts.</p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
