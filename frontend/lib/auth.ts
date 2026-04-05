export type UserRole = 'ADMIN' | 'OPERATOR' | 'VIEWER';

export interface AppSession {
  id: number;
  email: string;
  role: UserRole;
  name: string | null;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Admin',
  OPERATOR: 'Operator',
  VIEWER: 'Viewer',
};

const SESSION_KEY = 'zerocrush.session';

function isBrowser() {
  return typeof window !== 'undefined';
}

export function getStoredSession(): AppSession | null {
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

export function hasPermission(role: UserRole | undefined, requiredRole: UserRole): boolean {
  if (!role) return false;
  if (role === 'ADMIN') return true;
  if (role === 'OPERATOR') return requiredRole === 'OPERATOR' || requiredRole === 'VIEWER';
  return requiredRole === 'VIEWER';
}

export function canManageUsers(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageSettings(role: UserRole | undefined): boolean {
  return role === 'ADMIN';
}

export function canManageEvents(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'OPERATOR';
}

export function canManageIncidents(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'OPERATOR';
}

export function canViewAnalytics(role: UserRole | undefined): boolean {
  return role === 'ADMIN' || role === 'OPERATOR' || role === 'VIEWER';
}

export function roleToClass(role: UserRole) {
  switch (role) {
    case 'ADMIN':
      return 'bg-rose-500/15 text-rose-700 dark:text-rose-300';
    case 'OPERATOR':
      return 'bg-sky-500/15 text-sky-700 dark:text-sky-300';
    default:
      return 'bg-slate-500/15 text-slate-700 dark:text-slate-300';
  }
}