export type UserRole = 'admin' | 'management';

export type DashboardTab = 'live' | 'registration' | 'gate' | 'upload' | 'access';
export type ManagementTab = Exclude<DashboardTab, 'access'>;
const GATE_ASSIGNMENT_PREFIX = 'gate:';

export const MANAGEMENT_TAB_OPTIONS = [
  { id: 'live', label: 'Live Monitoring' },
  { id: 'registration', label: 'Registration' },
  { id: 'gate', label: 'Gate Entry' },
  { id: 'upload', label: 'Token Issuer' },
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
    label: 'Token Center Operator',
    description: 'Handles token issuance from Google Form CSV sync and walk-in counter requests.',
    responsibilities: 'Runs the token counter and resolves attendee token issuance issues.',
    tabs: ['registration', 'upload'],
  },
  {
    id: 'gate_supervisor',
    label: 'Security Guard',
    description: 'Controls entry throughput, lane utilization, and gate-side escalations.',
    responsibilities: 'Manages gate teams and keeps ingress moving safely.',
    tabs: ['gate', 'live'],
  },
  {
    id: 'data_coordinator',
    label: 'Data Coordinator',
    description: 'Maintains token manifests, Google Form CSV sync imports, and data accuracy.',
    responsibilities: 'Owns CSV sync reconciliation and token issuance data fixes.',
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
  gateNumber?: number | null;
}

export interface ManagementAccount {
  id: number;
  loginId: string;
  password: string;
  createdAt: string;
  role: VenueRole;
  eventId: number;
  gateNumber?: number | null;
  allowedTabs?: string[];
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

export function parseGateNumberFromAllowedTabs(tabs?: string[] | null): number | null {
  if (!tabs || tabs.length === 0) return null;
  const marker = tabs.find((tab) => tab.toLowerCase().startsWith(GATE_ASSIGNMENT_PREFIX));
  if (!marker) return null;
  const value = Number(marker.slice(GATE_ASSIGNMENT_PREFIX.length));
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.trunc(value);
}

export function withGateAssignment(tabs: string[] | null | undefined, gateNumber?: number | null): string[] {
  const cleaned = (tabs ?? []).filter((tab) => !tab.toLowerCase().startsWith(GATE_ASSIGNMENT_PREFIX));
  if (typeof gateNumber !== 'number' || !Number.isFinite(gateNumber) || gateNumber <= 0) {
    return cleaned;
  }
  return [...cleaned, `${GATE_ASSIGNMENT_PREFIX}${Math.trunc(gateNumber)}`];
}