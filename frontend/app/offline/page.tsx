export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6 dark:bg-slate-950">
      <div className="max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Offline</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">No network connection</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          ZeroCrush is installed and running offline mode. Reconnect to refresh dashboard data.
        </p>
      </div>
    </div>
  );
}