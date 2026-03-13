export type UserRole = 'admin' | 'management';

export type DashboardTab = 'live' | 'registration' | 'gate' | 'upload' | 'access';

export interface AppSession {
  role: UserRole;
  identifier: string;
}

export interface ManagementAccount {
  id: string;
  password: string;
  createdAt: string;
}

export const ADMIN_CREDENTIALS = {
  email: 'abcd@gmail.com',
  password: 'abcd',
} as const;

const SESSION_KEY = 'zerocrush.session';
const MANAGEMENT_ACCOUNTS_KEY = 'zerocrush.management.accounts';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function authenticateAdmin(email: string, password: string) {
  return email === ADMIN_CREDENTIALS.email && password === ADMIN_CREDENTIALS.password;
}

export function getStoredSession() {
  if (!isBrowser()) return null;

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AppSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setStoredSession(session: AppSession) {
  if (!isBrowser()) return;
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  if (!isBrowser()) return;
  window.localStorage.removeItem(SESSION_KEY);
}

export function getManagementAccounts() {
  if (!isBrowser()) return [] as ManagementAccount[];

  const raw = window.localStorage.getItem(MANAGEMENT_ACCOUNTS_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw) as ManagementAccount[];
  } catch {
    window.localStorage.removeItem(MANAGEMENT_ACCOUNTS_KEY);
    return [];
  }
}

export function authenticateManagement(id: string, password: string) {
  return getManagementAccounts().find((account) => account.id === id && account.password === password) ?? null;
}

export function createManagementAccount(id: string, password: string) {
  const normalizedId = id.trim();
  const normalizedPassword = password.trim();

  if (!normalizedId || !normalizedPassword) {
    return { ok: false as const, error: 'ID and password are required.' };
  }

  const accounts = getManagementAccounts();
  if (accounts.some((account) => account.id.toLowerCase() === normalizedId.toLowerCase())) {
    return { ok: false as const, error: 'That management ID already exists.' };
  }

  const nextAccount: ManagementAccount = {
    id: normalizedId,
    password: normalizedPassword,
    createdAt: new Date().toISOString(),
  };

  if (isBrowser()) {
    window.localStorage.setItem(MANAGEMENT_ACCOUNTS_KEY, JSON.stringify([nextAccount, ...accounts]));
  }

  return { ok: true as const, account: nextAccount };
}