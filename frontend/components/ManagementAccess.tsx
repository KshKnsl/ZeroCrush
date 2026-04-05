"use client";

interface ManagementAccessProps {
  eventId: number;
  eventName: string;
}

export default function ManagementAccess({ eventName }: ManagementAccessProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#111111]">
      <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Role Management</h2>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
        Legacy management accounts were removed. Use the main user admin screen for {eventName}.
      </p>
    </div>
  );
}
