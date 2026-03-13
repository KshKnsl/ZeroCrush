export type UserRole = 'admin' | 'management';

export type DashboardTab = 'live' | 'registration' | 'gate' | 'upload' | 'access';
export type ManagementTab = Exclude<DashboardTab, 'access'>;

export const MANAGEMENT_TAB_OPTIONS = [
  { id: 'live', label: 'Live Monitoring' },
  { id: 'registration', label: 'Registration' },
  { id: 'gate', label: 'Gate Entry' },
  { id: 'upload', label: 'CSV Upload' },
] as const satisfies ReadonlyArray<{ id: ManagementTab; label: string }>;

export const DEFAULT_MANAGEMENT_TABS: ManagementTab[] = [...MANAGEMENT_TAB_OPTIONS.map((tab) => tab.id)];

export const VENUE_ROLE_OPTIONS = [
  {
    id: 'crowd_operations_lead',
    label: 'Crowd Operations Lead',
    description: 'Owns live operations across crowd flow, registration pressure, and venue entry.',
    responsibilities: 'Oversees the whole event floor and coordinates all operational teams.',
    tabs: ['live', 'registration', 'gate', 'upload'],
  },
  {
    id: 'safety_officer',
    label: 'Safety Officer',
    description: 'Focuses on density, risk escalation, and incident prevention at active gates.',
    responsibilities: 'Monitors live risk signals and supervises crowd movement at entry points.',
    tabs: ['live', 'gate'],
  },
  {
    id: 'registration_lead',
    label: 'Registration Lead',
    description: 'Handles attendee check-in quality, queue balancing, and desk staffing.',
    responsibilities: 'Runs registration desks and resolves attendee intake issues.',
    tabs: ['registration', 'upload'],
  },
  {
    id: 'gate_supervisor',
    label: 'Gate Supervisor',
    description: 'Controls entry throughput, lane utilization, and gate-side escalations.',
    responsibilities: 'Manages gate teams and keeps ingress moving safely.',
    tabs: ['gate', 'live'],
  },
  {
    id: 'data_coordinator',
    label: 'Data Coordinator',
    description: 'Maintains attendee manifests, uploads, and registration data accuracy.',
    responsibilities: 'Owns roster imports, reconciliation, and registration data fixes.',
    tabs: ['upload', 'registration'],
  },
  {
    id: 'incident_commander',
    label: 'Incident Commander',
    description: 'Leads response when crowd pressure or venue incidents require cross-team action.',
    responsibilities: 'Coordinates safety response using live monitoring, gate control, and attendee status.',
    tabs: ['live', 'gate', 'registration'],
  },
] as const satisfies ReadonlyArray<{
  id: string;
  label: string;
  description: string;
  responsibilities: string;
  tabs: readonly ManagementTab[];
}>;

export type VenueRole = (typeof VENUE_ROLE_OPTIONS)[number]['id'];
export const DEFAULT_VENUE_ROLE: VenueRole = 'crowd_operations_lead';

export interface AppSession {
  role: UserRole;
  identifier: string;
  managementRole?: VenueRole;
  allowedTabs?: ManagementTab[];
  eventId?: number;
  eventName?: string;
}

export interface ManagementAccount {
  id: number;
  loginId: string;
  password: string;
  createdAt: string;
  role: VenueRole;
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

export function normalizeVenueRole(role?: string | null): VenueRole {
  if (!role) return DEFAULT_VENUE_ROLE;

  const matchedRole = VENUE_ROLE_OPTIONS.find((option) => option.id === role);
  return matchedRole?.id ?? DEFAULT_VENUE_ROLE;
}

export function getRoleDefinition(role?: string | null) {
  const normalizedRole = normalizeVenueRole(role);
  return VENUE_ROLE_OPTIONS.find((option) => option.id === normalizedRole) ?? VENUE_ROLE_OPTIONS[0];
}

export function getTabsForManagementRole(role?: string | null): ManagementTab[] {
  return [...getRoleDefinition(role).tabs];
}

export function getTabsForSession(session: AppSession | null | undefined): ManagementTab[] {
  if (!session) return [...DEFAULT_MANAGEMENT_TABS];
  if (session.role === 'admin') return [...DEFAULT_MANAGEMENT_TABS];
  if (session.managementRole) return getTabsForManagementRole(session.managementRole);
  return normalizeAllowedTabs(session.allowedTabs);
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