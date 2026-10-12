import { User, ActivityLog, InAppNotification } from '../types/crm';
import { INITIAL_USERS } from '../data/initialUsers';

const USERS_STORAGE_KEY = 'crm_users_v2';
const CURRENT_USER_KEY = 'dcpl_crm_user';
const LEGACY_USER_KEY = 'crm_current_user_v2';
const ACTIVITY_STORAGE_KEY = 'crm_activity_logs_v2';
const NOTIFICATIONS_KEY = 'crm_notifications_v2';

// 5 Days Session Duration (in milliseconds)
export const SESSION_DURATION_MS = 5 * 24 * 60 * 60 * 1000;

function normalizeEmail(val: string | undefined | null): string {
  return String(val || '').trim().toLowerCase();
}

export function ensureUniqueIds(users: User[]): User[] {
  const usedIds = new Set<string>();
  return (users || []).map((u, idx) => {
    let uid = String(u.id || `USR-${String(idx + 1).padStart(2, '0')}`).trim();
    if (usedIds.has(uid)) {
      uid = `USR-${String(idx + 1).padStart(2, '0')}-${Math.floor(100 + Math.random() * 900)}`;
    }
    usedIds.add(uid);
    return {
      ...u,
      id: uid,
      email: normalizeEmail(u.email),
      password: String(u.password || 'dcpl123').trim(),
    };
  });
}

export function mergeUsersList(existingUsers: User[], incomingUsers: User[]): User[] {
  const map = new Map<string, User>();
  for (const u of existingUsers || []) {
    const key = normalizeEmail(u.email || u.id);
    if (key) {
      map.set(key, {
        ...u,
        email: normalizeEmail(u.email),
        password: String(u.password || 'dcpl123').trim(),
      });
    }
  }
  for (const u of incomingUsers || []) {
    const key = normalizeEmail(u.email || u.id);
    if (!key) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, {
        ...u,
        email: normalizeEmail(u.email),
        password: String(u.password || 'dcpl123').trim(),
      });
    } else {
      const prevTime = Number(prev.updatedAt || 0);
      const incTime = Number(u.updatedAt || 0);
      if (incTime >= prevTime) {
        map.set(key, {
          ...prev,
          ...u,
          email: normalizeEmail(u.email || prev.email),
          password: String(u.password || prev.password || 'dcpl123').trim(),
          updatedAt: Math.max(prevTime, incTime),
        });
      } else {
        map.set(key, {
          ...u,
          ...prev,
          email: normalizeEmail(prev.email || u.email),
          password: String(prev.password || u.password || 'dcpl123').trim(),
          updatedAt: prevTime,
        });
      }
    }
  }
  return ensureUniqueIds(Array.from(map.values()));
}

export function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      const initial = ensureUniqueIds(INITIAL_USERS);
      saveUsers(initial, false);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return mergeUsersList(INITIAL_USERS, parsed);
    }
    return ensureUniqueIds(INITIAL_USERS);
  } catch (err) {
    return ensureUniqueIds(INITIAL_USERS);
  }
}

export function saveUsers(users: User[], syncToServer = true): void {
  try {
    const normalized = ensureUniqueIds(users);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(normalized));
    if (syncToServer && typeof window !== 'undefined') {
      fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: normalized }),
      }).catch(() => {});

      // Also sync users to Google Sheet "Users" tab if webAppUrl is configured
      const rawCfg = localStorage.getItem('crm_sheet_sync_config_v3');
      const webAppUrl = rawCfg ? JSON.parse(rawCfg)?.webAppUrl : localStorage.getItem('dcpl_apps_script_url');
      if (webAppUrl) {
        fetch('/api/sheet-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl,
            method: 'POST',
            payload: { action: 'saveUsers', users: normalized },
          }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.error(err);
  }
}

export async function upsertUserInStorage(user: User, previousEmail?: string): Promise<User[]> {
  const cleanNewEmail = normalizeEmail(user.email);
  const cleanPrevEmail = normalizeEmail(previousEmail || user.email);
  const stampedUser: User = {
    ...user,
    email: cleanNewEmail,
    password: String(user.password || 'dcpl123').trim(),
    updatedAt: Date.now(),
  };

  const currentLocal = loadUsers();
  let matched = false;
  const updatedLocal = currentLocal.map((u) => {
    const uEmail = normalizeEmail(u.email);
    if (uEmail === cleanPrevEmail || uEmail === cleanNewEmail || (u.id === stampedUser.id && uEmail === cleanPrevEmail)) {
      matched = true;
      return { ...u, ...stampedUser };
    }
    return u;
  });

  if (!matched) {
    updatedLocal.unshift(stampedUser);
  }

  const dedupedLocal = mergeUsersList([], updatedLocal);
  saveUsers(dedupedLocal, true);

  try {
    const res = await fetch('/api/users/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: stampedUser, previousEmail: cleanPrevEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users) && data.users.length > 0) {
        const merged = mergeUsersList(dedupedLocal, data.users);
        saveUsers(merged, false);
        return merged;
      }
    }
  } catch {
    // Fallback already saved in localStorage
  }

  return dedupedLocal;
}

export async function deleteUserFromStorage(userId: string, email: string): Promise<User[]> {
  const cleanTargetEmail = normalizeEmail(email);
  const currentLocal = loadUsers().filter((u) => {
    const uEmail = normalizeEmail(u.email);
    if (cleanTargetEmail && uEmail === cleanTargetEmail) return false;
    if (userId && u.id === userId && !cleanTargetEmail) return false;
    return true;
  });
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(currentLocal));

  try {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, email: cleanTargetEmail }),
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.users)) {
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(data.users));
        return data.users;
      }
    }
  } catch {
    // Fallback local
  }
  return currentLocal;
}

