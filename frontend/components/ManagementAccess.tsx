"use client";

import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, UserRoundPlus } from 'lucide-react';
import {
  DEFAULT_VENUE_ROLE,
  VENUE_ROLE_OPTIONS,
  getRoleDefinition,
  type ManagementAccount,
  type VenueRole,
} from '@/lib/auth';

interface ManagementAccessProps {
  eventId: number;
  eventName: string;
}

export default function ManagementAccess({ eventId, eventName }: ManagementAccessProps) {
  const [accounts, setAccounts] = useState<ManagementAccount[]>([]);
  const [managementId, setManagementId] = useState('manager-01');
  const [password, setPassword] = useState('manage123');
  const [newAccountRole, setNewAccountRole] = useState<VenueRole>(DEFAULT_VENUE_ROLE);
  const [editRoles, setEditRoles] = useState<Record<string, VenueRole>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const loadAccounts = async () => {
    const requestKey = Date.now();
    const response = await fetch(`/api/management?eventId=${eventId}&_r=${requestKey}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-store',
        Pragma: 'no-cache',
      },
    });
    const data = await response.json();
    if (!response.ok) {
      setFeedback({ type: 'error', message: data.error || 'Could not load management accounts.' });
      return;
    }

    const existingAccounts = (data.accounts ?? []) as ManagementAccount[];
    setAccounts(existingAccounts);
    setEditRoles(Object.fromEntries(existingAccounts.map((account) => [String(account.id), account.role])));
  };

  useEffect(() => {
    void loadAccounts();
  }, [eventId]);

  const refreshAccounts = () => {
    void (async () => {
      try {
        await loadAccounts();
      } catch {
        setFeedback({ type: 'error', message: 'Could not refresh management accounts.' });
      }
    })();
  };

  const handleCreate = async () => {
    const response = await fetch('/api/management', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        eventId,
        loginId: managementId,
        password,
        role: newAccountRole,
      }),
    });
    const data = await response.json();

    if (!response.ok) {
      setFeedback({ type: 'error', message: data.error || 'Could not create account.' });
      return;
    }

    refreshAccounts();
    setFeedback({ type: 'success', message: `Management account ${data.account.loginId} created.` });
    setManagementId(`manager-${String(accounts.length + 2).padStart(2, '0')}`);
    setPassword('manage123');
    setNewAccountRole(DEFAULT_VENUE_ROLE);
  };

  const handleSaveRole = async (accountId: number) => {
    const currentRole = editRoles[String(accountId)] ?? DEFAULT_VENUE_ROLE;
    const response = await fetch(`/api/management/${accountId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: currentRole }),
    });
    const data = await response.json();

    if (!response.ok) {
      setFeedback({ type: 'error', message: data.error || 'Could not update role.' });
      return;
    }

    refreshAccounts();
    setFeedback({ type: 'success', message: `Updated assigned role for ${data.account.loginId}.` });
  };

  const selectedRole = getRoleDefinition(newAccountRole);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 dark:text-white font-bold text-xl">Role Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create staff credentials and assign venue crowd-management roles for {eventName}.</p>
        </div>
        <div className="rounded-full border border-lime-300/60 bg-lime-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300">
          Admin Only
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-lime-100 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300">
              <UserRoundPlus className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">New Account</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Create management credentials</h3>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Management ID</label>
              <input
                type="text"
                value={managementId}
                onChange={(event) => setManagementId(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Password</label>
              <input
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-100"
              />
            </div>

            <div>
              <p className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Venue Role</p>
              <div className="grid gap-2">
                {VENUE_ROLE_OPTIONS.map((role) => {
                  const checked = newAccountRole === role.id;
                  return (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => setNewAccountRole(role.id)}
                      className={`rounded-2xl border px-4 py-3 text-left transition-colors ${checked ? 'border-lime-500/60 bg-lime-50 text-lime-800 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-200' : 'border-slate-300 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-300'}`}
                    >
                      <p className="text-sm font-semibold">{role.label}</p>
                      <p className="mt-1 text-xs opacity-80">{role.description}</p>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#111111]/60 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-slate-100">{selectedRole.label}</p>
                <p className="mt-1">{selectedRole.responsibilities}</p>
                <p className="mt-2 text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Dashboard modules</p>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{selectedRole.tabs.join(' • ')}</p>
              </div>
            </div>

            {feedback ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-lime-300/60 bg-lime-50 text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300' : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                {feedback.message}
              </div>
            ) : null}

            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-[#111111] dark:text-slate-100 dark:hover:bg-[#151515]"
            >
              <KeyRound className="h-4 w-4" />
              Create Role Login
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-[#111111]">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-[#111111] dark:text-slate-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Current Accounts</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Management roster</h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-400">
                No management accounts created yet.
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-[#111111]/60">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{account.loginId}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Created {new Date(account.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Password</p>
                      <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{account.password}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Assigned Role</p>
                    <select
                      value={editRoles[String(account.id)] ?? account.role}
                      onChange={(event) => {
                        setEditRoles((prev) => ({
                          ...prev,
                          [String(account.id)]: event.target.value as VenueRole,
                        }));
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-200"
                    >
                      {VENUE_ROLE_OPTIONS.map((role) => (
                        <option key={`${account.id}-${role.id}`} value={role.id}>
                          {role.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-[#111111] dark:text-slate-300">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{getRoleDefinition(editRoles[String(account.id)] ?? account.role).label}</p>
                      <p className="mt-1">{getRoleDefinition(editRoles[String(account.id)] ?? account.role).responsibilities}</p>
                      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">Modules: {getRoleDefinition(editRoles[String(account.id)] ?? account.role).tabs.join(' • ')}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSaveRole(account.id)}
                      className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-lime-500 dark:border-slate-700 dark:bg-[#111111] dark:text-slate-300"
                    >
                      Save Role
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}