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

function normalizeEmailKey(val: any): string {
  return String(val || '').trim().toLowerCase();
}

function ensureUniqueUserIds(users: any[]): any[] {
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
      email: normalizeEmailKey(u.email),
      password: String(u.password || 'dcpl123').trim(),
    };
  });
}

function mergeUsersLists(existingUsers: any[], incomingUsers: any[], deletedEmails: string[] = []) {
  const deletedSet = new Set((deletedEmails || []).map((e) => normalizeEmailKey(e)));
  const map = new Map<string, any>();

  for (const u of existingUsers || []) {
    const key = normalizeEmailKey(u.email || u.id);
    if (!key || deletedSet.has(key)) continue;
    map.set(key, { ...u, email: normalizeEmailKey(u.email) });
  }

  for (const u of incomingUsers || []) {
    const key = normalizeEmailKey(u.email || u.id);
    if (!key || deletedSet.has(key)) continue;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, { ...u, email: normalizeEmailKey(u.email) });
    } else {
      const prevTime = Number(prev.updatedAt || 0);
      const incTime = Number(u.updatedAt || 0);
      // If incoming user has an equal or newer updatedAt timestamp, incoming wins;
      // If existing user was explicitly updated by Admin (prevTime > 0) and incoming has no timestamp (0), keep existing Admin changes!
      if (incTime >= prevTime) {
        map.set(key, {
          ...prev,
          ...u,
          email: normalizeEmailKey(u.email || prev.email),
          password: String(u.password || prev.password || 'dcpl123').trim(),
          updatedAt: Math.max(prevTime, incTime),
        });
      } else {
        map.set(key, {
          ...u,
          ...prev,
          email: normalizeEmailKey(prev.email || u.email),
          password: String(prev.password || u.password || 'dcpl123').trim(),
          updatedAt: prevTime,
        });
      }
    }
  }

  return ensureUniqueUserIds(Array.from(map.values()));
}

