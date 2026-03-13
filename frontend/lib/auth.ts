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
  eventId?: number;
  eventName?: string;
}

export interface ManagementAccount {
  id: number;
  loginId: string;
  password: string;
  createdAt: string;
  allowedTabs: ManagementTab[];
  eventId: number;
}

export const ADMIN_CREDENTIALS = {
  email: 'abcd@gmail.com',
  password: 'abcd',
} as const;

const SESSION_KEY = 'zerocrush.session';

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

export function normalizeManagementTabs(tabs?: string[] | null): ManagementTab[] {
  return normalizeAllowedTabs(tabs);
}