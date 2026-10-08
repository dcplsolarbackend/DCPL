import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const STORE_FILE = path.join(__dirname, 'crm-server-store.json');

app.use(express.json({ limit: '15mb' }));

// Default initial users so any device can log in immediately
const DEFAULT_USERS = [
  {
    id: 'USR-01',
    name: 'DCPL Solar Admin',
    email: 'dcplsolarbackend@gmail.com',
    password: 'admin',
    role: 'Admin',
    status: 'Active',
    phone: '+919876543210',
    lastActive: 'Online now',
    createdAt: '2026-09-01',
  },
  {
    id: 'USR-02',
    name: 'Gurupreet Raj',
    email: 'gurupreetraj12@gmail.com',
    password: 'sales',
    role: 'Sales Executive',
    status: 'Active',
    phone: '+918273684253',
    lastActive: 'Active today',
    createdAt: '2026-09-02',
  },
  {
    id: 'USR-03',
    name: 'Amit Verma',
    email: 'amit.verma@dcplsolar.com',
    password: 'sales',
    role: 'Sales Executive',
    status: 'Active',
    phone: '+919823456780',
    lastActive: '12 mins ago',
    createdAt: '2026-09-05',
  },
  {
    id: 'USR-04',
    name: 'Deepak Joshi',
    email: 'deepak.joshi@dcplsolar.com',
    password: 'ops',
    role: 'Operations Engineer',
    status: 'Active',
    phone: '+919934567800',
    lastActive: '2 hours ago',
    createdAt: '2026-09-10',
  },
  {
    id: 'USR-05',
    name: 'Sunita Rao',
    email: 'sunita.rao@dcplsolar.com',
    password: 'sales',
    role: 'Sales Manager',
    status: 'Active',
    phone: '+919811223340',
    lastActive: '35 mins ago',
    createdAt: '2026-09-05',
  },
  {
    id: 'USR-06',
    name: 'Rahul Mehta',
    email: 'accounts@dcplsolar.com',
    password: 'accounts',
    role: 'Accounts Manager',
    status: 'Active',
    phone: '+919414012300',
    lastActive: '4 hours ago',
    createdAt: '2026-09-12',
  },
  {
    id: 'USR-07',
    name: 'Pawan Sharma',
    email: 'pawan.installer@dcplsolar.com',
    password: 'ops',
    role: 'Operations Engineer',
    status: 'Inactive',
    phone: '+919845098700',
    lastActive: '3 days ago',
    createdAt: '2026-09-15',
  },
  {
    id: 'USR-08',
    name: 'Ankur Jain',
    email: 'ankurjain198606@gmail.com',
    password: 'sales',
    role: 'Sales Executive',
    status: 'Active',
    phone: '+919359975775',
    lastActive: 'Active today',
    createdAt: '2026-09-02',
  },
  {
    id: 'USR-09',
    name: 'Akash Kumar',
    email: 'akashkumar7310586822@gmail.com',
    password: 'admin',
    role: 'Operations Engineer',
    status: 'Active',
    phone: '+917310586822',
    lastActive: 'Active today',
    createdAt: '2026-08-21',
  },
];

function mergeUsersLists(existingUsers: any[], incomingUsers: any[]) {
  const map = new Map<string, any>();
  for (const u of existingUsers || []) {
    const key = String(u.email || u.id || '').trim().toLowerCase();
    if (key) map.set(key, u);
  }
  for (const u of incomingUsers || []) {
    const key = String(u.email || u.id || '').trim().toLowerCase();
    if (!key) continue;
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, ...u } : u);
  }
  return Array.from(map.values());
}

function readServerStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = DEFAULT_USERS;
      } else {
        parsed.users = mergeUsersLists(DEFAULT_USERS, parsed.users);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading server store:', err);
  }
  return {
    users: DEFAULT_USERS,
    leads: null,
    payments: null,
    syncConfig: null,
    stagePermissions: null,
    stageMandatoryRules: null,
    columnPermissions: null,
    updatedAt: new Date().toISOString(),
  };
}