function readServerStore() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      const raw = fs.readFileSync(STORE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      const deletedEmails: string[] = Array.isArray(parsed.deletedEmails) ? parsed.deletedEmails : [];
      if (!Array.isArray(parsed.users) || parsed.users.length === 0) {
        parsed.users = ensureUniqueUserIds(DEFAULT_USERS);
      } else {
        parsed.users = mergeUsersLists(DEFAULT_USERS, parsed.users, deletedEmails);
      }
      return parsed;
    }
  } catch (err) {
    console.error('Error reading server store:', err);
  }
  return {
    users: ensureUniqueUserIds(DEFAULT_USERS),
    deletedEmails: [],
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
    if (Array.isArray(merged.users)) {
      merged.users = ensureUniqueUserIds(merged.users);
    }
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
  const deletedEmails: string[] = Array.isArray(current.deletedEmails) ? current.deletedEmails : [];

  if (Array.isArray(body.users) && body.users.length > 0) {
    // Timestamp-aware merge so Admin's updated passwords/users are never overwritten by stale defaults
    next.users = mergeUsersLists(current.users || DEFAULT_USERS, body.users, deletedEmails);
  }
  if (Array.isArray(body.leads)) {
    next.leads = body.leads;
  }
  if (Array.isArray(body.payments)) {
    next.payments = body.payments;
  }
  if (body.syncConfig && typeof body.syncConfig === 'object') {
    const prevCfg = current.syncConfig || {};
    next.syncConfig = {
      ...prevCfg,
      ...body.syncConfig,
      webAppUrl: body.syncConfig.webAppUrl !== undefined ? body.syncConfig.webAppUrl : prevCfg.webAppUrl || '',
    };
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

// Dedicated endpoint for Admin to Add or Update a User's Email, Password, Role, Status
app.post('/api/users/upsert', (req, res) => {
  try {
    const { user, previousEmail } = req.body || {};
    if (!user || !user.email) {
      res.status(400).json({ status: 'error', message: 'Valid user with email is required.' });
      return;
    }

    const current = readServerStore();
    const cleanNewEmail = normalizeEmailKey(user.email);
    const cleanPrevEmail = normalizeEmailKey(previousEmail || user.email);
    const deletedEmails: string[] = (current.deletedEmails || []).filter(
      (e: string) => normalizeEmailKey(e) !== cleanNewEmail
    );

    const stampedUser = {
      ...user,
      email: cleanNewEmail,
      password: String(user.password || 'dcpl123').trim(),
      updatedAt: Number(user.updatedAt) || Date.now(),
    };

    const existingList: any[] = Array.isArray(current.users) ? current.users : DEFAULT_USERS;
    let found = false;
    const updatedList = existingList.map((u: any) => {
      const uEmail = normalizeEmailKey(u.email);
      if (uEmail === cleanPrevEmail || uEmail === cleanNewEmail || (u.id && u.id === stampedUser.id && uEmail === cleanPrevEmail)) {
        found = true;
        return {
          ...u,
          ...stampedUser,
        };
      }
      return u;
    });

    if (!found) {
      updatedList.unshift(stampedUser);
    }

    // Deduplicate by email keeping newest updatedAt
    const deduped = mergeUsersLists([], updatedList, deletedEmails);
    const saved = writeServerStore({ users: deduped, deletedEmails });

    res.json({
      status: 'success',
      user: stampedUser,
      users: saved.users,
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// Dedicated endpoint for Admin to Delete a User
app.post('/api/users/delete', (req, res) => {
  try {
    const { userId, email } = req.body || {};
    const current = readServerStore();
    const cleanTargetEmail = normalizeEmailKey(email);
    const deletedEmails = Array.from(
      new Set([...(current.deletedEmails || []), ...(cleanTargetEmail ? [cleanTargetEmail] : [])])
    );

    const filteredUsers = (current.users || []).filter((u: any) => {
      const uEmail = normalizeEmailKey(u.email);
      if (cleanTargetEmail && uEmail === cleanTargetEmail) return false;
      if (userId && u.id === userId && !cleanTargetEmail) return false;
      return true;
    });

    const saved = writeServerStore({ users: filteredUsers, deletedEmails });
    res.json({ status: 'success', users: saved.users });
  } catch (err) {
    res.status(500).json({ status: 'error', message: String(err) });
  }
});

// Multi-device Authentication Endpoint (Supports Email, Username/ID, Name, or Phone)
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password, webAppUrl, clientUsers } = req.body || {};
    const cleanInput = String(email || '').trim().toLowerCase();
    const cleanPassword = String(password || '').trim();

    if (!cleanInput || !cleanPassword) {
      res.status(400).json({ status: 'error', message: 'Login ID/Email and password are required.' });
      return;
    }

    const store = readServerStore();
    const deletedEmails: string[] = Array.isArray(store.deletedEmails) ? store.deletedEmails : [];
    let usersList: any[] = Array.isArray(store.users) && store.users.length > 0 ? store.users : DEFAULT_USERS;

    // If the browser passed its latest users list, merge any updated records (updatedAt > 0) so Admin changes are immediately honored
    if (Array.isArray(clientUsers) && clientUsers.length > 0) {
      usersList = mergeUsersLists(usersList, clientUsers, deletedEmails);
      writeServerStore({ users: usersList });
    }

    const matchUserIdentifier = (u: any) => {
      const uEmail = normalizeEmailKey(u.email);
      const uEmailPrefix = uEmail.split('@')[0];
      const uId = String(u.id || '').trim().toLowerCase();
      const uName = String(u.name || '').trim().toLowerCase();
      const uPhoneDigits = String(u.phone || '').replace(/\D/g, '');
      const inputDigits = cleanInput.replace(/\D/g, '');

      if (uEmail === cleanInput) return true;
      if (!cleanInput.includes('@') && uEmailPrefix && uEmailPrefix === cleanInput) return true;
      if (uId && uId === cleanInput) return true;
      if (uName && uName === cleanInput) return true;
      if (inputDigits.length >= 8 && uPhoneDigits.length >= 8 && uPhoneDigits.slice(-10) === inputDigits.slice(-10)) {
        return true;
      }
      return false;
    };

    // Find all matching candidates across merged server users and clientUsers
    const candidates = usersList.filter(matchUserIdentifier);
    const clientCandidates = Array.isArray(clientUsers) ? clientUsers.filter(matchUserIdentifier) : [];
    const allCandidates = [...candidates, ...clientCandidates];

    if (allCandidates.length > 0) {
      const primaryUser = candidates[0] || clientCandidates[0];
      if (primaryUser.status === 'Inactive') {
        res.json({ status: 'error', message: 'Account Suspended / Inactive. Contact Admin.' });
        return;
      }

      // Check if password matches any candidate record (exact or case-insensitive)
      const passwordMatchedCandidate = allCandidates.find((cand) => {
        const storedPass = String(cand.password || '').trim();
        return (
          !storedPass ||
          storedPass === cleanPassword ||
          storedPass.toLowerCase() === cleanPassword.toLowerCase()
        );
      });

      if (passwordMatchedCandidate) {
        const authedUser = {
          ...primaryUser,
          ...passwordMatchedCandidate,
          password: cleanPassword,
          status: 'Active',
        };
        res.json({
          status: 'success',
          user: authedUser,
        });
        return;
      }
    }

    // 2. Also check Google Sheet "Users" tab via webAppUrl if configured
    const targetUrl = String(webAppUrl || store.syncConfig?.webAppUrl || '').trim();
    if (targetUrl && targetUrl.includes('script.google.com')) {
      try {
        const sheetRes = await fetch(targetUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({
            action: 'login',
            email: cleanInput,
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
              name: sheetData.user.name || cleanInput.split('@')[0],
              email: normalizeEmailKey(sheetData.user.email || cleanInput),
              password: cleanPassword,
              role: sheetData.user.role || 'Sales Executive',
              status: sheetData.user.status || 'Active',
              phone: sheetData.user.phone || '',
              updatedAt: Date.now(),
              lastActive: 'Just now',
              createdAt: new Date().toISOString().split('T')[0],
            };
            const updatedUsers = mergeUsersLists(usersList, [syncedUser], deletedEmails);
            writeServerStore({ users: updatedUsers });

            res.json({ status: 'success', user: syncedUser });
            return;
          }
        }
      } catch (sheetErr) {
        console.warn('Google Sheet login fallback warning:', sheetErr);
      }
    }

    if (allCandidates.length > 0) {
      res.json({
        status: 'error',
        message: 'Invalid Password. Please check the password set in User Management.',
      });
      return;
    }

    res.json({
      status: 'error',
      message: 'Access Denied: This Email / User ID is not registered in DCPL Solar CRM. Please add it in User Management.',
    });
  } catch (err) {
    res.status(500).json({ status: 'error', message: 'Server authentication error.' });
  }
});

// Proxy for Google Apps Script Web App (avoids browser CORS issues on GET & POST)
app.post('/api/sheet-proxy', async (req, res) => {
  try {
    const { webAppUrl, paymentWebAppUrl, method = 'POST', payload, mainSheetName, paymentSheetName } = req.body || {};
    const store = readServerStore();
    const targetUrl = String(webAppUrl || store.syncConfig?.webAppUrl || '').trim();
    const targetPayUrl = String(paymentWebAppUrl || store.syncConfig?.paymentWebAppUrl || '').trim();
    const resolvedMainSheet = String(
      mainSheetName || payload?.mainSheetName || store.syncConfig?.mainSheetName || 'Main Project Sheet'
    ).trim();
    const resolvedPaySheet = String(
      paymentSheetName || payload?.paymentSheetName || store.syncConfig?.paymentSheetName || 'Payment Sheet'
    ).trim();

    if (!targetUrl && !targetPayUrl) {
      res.status(400).json({ status: 'error', message: 'Missing Google Apps Script Web App URL' });
      return;
    }

    if (method === 'GET') {
      const primaryUrl = targetUrl || targetPayUrl;
      const separator = primaryUrl.includes('?') ? '&' : '?';
      const urlWithParams = `${primaryUrl}${separator}mainSheet=${encodeURIComponent(resolvedMainSheet)}&paymentSheet=${encodeURIComponent(resolvedPaySheet)}`;
      const response = await fetch(urlWithParams, {
        method: 'GET',
        redirect: 'follow',
      });
      const text = await response.text();
      try {
        const json = JSON.parse(text);

        // If a separate paymentWebAppUrl is configured, also fetch payments from it
        if (targetPayUrl && targetPayUrl !== primaryUrl) {
          try {
            const paySep = targetPayUrl.includes('?') ? '&' : '?';
            const payRes = await fetch(
              `${targetPayUrl}${paySep}mainSheet=${encodeURIComponent(resolvedMainSheet)}&paymentSheet=${encodeURIComponent(resolvedPaySheet)}`,
              { method: 'GET', redirect: 'follow' }
            );
            if (payRes.ok) {
              const payJson = JSON.parse(await payRes.text());
              if (Array.isArray(payJson.payments) && payJson.payments.length > 0) {
                json.payments = [...(Array.isArray(json.payments) ? json.payments : []), ...payJson.payments];
              }
              if (Array.isArray(payJson.availableSheets)) {
                json.availableSheets = Array.from(
                  new Set([...(json.availableSheets || []), ...payJson.availableSheets])
                );
              }
            }
          } catch (payFetchErr) {
            console.warn('Secondary paymentWebAppUrl fetch warning:', payFetchErr);
          }
        }

        if (json.users && Array.isArray(json.users) && json.users.length > 0) {
          // Timestamp-safe merge: Admin's updated credentials (updatedAt > 0) always take priority over un-timestamped sheet rows
          const existingUsers = store.users || DEFAULT_USERS;
          const deletedEmails: string[] = Array.isArray(store.deletedEmails) ? store.deletedEmails : [];
          const mergedUsers = mergeUsersLists(existingUsers, json.users, deletedEmails);
          writeServerStore({ users: mergedUsers });
          json.users = mergedUsers;
        }
        if (Array.isArray(json.availableSheets) && json.availableSheets.length > 0) {
          writeServerStore({
            syncConfig: {
              ...(store.syncConfig || {}),
              webAppUrl: targetUrl,
              paymentWebAppUrl: targetPayUrl,
              mainSheetName: resolvedMainSheet,
              paymentSheetName: resolvedPaySheet,
              availableSheets: json.availableSheets,
            },
          });
        }
        res.json(json);
      } catch {
        res.json({ status: 'raw', raw: text });
      }
      return;
    }

    // If saving a payment, also persist the payment to server store so all CRM devices have it
    if (payload?.action === 'savePayment' && (payload?.payment || payload?.leadId)) {
      const p = payload.payment || payload;
      const currentPayments = Array.isArray(store.payments) ? store.payments : [];
      const updatedPayments = [p, ...currentPayments.filter((cp: any) => cp.id !== p.id && cp.transactionId !== p.transactionId)];
      writeServerStore({ payments: updatedPayments });
    }

    // POST to Google Apps Script
    const enrichedPayload = {
      ...(payload || {}),
      mainSheetName: resolvedMainSheet,
      paymentSheetName: resolvedPaySheet,
    };

    const postUrl =
      payload?.action === 'savePayment' && targetPayUrl
        ? targetPayUrl
        : targetUrl || targetPayUrl;

    const response = await fetch(postUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(enrichedPayload),
      redirect: 'follow',
    });

    // If saving a payment and both targetPayUrl and targetUrl exist and differ, also notify main targetUrl to update lead totals
    if (payload?.action === 'savePayment' && targetPayUrl && targetUrl && targetPayUrl !== targetUrl) {
      fetch(targetUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(enrichedPayload),
        redirect: 'follow',
      }).catch(() => {});
    }

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
        server: { middlewareMode: true, hmr: false },
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
