"use client";

import { useEffect, useState } from 'react';
import { KeyRound, ShieldCheck, UserRoundPlus } from 'lucide-react';
import {
  createManagementAccount,
  DEFAULT_MANAGEMENT_TABS,
  getManagementAccounts,
  MANAGEMENT_TAB_OPTIONS,
  updateManagementAccountAccess,
  type ManagementAccount,
  type ManagementTab,
} from '@/lib/auth';

export default function ManagementAccess() {
  const [accounts, setAccounts] = useState<ManagementAccount[]>([]);
  const [managementId, setManagementId] = useState('manager-01');
  const [password, setPassword] = useState('manage123');
  const [newAccountTabs, setNewAccountTabs] = useState<ManagementTab[]>(DEFAULT_MANAGEMENT_TABS);
  const [editTabs, setEditTabs] = useState<Record<string, ManagementTab[]>>({});
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const existingAccounts = getManagementAccounts();
    setAccounts(existingAccounts);
    setEditTabs(
      Object.fromEntries(
        existingAccounts.map((account) => [account.id, account.allowedTabs])
      )
    );
  }, []);

  const toggleTab = (tabs: ManagementTab[], tab: ManagementTab) => {
    if (tabs.includes(tab)) {
      return tabs.filter((item) => item !== tab);
    }
    return [...tabs, tab];
  };

  const refreshAccounts = () => {
    const nextAccounts = getManagementAccounts();
    setAccounts(nextAccounts);
    setEditTabs(Object.fromEntries(nextAccounts.map((account) => [account.id, account.allowedTabs])));
  };

  const handleCreate = () => {
    const result = createManagementAccount(managementId, password, newAccountTabs);

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    refreshAccounts();
    setFeedback({ type: 'success', message: `Management account ${result.account.id} created.` });
    setManagementId(`manager-${String(getManagementAccounts().length + 1).padStart(2, '0')}`);
    setPassword('manage123');
    setNewAccountTabs(DEFAULT_MANAGEMENT_TABS);
  };

  const handleSaveAccess = (accountId: string) => {
    const currentTabs = editTabs[accountId] ?? [];
    const result = updateManagementAccountAccess(accountId, currentTabs);

    if (!result.ok) {
      setFeedback({ type: 'error', message: result.error });
      return;
    }

    refreshAccounts();
    setFeedback({ type: 'success', message: `Updated tab access for ${accountId}.` });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-slate-900 dark:text-white font-bold text-xl">Access Management</h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Create login IDs and passwords for management users.</p>
        </div>
        <div className="rounded-full border border-lime-300/60 bg-lime-50 px-4 py-2 text-xs font-medium uppercase tracking-[0.22em] text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300">
          Admin Only
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
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
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Password</label>
              <input
                type="text"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3.5 text-sm text-slate-900 focus:border-lime-500 focus:outline-none focus:ring-2 focus:ring-lime-500/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <p className="mb-2 block text-xs font-medium uppercase tracking-[0.22em] text-slate-500 dark:text-slate-400">Allowed Dashboard Tabs</p>
              <div className="grid grid-cols-2 gap-2">
                {MANAGEMENT_TAB_OPTIONS.map((tab) => {
                  const checked = newAccountTabs.includes(tab.id);
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setNewAccountTabs((prev) => toggleTab(prev, tab.id))}
                      className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${checked ? 'border-lime-500/60 bg-lime-50 text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-300' : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {feedback ? (
              <div className={`rounded-2xl border px-4 py-3 text-sm ${feedback.type === 'success' ? 'border-lime-300/60 bg-lime-50 text-lime-700 dark:border-lime-500/20 dark:bg-lime-500/10 dark:text-lime-300' : 'border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300'}`}>
                {feedback.message}
              </div>
            ) : null}

            <button
              onClick={handleCreate}
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
            >
              <KeyRound className="h-4 w-4" />
              Create Management Login
            </button>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Current Accounts</p>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Management roster</h3>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {accounts.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-400">
                No management accounts created yet.
              </div>
            ) : (
              accounts.map((account) => (
                <div key={account.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{account.id}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Created {new Date(account.createdAt).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Password</p>
                      <p className="text-sm font-mono text-slate-700 dark:text-slate-300">{account.password}</p>
                    </div>
                  </div>

                  <div className="mt-4">
                    <p className="mb-2 text-[11px] uppercase tracking-[0.22em] text-slate-400 dark:text-slate-500">Tab Access</p>
                    <div className="grid grid-cols-2 gap-2">
                      {MANAGEMENT_TAB_OPTIONS.map((tab) => {
                        const selectedTabs = editTabs[account.id] ?? account.allowedTabs;
                        const checked = selectedTabs.includes(tab.id);

                        return (
                          <button
                            key={`${account.id}-${tab.id}`}
                            type="button"
                            onClick={() => {
                              setEditTabs((prev) => {
                                const current = prev[account.id] ?? account.allowedTabs;
                                return {
                                  ...prev,
                                  [account.id]: toggleTab(current, tab.id),
                                };
                              });
                            }}
                            className={`rounded-xl border px-3 py-2 text-left text-xs font-medium transition-colors ${checked ? 'border-lime-500/60 bg-lime-50 text-lime-700 dark:border-lime-500/30 dark:bg-lime-500/10 dark:text-lime-300' : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSaveAccess(account.id)}
                      className="mt-3 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-lime-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      Save Access
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