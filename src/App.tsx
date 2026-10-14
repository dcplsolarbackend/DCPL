import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Lead, 
  PaymentRecord, 
  PipelineStage, 
  ViewMode, 
  SheetSyncConfig, 
  User, 
  ActivityLog, 
  InAppNotification 
} from './types/crm';
import { 
  loadLeads, 
  saveLeads, 
  resetLeads, 
  loadPayments, 
  savePayments,
  loadSyncConfig, 
  saveSyncConfig,
  buildSheetLeadPayload,
  buildSheetPaymentPayload,
  reconcileLeadsWithPayments,
  mergePaymentsList,
  normalizeLeadId,
  exportToGoogleSheetCsv,
  downloadCsv
} from './utils/storage';
import { 
  loadUsers, 
  saveUsers, 
  mergeUsersList,
  getStoredUser, 
  setStoredUser,
  logoutUser,
  loadActivityLogs,
  logActivity,
  loadNotifications,
  saveNotifications,
  addNotification
} from './utils/userStorage';
import { 
  filterLeadsByRole, 
  getVisibleStagesForRole, 
  isAdmin, 
  isSales, 
  isOperations 
} from './constants/pipeline';
import { 
  validateLeadForStage, 
  saveStagePermissions, 
  saveStageMandatoryRules 
} from './utils/pipelinePermissions';
import { saveColumnPermissions } from './utils/permissionStorage';
import { TopNav } from './components/TopNav';
import { Sidebar } from './components/Sidebar';
import { LeadsTable } from './components/LeadsTable';
import { KanbanBoard } from './components/KanbanBoard';
import { FollowUpSchedule } from './components/FollowUpSchedule';
import { PaymentSheetView } from './components/PaymentSheetView';
import { UsersManagement } from './components/UsersManagement';
import { DashboardOverview } from './components/DashboardOverview';
import { NotificationDrawer } from './components/NotificationDrawer';
import { ProjectDetailsModal } from './components/ProjectDetailsModal';
import { WhatsAppModal } from './components/WhatsAppModal';
import { GoogleSheetSyncModal } from './components/GoogleSheetSyncModal';
import { ShareAppModal } from './components/ShareAppModal';
import { LoginPage } from './components/LoginPage';
import { MobileBottomNav } from './components/MobileBottomNav';
import { RotateCcw, CheckCircle2, ShieldAlert } from 'lucide-react';

const PUBLIC_APP_URL = 'https://ais-pre-5lwgbql5dcxvmg5zo645wl-134919990515.asia-southeast1.run.app';

