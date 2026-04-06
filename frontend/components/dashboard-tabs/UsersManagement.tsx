"use client";

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getStoredSession } from '@/lib/auth';

interface User {
  id: number;
  name: string | null;
  email: string;
  role: 'ADMIN' | 'OPERATOR' | 'VIEWER';
  createdAt: string;
}

export default function UsersManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const session = getStoredSession();

  const headers = {
    'Content-Type': 'application/json',
    'x-user-role': session?.role ?? '',
    'x-user-id': session?.id ? String(session.id) : '',
  };
  
  // Create user form
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'OPERATOR' | 'VIEWER'>('VIEWER');
  const [createLoading, setCreateLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { headers });
      const data = await res.json();
      if (data.users) setUsers(data.users);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreateLoading(true);

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name, email, password, role }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create user');
      } else {
        setName('');
        setEmail('');
        setPassword('');
        setRole('VIEWER');
        await fetchUsers();
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE', headers });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Role & Users Management</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">Manage dashboard access roles across your organization.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Add User Account</h3>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div>
              <label className="mb-1 block text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} className="dark:bg-[#151515] dark:border-slate-800 bg-slate-50" placeholder="John Doe" />
            </div>
            <div>
              <label className="mb-1 block text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">Email Address</label>
              <Input value={email} onChange={e => setEmail(e.target.value)} type="email" required className="dark:bg-[#151515] dark:border-slate-800 bg-slate-50" placeholder="user@zerocrush.io" />
            </div>
            <div>
              <label className="mb-1 block text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">Password</label>
              <Input value={password} onChange={e => setPassword(e.target.value)} type="password" required className="dark:bg-[#151515] dark:border-slate-800 bg-slate-50" />
            </div>
            <div>
              <label className="mb-1 block text-xs tracking-wider text-slate-500 uppercase dark:text-slate-400">Role</label>
              <Select value={role} onValueChange={(val: any) => setRole(val)}>
                <SelectTrigger className="dark:bg-[#151515] dark:border-slate-800 bg-slate-50">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEWER">Viewer (Read-only alerts)</SelectItem>
                  <SelectItem value="OPERATOR">Operator (Manage incidents)</SelectItem>
                  <SelectItem value="ADMIN">Admin (Full Control)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-rose-500 text-xs">{error}</p>}
                <Button disabled={createLoading} className="w-full bg-emerald-900 text-white hover:bg-emerald-800 dark:bg-emerald-950 dark:text-emerald-100 dark:hover:bg-emerald-900">
              Create Account
            </Button>
          </form>
        </div>

        <div className="lg:col-span-2 border border-slate-300 bg-slate-50 p-5 dark:border-slate-700 dark:bg-[#141b25]">
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-4">Active Accounts</h3>
          {loading ? (
            <p className="text-sm text-slate-500">Loading accounts...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-slate-500 dark:text-slate-400">
                <thead className="text-xs uppercase bg-slate-50 text-slate-700 dark:bg-[#151515] dark:text-slate-300 rounded-lg">
                  <tr>
                    <th scope="col" className="px-4 py-3 rounded-l-lg">Name</th>
                    <th scope="col" className="px-4 py-3">Email</th>
                    <th scope="col" className="px-4 py-3">Role</th>
                    <th scope="col" className="px-4 py-3 text-right rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-[#131313] transition-colors">
                      <td className="px-4 py-4 font-medium text-slate-900 dark:text-slate-200">{u.name || '-'}</td>
                      <td className="px-4 py-4">{u.email}</td>
                      <td className="px-4 py-4">
                        <span className={`px-2 py-1 text-xs border ${
                          u.role === 'ADMIN' ? 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-700' :
                          u.role === 'OPERATOR' ? 'bg-slate-200 text-slate-700 border-slate-300 dark:bg-slate-700/40 dark:text-slate-200 dark:border-slate-600' :
                          'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        {u.id !== 0 && (
                          <button onClick={() => handleDelete(u.id)} className="text-rose-500 hover:text-rose-700 transition-colors text-xs font-semibold uppercase tracking-wider">
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {users.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500 dark:text-slate-500">
                        No user accounts. Create one to begin.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
