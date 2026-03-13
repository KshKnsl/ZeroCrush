export type UserRole = 'admin' | 'management';

export type DashboardTab = 'live' | 'registration' | 'gate' | 'upload' | 'access';

export const MANAGEMENT_TAB_OPTIONS = [
  { id: 'live', label: 'Live Monitoring' },
  { id: 'registration', label: 'Registration' },
  { id: 'gate', label: 'Gate Entry' },
  { id: 'upload', label: 'CSV Upload' },
] as const;

export type ManagementTab = (typeof MANAGEMENT_TAB_OPTIONS)[number]['id'];
export const DEFAULT_MANAGEMENT_TABS: ManagementTab[] = [...MANAGEMENT_TAB_OPTIONS.map((tab) => tab.id)];

export interface AppSession {
  role: UserRole;
  identifier: string;
  allowedTabs?: ManagementTab[];
}

export interface ManagementAccount {
  id: string;
  password: string;
  createdAt: string;
  allowedTabs: ManagementTab[];
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

function normalizeAllowedTabs(tabs?: string[] | null): ManagementTab[] {
  const fallback = [...DEFAULT_MANAGEMENT_TABS];
  if (!tabs || tabs.length === 0) return fallback;

  const valid = new Set(DEFAULT_MANAGEMENT_TABS);
  const unique = Array.from(new Set(tabs)).filter((tab): tab is ManagementTab => valid.has(tab as ManagementTab));

  return unique.length > 0 ? unique : fallback;
}

function normalizeAccount(account: Partial<ManagementAccount> & Pick<ManagementAccount, 'id' | 'password' | 'createdAt'>): ManagementAccount {
  return {
    id: account.id,
    password: account.password,
    createdAt: account.createdAt,
    allowedTabs: normalizeAllowedTabs(account.allowedTabs),
  };
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
    const parsed = JSON.parse(raw) as Array<Partial<ManagementAccount> & Pick<ManagementAccount, 'id' | 'password' | 'createdAt'>>;
    const normalized = parsed.map((account) => normalizeAccount(account));
    window.localStorage.setItem(MANAGEMENT_ACCOUNTS_KEY, JSON.stringify(normalized));
    return normalized;
  } catch {
    window.localStorage.removeItem(MANAGEMENT_ACCOUNTS_KEY);
    return [];
  }
}

export function authenticateManagement(id: string, password: string) {
  return getManagementAccounts().find((account) => account.id === id && account.password === password) ?? null;
}

export function createManagementAccount(id: string, password: string, allowedTabs: ManagementTab[]) {
  const normalizedId = id.trim();
  const normalizedPassword = password.trim();
  const normalizedAllowedTabs = normalizeAllowedTabs(allowedTabs);

  if (!normalizedId || !normalizedPassword) {
    return { ok: false as const, error: 'ID and password are required.' };
  }

  if (normalizedAllowedTabs.length === 0) {
    return { ok: false as const, error: 'Select at least one dashboard tab.' };
  }

  const accounts = getManagementAccounts();
  if (accounts.some((account) => account.id.toLowerCase() === normalizedId.toLowerCase())) {
    return { ok: false as const, error: 'That management ID already exists.' };
  }

  const nextAccount: ManagementAccount = {
    id: normalizedId,
    password: normalizedPassword,
    createdAt: new Date().toISOString(),
    allowedTabs: normalizedAllowedTabs,
  };

  if (isBrowser()) {
    window.localStorage.setItem(MANAGEMENT_ACCOUNTS_KEY, JSON.stringify([nextAccount, ...accounts]));
  }

  return { ok: true as const, account: nextAccount };
}

export function updateManagementAccountAccess(id: string, allowedTabs: ManagementTab[]) {
  const normalizedAllowedTabs = normalizeAllowedTabs(allowedTabs);

  if (normalizedAllowedTabs.length === 0) {
    return { ok: false as const, error: 'Select at least one dashboard tab.' };
  }

  const accounts = getManagementAccounts();
  const index = accounts.findIndex((account) => account.id === id);

  if (index === -1) {
    return { ok: false as const, error: 'Management account not found.' };
  }

  const updated = [...accounts];
  updated[index] = {
    ...updated[index],
    allowedTabs: normalizedAllowedTabs,
  };

  if (isBrowser()) {
    window.localStorage.setItem(MANAGEMENT_ACCOUNTS_KEY, JSON.stringify(updated));
  }

  return { ok: true as const, account: updated[index] };
}