export default function App() {
  const [payments, setPayments] = useState<PaymentRecord[]>(() => loadPayments());
  const [leads, setLeads] = useState<Lead[]>(() => reconcileLeadsWithPayments(loadLeads(), loadPayments()));
  const [users, setUsers] = useState<User[]>(() => loadUsers());
  // Persist login on device across page refreshes for 5 days or until explicit logout
  const [currentUser, setCurrentUserState] = useState<User | null>(() => getStoredUser(loadUsers()));
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => Boolean(getStoredUser(loadUsers())));

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>(() => loadActivityLogs());
  const [notifications, setNotifications] = useState<InAppNotification[]>(() => loadNotifications());
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');
  const [syncConfig, setSyncConfig] = useState<SheetSyncConfig>(() => loadSyncConfig());
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [projectModalInitialTab, setProjectModalInitialTab] = useState<'stage' | 'info' | 'technical' | 'dates' | 'files' | 'payments'>('stage');
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [whatsAppLead, setWhatsAppLead] = useState<Lead | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Load initial data on mount, sync multi-device server state & check 5-day session validity
  useEffect(() => {
    const loadedUsers = loadUsers();
    setUsers(loadedUsers);

    const storedUser = getStoredUser(loadedUsers);
    if (storedUser) {
      setCurrentUserState(storedUser);
      setIsAuthenticated(true);
    } else {
      setCurrentUserState(null);
      setIsAuthenticated(false);
    }

    const syncMultiSystemState = async () => {
      try {
        const res = await fetch('/api/state');
        if (res.ok) {
          const data = await res.json();
          const localUsers = loadUsers();
          const serverUsers = Array.isArray(data.users) ? data.users : [];
          const mergedUsers = mergeUsersList(serverUsers, localUsers);
          setUsers(mergedUsers);
          saveUsers(mergedUsers, false);

          // Push merged users & local config back so any user created by Admin on this browser is available on all systems
          const localCfg = loadSyncConfig();
          const mergedCfg = {
            ...localCfg,
            ...(data.syncConfig || {}),
            webAppUrl: localCfg.webAppUrl || data.syncConfig?.webAppUrl || '',
          };
          if (mergedCfg.webAppUrl) {
            setSyncConfig(mergedCfg);
            saveSyncConfig(mergedCfg, false);
          }

          if (data.stagePermissions) {
            saveStagePermissions(data.stagePermissions, false);
          }
          if (data.stageMandatoryRules) {
            saveStageMandatoryRules(data.stageMandatoryRules, false);
          }
          if (Array.isArray(data.columnPermissions) && data.columnPermissions.length > 0) {
            saveColumnPermissions(data.columnPermissions, false);
          }

          fetch('/api/state', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              users: mergedUsers,
              syncConfig: mergedCfg,
            }),
          }).catch(() => {});
        }
      } catch {
        // Offline fallback
      }
    };

    syncMultiSystemState();

    // Periodically verify 5-day session expiry & sync multi-device users
    const sessionCheckTimer = setInterval(() => {
      syncMultiSystemState();
      const validUser = getStoredUser(loadUsers());
      if (!validUser) {
        setCurrentUserState(null);
        setIsAuthenticated(false);
      }
    }, 60 * 1000);

    return () => clearInterval(sessionCheckTimer);
  }, []);

  // Step 2: Role-based Filtered Leads
  // - Admin: Complete Company Data (All 15 Stages)
  // - Sales: Only their own assigned / created leads (New Leads -> Documentation)
  // - Operations: Projects in execution stages (Registration -> Connection/Complete)
  const roleFilteredLeads = useMemo(() => {
    return filterLeadsByRole(leads, currentUser);
  }, [leads, currentUser]);

  // Helper to push a Lead to Google Sheet (into exact next upcoming row, Columns 1..44)
  const pushLeadToGoogleSheet = useCallback((leadToPush: Lead, userEmail: string) => {
    const targetUrl = (syncConfig.webAppUrl || '').trim();
    if (!targetUrl) return;

    const activeMainSheet = syncConfig.mainSheetName || 'Main Project Sheet';
    const activePaySheet = syncConfig.paymentSheetName || 'Payment Sheet';
    const payload = buildSheetLeadPayload(leadToPush, userEmail, activeMainSheet, activePaySheet);

    // 1. Send via backend proxy to follow Apps Script redirects cleanly
    fetch('/api/sheet-proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webAppUrl: targetUrl,
        method: 'POST',
        mainSheetName: activeMainSheet,
        paymentSheetName: activePaySheet,
        payload,
      }),
    }).catch(() => {
      // 2. Fallback direct browser dispatch
      fetch(targetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      }).catch((e) => console.log('Sync queued:', e));
    });
  }, [syncConfig.webAppUrl, syncConfig.mainSheetName, syncConfig.paymentSheetName]);

  // Save Lead (Add or Edit)
  const handleSaveLead = (lead: Lead) => {
    if (!currentUser) return;
    const leadWithMeta: Lead = {
      ...lead,
      lastModifiedBy: currentUser.email,
      lastModifiedTime: new Date().toLocaleString(),
      updatedAt: new Date().toISOString(),
      updatedBy: currentUser.email,
    };

    setLeads((prev) => {
      const exists = prev.some((l) => l.leadId === lead.leadId);
      let updated: Lead[];
      if (exists) {
        updated = prev.map((l) => (l.leadId === lead.leadId ? leadWithMeta : l));
        showToast(`Project ${lead.leadId} updated.`);
      } else {
        // Append in exact upcoming sheet row order
        updated = [...prev, leadWithMeta];
        showToast(`New project ${lead.leadId} added to next upcoming row.`);
      }
      saveLeads(updated);
      return updated;
    });

    const log = logActivity({
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'EDIT_LEAD',
      leadId: lead.leadId,
      leadName: lead.customerName,
      details: `${currentUser.name} saved project ${lead.customerName || lead.phone} (${lead.status})`,
    });
    setActivityLogs((prev) => [log, ...prev]);

    const notif = addNotification({
      title: 'Project Saved',
      message: `${currentUser.name} saved ${lead.customerName || lead.phone} (${lead.leadId})`,
      type: 'lead_assigned',
      targetLeadId: lead.leadId,
    });
    setNotifications((prev) => [notif, ...prev]);

    // Push to Google Sheet (Exact Next Upcoming Row, Columns 1..44)
    pushLeadToGoogleSheet(leadWithMeta, currentUser.email);
  };

  // Add Payment Record (Saves into Payment Sheet by LeadID & sums into Lead's Payment Received)
  const handleAddPayment = (newPay: PaymentRecord) => {
    if (!currentUser) return;
    let nextPaymentsList: PaymentRecord[] = [];
    setPayments((prev) => {
      const updated = [newPay, ...prev];
      nextPaymentsList = updated;
      savePayments(updated);
      return updated;
    });

    const normId = normalizeLeadId(newPay.leadId);
    let matchedLead: Lead | undefined;

    // Recalculate lead payment totals by summing all Payment Sheet entries for this LeadID
    setLeads((prev) => {
      const target = prev.find((l) => normalizeLeadId(l.leadId) === normId);
      if (!target) return prev;

      matchedLead = target;
      const allPaysForLead = (nextPaymentsList.length > 0 ? nextPaymentsList : [newPay, ...payments]).filter(
        (p) => normalizeLeadId(p.leadId) === normId
      );
      const summedPaid = allPaysForLead.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      const deal = Number(target.dealAmount) || 0;
      const newDue = Math.max(0, deal - summedPaid);

      const updatedLead: Lead = {
        ...target,
        paymentReceived: summedPaid,
        duePayment: newDue,
        lastModifiedBy: currentUser.email,
        lastModifiedTime: new Date().toLocaleString(),
      };

      const updatedList = prev.map((l) => (normalizeLeadId(l.leadId) === normId ? updatedLead : l));
      saveLeads(updatedList);
      return updatedList;
    });

    // Always push payment entry to Google Apps Script / Payment Sheet
    if (syncConfig.webAppUrl) {
      const activeMainSheet = syncConfig.mainSheetName || 'Main Project Sheet';
      const activePaySheet = syncConfig.paymentSheetName || 'Payment Sheet';
      const payPayload = buildSheetPaymentPayload(
        newPay,
        matchedLead || leads.find((l) => normalizeLeadId(l.leadId) === normId),
        currentUser.email,
        activeMainSheet,
        activePaySheet
      );
      fetch('/api/sheet-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: syncConfig.webAppUrl,
          method: 'POST',
          mainSheetName: activeMainSheet,
          paymentSheetName: activePaySheet,
          payload: payPayload,
        }),
      }).catch(() => {
        fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify(payPayload),
        }).catch((e) => console.log('Payment sync queued:', e));
      });
    }

    const leadObj = matchedLead || leads.find((l) => normalizeLeadId(l.leadId) === normId);

    const log = logActivity({
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'RECORD_PAYMENT',
      leadId: newPay.leadId,
      leadName: leadObj?.customerName,
      details: `${currentUser.name} added ₹${newPay.amount.toLocaleString('en-IN')} to Payment Sheet (LeadID: ${newPay.leadId})`,
    });
    setActivityLogs((prev) => [log, ...prev]);

    const notif = addNotification({
      title: 'Payment Added to Payment Sheet',
      message: `₹${newPay.amount.toLocaleString('en-IN')} added in Payment Sheet for ${leadObj?.customerName || newPay.leadId}`,
      type: 'payment_due',
      targetLeadId: newPay.leadId,
    });
    setNotifications((prev) => [notif, ...prev]);

    showToast(`₹${newPay.amount.toLocaleString('en-IN')} added to Payment Sheet (LeadID: ${newPay.leadId}).`);
  };

  // Two-way synchronization handler (supports both manual and silent background Auto-Sync)
  const handleTriggerTwoWaySync = useCallback(async (silent = false) => {
    if (!currentUser) return;
    const targetUrl = (syncConfig.webAppUrl || '').trim();
    const activeMainSheet = syncConfig.mainSheetName || 'Main Project Sheet';
    const activePaySheet = syncConfig.paymentSheetName || 'Payment Sheet';
    if (!targetUrl) {
      if (!silent) {
        showToast('Please enter your Google Apps Script URL first.');
      }
      return;
    }

    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      let json: any = null;
      try {
        const proxyRes = await fetch('/api/sheet-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl: targetUrl,
            method: 'GET',
            mainSheetName: activeMainSheet,
            paymentSheetName: activePaySheet,
          }),
        });
        if (proxyRes.ok) {
          json = await proxyRes.json();
        }
      } catch {
        const sep = targetUrl.includes('?') ? '&' : '?';
        const res = await fetch(
          `${targetUrl}${sep}mainSheet=${encodeURIComponent(activeMainSheet)}&paymentSheet=${encodeURIComponent(activePaySheet)}`,
          { method: 'GET', mode: 'cors' }
        );
        json = await res.json();
      }

      if (json && json.leads && Array.isArray(json.leads)) {
        let resolvedPayments = payments;
        if (json.payments && Array.isArray(json.payments) && json.payments.length > 0) {
          resolvedPayments = mergePaymentsList(payments, json.payments);
          setPayments(resolvedPayments);
          savePayments(resolvedPayments);
        }

        if (json.leads.length > 0) {
          const reconciledLeads = reconcileLeadsWithPayments(json.leads, resolvedPayments);
          setLeads(reconciledLeads);
          saveLeads(reconciledLeads);
        }

        if (json.users && Array.isArray(json.users) && json.users.length > 0) {
          setUsers((prevUsers) => {
            const merged = mergeUsersList(prevUsers, json.users);
            saveUsers(merged, true);
            return merged;
          });
        }

        const nowIso = new Date().toISOString();
        setSyncConfig((prev) => {
          const incomingTabs: string[] = Array.isArray(json.availableSheets)
            ? json.availableSheets.filter((s: string) => s && s.toLowerCase() !== 'users')
            : [];
          const updatedTabs = incomingTabs.length > 0 ? incomingTabs : (prev.availableSheets || []);
          const updatedCfg = {
            ...prev,
            mainSheetName: json.mainSheetName || prev.mainSheetName,
            paymentSheetName: json.paymentSheetName || prev.paymentSheetName,
            availableSheets: updatedTabs,
            lastSyncedAt: nowIso,
          };
          saveSyncConfig(updatedCfg);
          return updatedCfg;
        });

        if (!silent) {
          const log = logActivity({
            userEmail: currentUser.email,
            userName: currentUser.name,
            userRole: currentUser.role,
            action: 'SHEET_SYNC',
            details: `2-Way sync pulled ${json.leads.length} projects (${activeMainSheet}) & ${json.payments?.length || 0} payments (${activePaySheet}).`,
          });
          setActivityLogs((prev) => [log, ...prev]);
          showToast(`Synced ${json.leads.length} projects (${activeMainSheet}) & ${json.payments?.length || 0} payments (${activePaySheet})!`);
        }
      } else if (!silent) {
        // Fallback post on manual trigger
        await fetch('/api/sheet-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            webAppUrl: targetUrl,
            method: 'POST',
            mainSheetName: activeMainSheet,
            paymentSheetName: activePaySheet,
            payload: {
              action: 'syncBatch',
              mainSheetName: activeMainSheet,
              paymentSheetName: activePaySheet,
              leads: leads,
              payments: payments,
              users: users,
              updatedBy: currentUser.email,
            },
          }),
        });
        showToast('Local database synced to Google Sheet.');
      }
    } catch (err) {
      if (!silent) {
        try {
          await fetch(targetUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'syncBatch',
              mainSheetName: activeMainSheet,
              paymentSheetName: activePaySheet,
              leads: leads,
              payments: payments,
              users: users,
              updatedBy: currentUser.email,
            }),
          });
          showToast('Background sync dispatch sent to Google Sheet.');
        } catch (postErr) {
          showToast('Could not reach Google Apps Script Web App.');
        }
      }
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [currentUser, syncConfig.webAppUrl, syncConfig.mainSheetName, syncConfig.paymentSheetName, leads, payments, users]);

  // Automatic Background Sync (Auto-Sync when settings/URL are valid)
  useEffect(() => {
    const validUrl = (syncConfig.webAppUrl || '').trim();
    if (!currentUser || !isAuthenticated || !validUrl || !syncConfig.autoSync) {
      return;
    }

    // Immediate background sync on login / page load
    handleTriggerTwoWaySync(true);

    // Periodic background sync interval
    const intervalMs = Math.max(1, syncConfig.syncIntervalMinutes || 1) * 60 * 1000;
    const syncTimer = setInterval(() => {
      handleTriggerTwoWaySync(true);
    }, intervalMs);

    // Also sync when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleTriggerTwoWaySync(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(syncTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser?.email, isAuthenticated, syncConfig.webAppUrl, syncConfig.autoSync, syncConfig.syncIntervalMinutes, handleTriggerTwoWaySync]);

  const handleDeleteLead = (leadId: string) => {
    if (!currentUser) return;
    if (currentUser.role !== 'Admin' && currentUser.role !== 'Sales Manager') {
      alert('Only Admins or Sales Managers can delete projects.');
      return;
    }

    const targetLead = leads.find((l) => l.leadId === leadId);

    setLeads((prev) => {
      const updated = prev.filter((l) => l.leadId !== leadId);
      saveLeads(updated);
      showToast(`Project ${leadId} deleted.`);
      return updated;
    });

    const log = logActivity({
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'DELETE_LEAD',
      leadId: leadId,
      leadName: targetLead?.customerName,
      details: `${currentUser.name} deleted project ${leadId}`,
    });
    setActivityLogs((prev) => [log, ...prev]);
  };

  const handleUpdateStatus = (leadId: string, newStatus: PipelineStage) => {
    if (!currentUser) return;
    const target = leads.find((l) => l.leadId === leadId);
    if (!target) return;

    const updatedLead: Lead = {
      ...target,
      status: newStatus,
      lastModifiedBy: currentUser.email,
      lastModifiedTime: new Date().toLocaleString(),
    };

    // Check stage-wise mandatory fields before advancing stage
    const validation = validateLeadForStage(updatedLead, newStatus);
    if (!validation.isValid) {
      setEditingLead(updatedLead);
      setIsProjectModalOpen(true);
      showToast(`Fill required columns for "${newStatus}": ${validation.missingLabels.join(', ')}`);
      return;
    }

    setLeads((prev) => {
      const updated = prev.map((l) => (l.leadId === leadId ? updatedLead : l));
      saveLeads(updated);
      showToast(`Moved ${target.customerName || target.phone} to "${newStatus}".`);
      return updated;
    });

    const log = logActivity({
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'UPDATE_STAGE',
      leadId: leadId,
      leadName: target.customerName,
      details: `Moved from "${target.status}" to "${newStatus}"`,
    });
    setActivityLogs((prev) => [log, ...prev]);

    pushLeadToGoogleSheet(updatedLead, currentUser.email);
  };

  const handleReschedule = (leadId: string, newDate: string) => {
    if (!currentUser) return;
    const target = leads.find((l) => l.leadId === leadId);
    if (!target) return;

    const updatedLead: Lead = {
      ...target,
      followUpDate: newDate,
      lastModifiedBy: currentUser.email,
      lastModifiedTime: new Date().toLocaleString(),
    };

    setLeads((prev) => {
      const updated = prev.map((l) => (l.leadId === leadId ? updatedLead : l));
      saveLeads(updated);
      showToast(`Follow-up date updated to ${newDate}.`);
      return updated;
    });
  };

  const handleResetToDemo = () => {
    if (window.confirm('Reset all leads and payment data to initial sheet records?')) {
      const initial = resetLeads();
      setLeads(initial);
      setPayments(loadPayments());
      showToast('Reset to initial Google Sheet data.');
    }
  };

  const handleExportCsv = () => {
    const csvContent = exportToGoogleSheetCsv(leads);
    downloadCsv(`Main_Project_Sheet_${new Date().toISOString().split('T')[0]}.csv`, csvContent);
    showToast('Exported Main Project Sheet (44 Columns) CSV.');
  };

  const handleSwitchUser = (user: User) => {
    setCurrentUserState(user);
    setStoredUser(user);
    showToast(`Logged in as ${user.name} (${user.role})`);
  };

  const handleUpdateUser = async (updatedUser: User, previousEmail?: string) => {
    const stamped: User = {
      ...updatedUser,
      updatedAt: Date.now(),
    };
    const cleanPrev = (previousEmail || stamped.email || '').trim().toLowerCase();

    // 1. Immediate client update
    const updatedList = users.map((u) => {
      const uEmail = (u.email || '').trim().toLowerCase();
      if (u.id === stamped.id || uEmail === cleanPrev || uEmail === stamped.email.toLowerCase()) {
        return stamped;
      }
      return u;
    });
    setUsers(updatedList);
    saveUsers(updatedList, true);

    if (currentUser && (currentUser.id === stamped.id || currentUser.email.toLowerCase() === cleanPrev)) {
      setCurrentUserState(stamped);
      setStoredUser(stamped);
    }

    // 2. Persist to server store so other devices and browsers can login with updated credentials immediately
    try {
      await fetch('/api/users/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: stamped,
          previousEmail: cleanPrev,
        }),
      });
    } catch (e) {
      console.warn('Could not sync user to server:', e);
    }

    // 3. If Google Sheet Apps Script URL is attached, sync user row to Users tab
    if (syncConfig.webAppUrl) {
      fetch('/api/sheet-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: syncConfig.webAppUrl,
          method: 'POST',
          mainSheetName: syncConfig.mainSheetName,
          paymentSheetName: syncConfig.paymentSheetName,
          payload: {
            action: 'saveUser',
            user: stamped,
            previousEmail: cleanPrev,
            users: updatedList,
          },
        }),
      }).catch(() => {});
    }

    showToast(`Saved credentials for ${stamped.name} (${stamped.email}).`);
  };

  const handleAddUser = async (newUser: User) => {
    const stamped: User = {
      ...newUser,
      updatedAt: Date.now(),
    };
    const updatedList = [stamped, ...users.filter((u) => u.email.toLowerCase() !== stamped.email.toLowerCase())];
    setUsers(updatedList);
    saveUsers(updatedList, true);

    try {
      await fetch('/api/users/upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: stamped,
        }),
      });
    } catch (e) {
      console.warn('Could not sync user to server:', e);
    }

    if (syncConfig.webAppUrl) {
      fetch('/api/sheet-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webAppUrl: syncConfig.webAppUrl,
          method: 'POST',
          mainSheetName: syncConfig.mainSheetName,
          paymentSheetName: syncConfig.paymentSheetName,
          payload: {
            action: 'saveUser',
            user: stamped,
            users: updatedList,
          },
        }),
      }).catch(() => {});
    }

    showToast(`Added user ${newUser.name} (${newUser.email}).`);
  };

  const handleDeleteUser = async (targetUser: User) => {
    if (currentUser?.email.toLowerCase() === targetUser.email.toLowerCase()) {
      showToast('Cannot delete your own logged-in Admin account.');
      return;
    }
    const updatedList = users.filter(
      (u) => u.id !== targetUser.id && u.email.toLowerCase() !== targetUser.email.toLowerCase()
    );
    setUsers(updatedList);
    saveUsers(updatedList, true);

    try {
      await fetch('/api/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUser.id,
          email: targetUser.email,
        }),
      });
    } catch (e) {
      console.warn('Could not sync delete to server:', e);
    }
    showToast(`Removed user ${targetUser.name}.`);
  };

  const handleLogout = () => {
    logoutUser();
    localStorage.removeItem('dcpl_crm_user');
    localStorage.removeItem('crm_current_user_v2');
    setCurrentUserState(null);
    setIsAuthenticated(false);
    showToast('Logged out successfully.');
  };

  const unreadNotifsCount = notifications.filter((n) => !n.read).length;
  const todayStr = new Date().toISOString().split('T')[0];
  const todayFollowUpsCount = roleFilteredLeads.filter(
    (l) => l.followUpDate === todayStr && l.status !== 'Complete'
  ).length;

  // Step 1: Protected Route & Login Gate
  // Direct login screen if session is empty or expired
  if (!currentUser || !isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(loggedInUser) => {
          setStoredUser(loggedInUser);
          setCurrentUserState(loggedInUser);
          setIsAuthenticated(true);
          showToast(`Welcome back, ${loggedInUser.name} (${loggedInUser.role})!`);
        }}
        webAppUrl={syncConfig.webAppUrl || (typeof window !== 'undefined' ? localStorage.getItem('dcpl_apps_script_url') || '' : '')}
        users={users}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-16 md:pb-0">
      {/* Top Navigation Bar */}
      <TopNav
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'table') setSelectedStageFilter('All');
        }}
        onOpenNewLeadModal={() => {
          if (isSales(currentUser?.role)) {
            setEditingLead({
              leadId: `LD-${Math.floor(100000 + Math.random() * 900000)}`,
              leadDate: new Date().toISOString().split('T')[0],
              followUpDate: new Date().toISOString().split('T')[0],
              nextFollowUp: '',
              convertedDate: '',
              quotationDate: '',
              documentationDate: '',
              registrationDate: '',
              loanDate: '',
              surveyDate: '',
              mDispatchDate: '',
              installationDate: '',
              netMeterDate: '',
              connectionDate: '',
              completeDate: '',
              customerName: '',
              phone: '',
              address: '',
              source: 'Field',
              salesPerson: currentUser?.name || '',
              salesEmail: currentUser?.email || '',
              assignedTo: currentUser?.id || '',
              createdBy: currentUser?.email || '',
              status: 'New Leads',
              systemCapacity: '3.15KW Hybrid',
              dealAmount: 0,
              quotationAmount: 0,
              paymentType: 'Cash',
              paymentReceived: 0,
              duePayment: 0,
            });
          } else {
            setEditingLead(null);
          }
          setIsProjectModalOpen(true);
        }}
        onOpenSyncModal={() => setIsSyncModalOpen(true)}
        onExportCsv={handleExportCsv}
        currentUser={currentUser}
        onOpenUserModal={() => setCurrentView('users')}
        unreadNotificationsCount={unreadNotifsCount}
        onToggleNotifications={() => setIsNotificationOpen((prev) => !prev)}
        onToggleSidebar={() => setIsMobileSidebarOpen((prev) => !prev)}
        onOpenShareModal={() => setIsShareModalOpen(true)}
        onLogout={handleLogout}
        isSyncing={isSyncing}
        autoSyncActive={Boolean(syncConfig.webAppUrl && syncConfig.autoSync)}
      />

      {/* In-App Notifications Drawer */}
      <NotificationDrawer
        isOpen={isNotificationOpen}
        onClose={() => setIsNotificationOpen(false)}
        notifications={notifications}
        onMarkAsRead={(id) => {
          const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
          setNotifications(updated);
          saveNotifications(updated);
        }}
        onMarkAllAsRead={() => {
          const updated = notifications.map((n) => ({ ...n, read: true }));
          setNotifications(updated);
          saveNotifications(updated);
        }}
        onClearAll={() => {
          setNotifications([]);
          saveNotifications([]);
        }}
        onSelectLead={(leadId) => {
          const target = leads.find((l) => l.leadId === leadId);
          if (target) {
            setEditingLead(target);
            setIsProjectModalOpen(true);
          }
        }}
      />

      {/* Main Workspace */}
      <div className="flex-1 flex max-w-[1700px] w-full mx-auto">
        {/* Responsive Sidebar (Desktop & Mobile Slide-out Drawer) */}
        <Sidebar
          currentView={currentView}
          selectedStage={selectedStageFilter}
          onSelectViewOrStage={(view, stage) => {
            setCurrentView(view);
            if (stage) setSelectedStageFilter(stage);
            else if (view === 'table') setSelectedStageFilter('All');
          }}
          leads={roleFilteredLeads}
          currentUser={currentUser}
          isOpenOnMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Viewport Content */}
        <main className="flex-1 p-3.5 sm:p-6 overflow-y-auto">
          {/* 1. Main Project Sheet Executive Dashboard */}
          {currentView === 'dashboard' && (
            <DashboardOverview
              leads={roleFilteredLeads}
              activityLogs={activityLogs}
              onOpenSync={() => setIsSyncModalOpen(true)}
              onSelectStage={(stage) => {
                setSelectedStageFilter(stage);
                setCurrentView('table');
              }}
            />
          )}

          {/* 2. Full 44-Column Table View */}
          {currentView === 'table' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {selectedStageFilter === 'All' 
                        ? (isSales(currentUser?.role) ? 'My Assigned Leads' : `Main Sheet: ${syncConfig.mainSheetName || 'Main Project Sheet'}`) 
                        : `${selectedStageFilter} Projects`}
                    </h2>
                    <button
                      type="button"
                      onClick={() => setIsSyncModalOpen(true)}
                      className="px-2 py-0.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-md text-[10px] font-bold cursor-pointer"
                    >
                      Change Main / Payment Sheet Tab
                    </button>
                  </div>
                  <p className="text-xs text-slate-500">
                    {isSales(currentUser?.role) 
                      ? 'Viewing leads assigned to your sales account. Changes synchronize with the master Google Sheet.' 
                      : `Exact 44 columns mapped to "${syncConfig.mainSheetName || 'Main Project Sheet'}" & payments summed from "${syncConfig.paymentSheetName || 'Payment Sheet'}".`}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView('kanban')}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                  >
                    Switch to Kanban
                  </button>
                  <button
                    onClick={handleResetToDemo}
                    title="Reload sheet records"
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <LeadsTable
                leads={roleFilteredLeads}
                onEditLead={(lead) => {
                  setEditingLead(lead);
                  setProjectModalInitialTab('stage');
                  setIsProjectModalOpen(true);
                }}
                onDeleteLead={handleDeleteLead}
                onOpenWhatsApp={(lead) => {
                  setWhatsAppLead(lead);
                  setIsWhatsAppModalOpen(true);
                }}
                onUpdateStatus={handleUpdateStatus}
                selectedStageFilter={selectedStageFilter}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* 3. Visual Kanban Board (Filtered by Role's Visible Stages) */}
          {currentView === 'kanban' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isSales(currentUser?.role) ? 'Sales Pipeline (New Leads ➔ Documentation)' : 'Project Pipeline'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isSales(currentUser?.role)
                      ? 'Track your active prospects and advance them through qualification and documentation.'
                      : 'Advance customer sites from Lead ➔ Quotation ➔ Survey ➔ Installation ➔ Net Meter & Complete.'}
                  </p>
                </div>
                <button
                  onClick={() => setCurrentView('table')}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Switch to Table View
                </button>
              </div>

              <KanbanBoard
                leads={roleFilteredLeads}
                onUpdateStatus={handleUpdateStatus}
                onEditLead={(lead) => {
                  setEditingLead(lead);
                  setIsProjectModalOpen(true);
                }}
                onOpenWhatsApp={(lead) => {
                  setWhatsAppLead(lead);
                  setIsWhatsAppModalOpen(true);
                }}
                currentUser={currentUser}
              />
            </div>
          )}

          {/* 4. Follow-Up Schedule View */}
          {currentView === 'followups' && (
            <FollowUpSchedule
              leads={roleFilteredLeads}
              onOpenWhatsApp={(lead) => {
                setWhatsAppLead(lead);
                setIsWhatsAppModalOpen(true);
              }}
              onEditLead={(lead) => {
                setEditingLead(lead);
                setIsProjectModalOpen(true);
              }}
              onReschedule={handleReschedule}
            />
          )}

          {/* 5. Payment Sheet View (7 Columns) */}
          {currentView === 'payments' && (
            <PaymentSheetView
              payments={payments}
              leads={roleFilteredLeads}
              onAddPayment={handleAddPayment}
              currentUser={currentUser}
              paymentSheetName={syncConfig.paymentSheetName || 'Payment Sheet'}
              onOpenSheetSettings={() => setIsSyncModalOpen(true)}
            />
          )}

          {/* 6. Users & Team Management & Granular Column Permissions (Admin Only) */}
          {currentView === 'users' && (
            isAdmin(currentUser?.role) ? (
              <UsersManagement
                users={users}
                currentUser={currentUser}
                onSwitchUser={handleSwitchUser}
                onUpdateUser={handleUpdateUser}
                onAddUser={handleAddUser}
                onDeleteUser={handleDeleteUser}
                activityLogs={activityLogs}
              />
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 shadow-xs max-w-md mx-auto my-12 space-y-3">
                <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
                <h3 className="text-base font-bold text-slate-900">Admin Access Required</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  User management and permission configuration is restricted to Administrators only.
                </p>
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs cursor-pointer"
                >
                  Back to Dashboard
                </button>
              </div>
            )
          )}
        </main>
      </div>

      {/* Mobile One-Thumb Bottom Navigation (for Smartphones) */}
      <MobileBottomNav
        currentView={currentView}
        onViewChange={(view) => {
          setCurrentView(view);
          if (view === 'table') setSelectedStageFilter('All');
        }}
        onToggleSidebar={() => setIsMobileSidebarOpen(true)}
        todayFollowUpsCount={todayFollowUpsCount}
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-20 md:bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 44-Column Project Details Modal */}
      <ProjectDetailsModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setProjectModalInitialTab('stage');
        }}
        lead={editingLead}
        onSaveLead={handleSaveLead}
        payments={payments}
        onAddPayment={handleAddPayment}
        onAddPaymentForLead={() => {
          setCurrentView('payments');
          setIsProjectModalOpen(false);
          setProjectModalInitialTab('stage');
        }}
        currentUser={currentUser}
        users={users}
        initialTab={projectModalInitialTab}
      />

      {/* WhatsApp Quick Message Modal */}
      <WhatsAppModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        lead={whatsAppLead}
      />

      {/* Google Sheets Two-Way Sync Modal */}
      <GoogleSheetSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        leads={leads}
        payments={payments}
        onImportLeads={(importedLeads) => {
          const reconciled = reconcileLeadsWithPayments(importedLeads, payments);
          setLeads(reconciled);
          saveLeads(reconciled);
        }}
        onImportPayments={(importedPayments) => {
          const mergedPays = mergePaymentsList(payments, importedPayments);
          setPayments(mergedPays);
          savePayments(mergedPays);
          setLeads((prevLeads) => {
            const reconciled = reconcileLeadsWithPayments(prevLeads, mergedPays);
            saveLeads(reconciled);
            return reconciled;
          });
        }}
        syncConfig={syncConfig}
        onSaveSyncConfig={(cfg) => {
          setSyncConfig(cfg);
          saveSyncConfig(cfg);
        }}
        onTriggerTwoWaySync={() => handleTriggerTwoWaySync(false)}
        isSyncing={isSyncing}
        currentUser={currentUser}
      />

      {/* Public Share & Mobile App Installation Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        publicUrl={PUBLIC_APP_URL}
      />
    </div>
  );
}