function writeServerStore(data: any) {
  try {
    const current = readServerStore();
    const merged = {
      ...current,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(STORE_FILE, JSON.stringify(merged, null, 2), 'utf-8');
    return merged;
  } catch (err) {
    console.error('Error writing server store:', err);
    return data;
  }
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Get shared multi-device CRM state (users, permissions, syncConfig, leads, payments)
app.get('/api/state', (_req, res) => {
  const store = readServerStore();
  res.json({
    status: 'success',
    ...store,
  });
});

// Save shared multi-device CRM state
app.post('/api/state', (req, res) => {
  const body = req.body || {};
  const current = readServerStore();
  const next = { ...current };

  if (Array.isArray(body.users) && body.users.length > 0) {
    // Merge users so custom users added by Admin are preserved across all devices
    next.users = mergeUsersLists(current.users || DEFAULT_USERS, body.users);
  }
  if (Array.isArray(body.leads)) {
    next.leads = body.leads;
  }
  if (Array.isArray(body.payments)) {
    next.payments = body.payments;
  }
  if (body.syncConfig && typeof body.syncConfig === 'object') {
    next.syncConfig = { ...(current.syncConfig || {}), ...body.syncConfig };
  }
  if (body.stagePermissions && typeof body.stagePermissions === 'object') {
    next.stagePermissions = body.stagePermissions;
  }
  if (body.stageMandatoryRules && typeof body.stageMandatoryRules === 'object') {
    next.stageMandatoryRules = body.stageMandatoryRules;
  }
  if (Array.isArray(body.columnPermissions)) {
    next.columnPermissions = body.columnPermissions;
  }

  const saved = writeServerStore(next);
  res.json({ status: 'success', users: saved.users, updatedAt: saved.updatedAt });
});

// Multi-device Authentication Endpoint
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, webAppUrl } = req.body || {};
    const cleanEmail = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanEmail || !cleanPassword) {
      res.status(400).json({ status: 'error', message: 'Email and password are required.' });
      return;
    }

    const store = readServerStore();
    const usersList: any[] = Array.isArray(store.users) && store.users.length > 0 ? store.users : DEFAULT_USERS;

    // 1. Check Server Store Users first (reflects Admin's latest user settings across all devices)
    const matchedLocal = usersList.find(
      (u: any) => String(u.email || '').trim().toLowerCase() === cleanEmail
    );

    if (matchedLocal) {
      if (matchedLocal.status === 'Inactive') {
        res.json({ status: 'error', message: 'Account Suspended / Inactive. Contact Admin.' });
        return;
      }
      const storedPass = String(matchedLocal.password || '').trim();
      if (!storedPass || storedPass === cleanPassword || storedPass.toLowerCase() === cleanPassword.toLowerCase()) {
        res.json({
          status: 'success',
          user: matchedLocal,
        });
        return;
      }
    }

    // 2. Also check Google Sheet "Users" tab via webAppUrl if configured
    const targetUrl = String(webAppUrl || store.syncConfig?.webAppUrl || '').trim();
    if (targetUrl) {
      try {
        const sheetRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'login',
            email: cleanEmail,
            password: cleanPassword,
          }),
          redirect: 'follow',
        });

        if (sheetRes.ok) {
          const text = await sheetRes.text();
          const sheetData = JSON.parse(text);
          if (sheetData.status === 'success' && sheetData.user) {
            const syncedUser = {
              id: sheetData.user.id || `USR-${Date.now()}`,
              name: sheetData.user.name || cleanEmail.split('@')[0],
              email: sheetData.user.email || cleanEmail,
              password: cleanPassword,
              role: sheetData.user.role || 'Sales Executive',
              status: sheetData.user.status || 'Active',
              phone: sheetData.user.phone || '',
              lastActive: 'Just now',
              createdAt: new Date().toISOString().split('T')[0],
            };
            // Merge into server store so future logins are instant
            const exists = usersList.some((u: any) => String(u.email || '').toLowerCase() === cleanEmail);
            const updatedUsers = exists
              ? usersList.map((u: any) => (String(u.email || '').toLowerCase() === cleanEmail ? { ...u, ...syncedUser } : u))
              : [...usersList, syncedUser];
            writeServerStore({ users: updatedUsers });

            res.json({ status: 'success', user: syncedUser });
            return;
          }
        }
      } catch (sheetErr) {
        console.warn('Google Sheet login fallback warning:', sheetErr);
      }
    }

    if (matchedLocal) {
      res.json({ status: 'error', message: 'Invalid Password. Please check the password set by Admin.' });
      return;
    }

    res.json({
      status: 'error',
      message: 'Access Denied: This email is not registered in DCPL Solar CRM. Contact Admin.',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server authentication error.' });
  }
});

// Proxy for Google Apps Script Web App (avoids browser CORS issues on GET & POST)
app.post('/api/sheet-proxy', async (req, res) => {
  try {
    const { webAppUrl, method = 'POST', payload } = req.body || {};
    const store = readServerStore();
    const targetUrl = String(webAppUrl || store.syncConfig?.webAppUrl || '').trim();

    if (!targetUrl) {
      res.status(400).json({ status: 'error', message: 'Missing Google Apps Script Web App URL' });
      return;
    }

    if (method === 'GET') {
      const response = await fetch(targetUrl, {
        method: 'GET',
        redirect: 'follow',
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);
        if (json.users && Array.isArray(json.users) && json.users.length > 0) {
          // Merge sheet users with server users
          const existingUsers = store.users || DEFAULT_USERS;
          const mergedUsers = [...existingUsers];
          for (const su of json.users) {
            const suEmail = String(su.email || '').trim().toLowerCase();
            if (!suEmail) continue;
            const idx = mergedUsers.findIndex((u) => String(u.email || '').trim().toLowerCase() === suEmail);
            if (idx >= 0) {
              mergedUsers[idx] = { ...mergedUsers[idx], ...su };
            } else {
              mergedUsers.push(su);
            }
          }
          writeServerStore({ users: mergedUsers });
        }
        res.json(json);
      } catch {
        res.json({ status: 'raw', raw: text });
      }
      return;
    }

    // POST to Google Apps Script
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload || {}),
      redirect: 'follow',
    });
    const text = await response.text();
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch {
      res.json({ status: 'success', raw: text });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

async function startServer() {
  const distPath = path.join(__dirname, 'dist');
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } catch (e) {
      if (fs.existsSync(distPath)) {
        app.use(express.static(distPath));
      }
    }
  } else {
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
    }
    app.get('*', (_req, res) => {
      const distIndex = path.join(distPath, 'index.html');
      if (fs.existsSync(distIndex)) {
        res.sendFile(distIndex);
      } else {
        res.sendFile(path.join(__dirname, 'index.html'));
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`DCPL Solar CRM Full-Stack Server running on port ${PORT}`);
  });
}

startServer();
