export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-6 dark:bg-[#111111]">
      <div className="max-w-md border border-slate-300 bg-white p-8 text-center dark:border-slate-700 dark:bg-[#141b25]">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400 dark:text-slate-500">Offline</p>
        <h1 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-slate-100">No network connection</h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          ZeroCrush is installed and running offline mode. Reconnect to refresh dashboard data.
        </p>
      </div>
    </div>
  );
}