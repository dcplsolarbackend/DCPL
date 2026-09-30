import { User, ActivityLog, InAppNotification } from '../types/crm';
import { INITIAL_USERS } from '../data/initialUsers';

const USERS_STORAGE_KEY = 'crm_users_v2';
const CURRENT_USER_KEY = 'dcpl_crm_user';
const LEGACY_USER_KEY = 'crm_current_user_v2';
const ACTIVITY_STORAGE_KEY = 'crm_activity_logs_v2';
const NOTIFICATIONS_KEY = 'crm_notifications_v2';

export function loadUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    if (!raw) {
      saveUsers(INITIAL_USERS);
      return INITIAL_USERS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_USERS;
  } catch (err) {
    return INITIAL_USERS;
  }
}

export function saveUsers(users: User[]): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  } catch (err) {
    console.error(err);
  }
}

/**
 * Returns currently logged in user from localStorage.
 * If not logged in or inactive, returns null.
 */
export function getStoredUser(users: User[] = loadUsers()): User | null {
  try {
    const raw = localStorage.getItem(CURRENT_USER_KEY) || localStorage.getItem(LEGACY_USER_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const match = users.find((u) => u.email.toLowerCase() === (parsed.email || '').toLowerCase());
      if (match && match.status === 'Active') {
        return match;
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
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(user));
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