export async function fetchServerUsers(): Promise<User[]> {
  const localBeforeFetch = loadUsers();
  try {
    const res = await fetch('/api/state');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.users) && data.users.length > 0) {
        const merged = mergeUsersList(localBeforeFetch, data.users);
        localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    }
  } catch (e) {
    // Fallback to local
  }
  return localBeforeFetch;
}

/**
 * Returns currently logged in user from localStorage.
 * Persists across page refreshes and browser restarts for 5 days or until explicit logout.
 */
export function getStoredUser(users: User[] = loadUsers()): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Session Expiry Check (5 days limit)
      if (parsed.expiryAt && Date.now() > parsed.expiryAt) {
        localStorage.removeItem(CURRENT_USER_KEY);
        localStorage.removeItem(LEGACY_USER_KEY);
        return null;
      }

      const loggedInAt = parsed.loggedInAt || Date.now();
      const expiryAt = parsed.expiryAt && parsed.expiryAt - loggedInAt >= SESSION_DURATION_MS
        ? parsed.expiryAt
        : loggedInAt + SESSION_DURATION_MS;

      const match = users.find((u) => u.email.toLowerCase() === (parsed.email || '').toLowerCase());
      if (match) {
        if (match.status !== 'Active') {
          localStorage.removeItem(CURRENT_USER_KEY);
          localStorage.removeItem(LEGACY_USER_KEY);
          return null;
        }
        const mergedUser: User = {
          ...parsed,
          ...match,
          loggedInAt,
          expiryAt,
        };
        return mergedUser;
      }
      if (parsed.status !== 'Inactive') {
        return {
          ...parsed,
          loggedInAt,
          expiryAt,
        };
      }
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export function getCurrentUser(users: User[]): User | null {
  return getStoredUser(users);
}

export function setStoredUser(user: User | null): void {
  try {
    if (user) {
      const now = Date.now();
      const userWithSession: User = {
        ...user,
        loggedInAt: user.loggedInAt || now,
        expiryAt: user.expiryAt || now + SESSION_DURATION_MS,
      };
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userWithSession));
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userWithSession));
    } else {
      localStorage.removeItem(CURRENT_USER_KEY);
      localStorage.removeItem(LEGACY_USER_KEY);
    }
  } catch (err) {
    console.error(err);
  }
}

export function setCurrentUser(user: User): void {
  setStoredUser(user);
}

export function logoutUser(): void {
  setStoredUser(null);
}

export function loadActivityLogs(): ActivityLog[] {
  try {
    const raw = localStorage.getItem(ACTIVITY_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error(err);
  }
  return [
    {
      id: 'ACT-01',
      userEmail: 'dcplsolarbackend@gmail.com',
      userName: 'DCPL Solar Admin',
      userRole: 'Admin',
      action: 'SHEET_SYNC',
      details: 'Initial Google Sheet two-way synchronization connected',
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    },
    {
      id: 'ACT-02',
      userEmail: 'amit.verma@dcplsolar.com',
      userName: 'Amit Verma',
      userRole: 'Sales Executive',
      action: 'UPDATE_STAGE',
      leadId: 'LD-1023',
      leadName: 'Vikram Singh Shekhawat',
      details: 'Stage updated from "Converted" to "Quotation"',
      timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
    },
    {
      id: 'ACT-03',
      userEmail: 'deepak.joshi@dcplsolar.com',
      userName: 'Deepak Joshi',
      userRole: 'Operations Engineer',
      action: 'UPDATE_STAGE',
      leadId: 'LD-1025',
      leadName: 'Rameshwar Lal & Sons Cold Storage',
      details: 'Dispatched 150kW inverters and structure mounting components',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
  ];
}

export function logActivity(log: Omit<ActivityLog, 'id' | 'timestamp'>): ActivityLog {
  const currentLogs = loadActivityLogs();
  const newLog: ActivityLog = {
    ...log,
    id: `ACT-${Date.now()}`,
    timestamp: new Date().toISOString(),
  };
  const updated = [newLog, ...currentLogs.slice(0, 99)]; // Keep latest 100
  try {
    localStorage.setItem(ACTIVITY_STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error(e);
  }
  return newLog;
}

export function loadNotifications(): InAppNotification[] {
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [
    {
      id: 'NOTIF-01',
      title: 'New Lead Assigned',
      message: 'Rajesh Sharma (5kW Rooftop) was assigned to Amit Verma',
      timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
      read: false,
      type: 'lead_assigned',
      targetLeadId: 'LD-1021',
    },
    {
      id: 'NOTIF-02',
      title: 'Net Meter Sanction Received',
      message: 'Kothari Hospital DISCOM sanction approved! Move to Net Meter stage.',
      timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      read: false,
      type: 'stage_changed',
      targetLeadId: 'LD-1024',
    },
    {
      id: 'NOTIF-03',
      title: 'Payment Outstanding Alert',
      message: 'Rameshwar Lal Cold Storage has ₹2,50,000 pending on Material Dispatch.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      read: false,
      type: 'payment_due',
      targetLeadId: 'LD-1025',
    },
  ];
}

export function saveNotifications(notifications: InAppNotification[]): void {
  try {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
  } catch (e) {
    console.error(e);
  }
}

export function addNotification(notif: Omit<InAppNotification, 'id' | 'timestamp' | 'read'>): InAppNotification {
  const current = loadNotifications();
  const created: InAppNotification = {
    ...notif,
    id: `NOTIF-${Date.now()}`,
    timestamp: new Date().toISOString(),
    read: false,
  };
  const updated = [created, ...current.slice(0, 49)];
  saveNotifications(updated);
  return created;
}
