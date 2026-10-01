import React, { useState, useEffect, useMemo } from 'react';
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
  exportToGoogleSheetCsv,
  downloadCsv
} from './utils/storage';
import { 
  loadUsers, 
  saveUsers, 
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
  const [leads, setLeads] = useState<Lead[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  // Always require login on link open
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>('All');
  const [syncConfig, setSyncConfig] = useState<SheetSyncConfig>(loadSyncConfig());
  const [isSyncing, setIsSyncing] = useState(false);

  // Modals state
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
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

  // Load initial data on mount
  useEffect(() => {
    const loadedLeads = loadLeads();
    setLeads(loadedLeads);

    const loadedPayments = loadPayments();
    setPayments(loadedPayments);

    const loadedUsers = loadUsers();
    setUsers(loadedUsers);

    setActivityLogs(loadActivityLogs());
    setNotifications(loadNotifications());
  }, []);

  // Step 2: Role-based Filtered Leads
  // - Admin: Complete Company Data (All 15 Stages)
  // - Sales: Only their own assigned / created leads (New Leads -> Documentation)
  // - Operations: Projects in execution stages (Registration -> Connection/Complete)
  const roleFilteredLeads = useMemo(() => {
    return filterLeadsByRole(leads, currentUser);
  }, [leads, currentUser]);

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
        updated = [leadWithMeta, ...prev];
        showToast(`New project ${lead.leadId} created.`);
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
      details: `${currentUser.name} saved project ${lead.customerName} (${lead.status})`,
    });
    setActivityLogs((prev) => [log, ...prev]);

    const notif = addNotification({
      title: 'Project Saved',
      message: `${currentUser.name} saved ${lead.customerName} (${lead.leadId})`,
      type: 'lead_assigned',
      targetLeadId: lead.leadId,
    });
    setNotifications((prev) => [notif, ...prev]);

    // Push to Google Sheet
    if (syncConfig.webAppUrl) {
      try {
        fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveLead',
            lead: leadWithMeta,
            updatedBy: currentUser.email,
          }),
        }).catch((e) => console.log('Sync queued:', e));
      } catch (e) {
        console.error(e);
      }
    }
  };

  // Add Payment Record
  const handleAddPayment = (newPay: PaymentRecord) => {
    if (!currentUser) return;
    setPayments((prev) => {
      const updated = [newPay, ...prev];
      savePayments(updated);
      return updated;
    });

    // Recalculate lead payment totals
    setLeads((prev) => {
      const target = prev.find((l) => l.leadId === newPay.leadId);
      if (!target) return prev;

      const currentReceived = target.paymentReceived || 0;
      const newReceived = currentReceived + newPay.amount;
      const deal = target.dealAmount || 0;
      const newDue = Math.max(0, deal - newReceived);

      const updatedLead: Lead = {
        ...target,
        paymentReceived: newReceived,
        duePayment: newDue,
        lastModifiedBy: currentUser.email,
        lastModifiedTime: new Date().toLocaleString(),
      };

      const updatedList = prev.map((l) => (l.leadId === newPay.leadId ? updatedLead : l));
      saveLeads(updatedList);

      if (syncConfig.webAppUrl) {
        try {
          fetch(syncConfig.webAppUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'savePayment',
              payment: newPay,
              lead: updatedLead,
              updatedBy: currentUser.email,
            }),
          }).catch((e) => console.log('Payment sync queued:', e));
        } catch (e) {
          console.error(e);
        }
      }

      return updatedList;
    });

    const leadObj = leads.find((l) => l.leadId === newPay.leadId);

    const log = logActivity({
      userEmail: currentUser.email,
      userName: currentUser.name,
      userRole: currentUser.role,
      action: 'RECORD_PAYMENT',
      leadId: newPay.leadId,
      leadName: leadObj?.customerName,
      details: `${currentUser.name} recorded payment of ₹${newPay.amount.toLocaleString('en-IN')}`,
    });
    setActivityLogs((prev) => [log, ...prev]);

    const notif = addNotification({
      title: 'Payment Received',
      message: `₹${newPay.amount.toLocaleString('en-IN')} received for ${leadObj?.customerName || newPay.leadId}`,
      type: 'payment_due',
      targetLeadId: newPay.leadId,
    });
    setNotifications((prev) => [notif, ...prev]);

    showToast(`Payment of ₹${newPay.amount.toLocaleString('en-IN')} recorded.`);
  };

  // Two-way synchronization handler
  const handleTriggerTwoWaySync = async () => {
    if (!currentUser) return;
    if (!syncConfig.webAppUrl) {
      showToast('Please enter your Google Apps Script URL first.');
      return;
    }

    setIsSyncing(true);
    try {
      const res = await fetch(syncConfig.webAppUrl, { method: 'GET', mode: 'cors' });
      const json = await res.json();

      if (json && json.leads && Array.isArray(json.leads)) {
        if (json.leads.length > 0) {
          setLeads(json.leads);
          saveLeads(json.leads);
        }

        if (json.payments && Array.isArray(json.payments) && json.payments.length > 0) {
          setPayments(json.payments);
          savePayments(json.payments);
        }

        const log = logActivity({
          userEmail: currentUser.email,
          userName: currentUser.name,
          userRole: currentUser.role,
          action: 'SHEET_SYNC',
          details: `2-Way sync pulled ${json.leads.length} projects & ${json.payments?.length || 0} payments from Sheet.`,
        });
        setActivityLogs((prev) => [log, ...prev]);

        showToast(`Pulled ${json.leads.length} projects & ${json.payments?.length || 0} payments from Google Sheet!`);
      } else {
        // Fallback post
        await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'syncBatch',
            leads: leads,
            payments: payments,
            updatedBy: currentUser.email,
          }),
        });
        showToast('Local database synced to Google Sheet.');
      }
    } catch (err) {
      try {
        await fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'syncBatch',
            leads: leads,
            payments: payments,
            updatedBy: currentUser.email,
          }),
        });
        showToast('Background sync dispatch sent to Google Sheet.');
      } catch (postErr) {
        showToast('Could not reach Google Apps Script Web App.');
      }
    } finally {
      setIsSyncing(false);
      setSyncConfig((prev) => ({
        ...prev,
        lastSyncedAt: new Date().toISOString(),
      }));
    }
  };

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

    setLeads((prev) => {
      const updated = prev.map((l) => (l.leadId === leadId ? updatedLead : l));
      saveLeads(updated);
      showToast(`Moved ${target.customerName} to "${newStatus}".`);
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

    if (syncConfig.webAppUrl) {
      try {
        fetch(syncConfig.webAppUrl, {
          method: 'POST',
          mode: 'no-cors',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'saveLead',
            lead: updatedLead,
            updatedBy: currentUser.email,
          }),
        }).catch((e) => console.log('Sync queued:', e));
      } catch (e) {
        console.error(e);
      }
    }
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

  const handleUpdateUser = (updatedUser: User) => {
    const updatedList = users.map((u) => (u.id === updatedUser.id ? updatedUser : u));
    setUsers(updatedList);
    saveUsers(updatedList);
    if (currentUser && currentUser.id === updatedUser.id) {
      setCurrentUserState(updatedUser);
      setStoredUser(updatedUser);
    }
  };

  const handleAddUser = (newUser: User) => {
    const updatedList = [newUser, ...users];
    setUsers(updatedList);
    saveUsers(updatedList);
    showToast(`Added user ${newUser.name}.`);
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
                  <h2 className="text-base font-bold text-slate-900">
                    {selectedStageFilter === 'All' 
                      ? (isSales(currentUser?.role) ? 'My Assigned Leads' : 'Main Project Sheet (Master Data)') 
                      : `${selectedStageFilter} Projects`}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isSales(currentUser?.role) 
                      ? 'Viewing leads assigned to your sales account. Changes synchronize with the master Google Sheet.' 
                      : 'Exact 44 columns mapped to your live Google Sheet. Click any row to view complete technical details.'}
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
        onClose={() => setIsProjectModalOpen(false)}
        lead={editingLead}
        onSaveLead={handleSaveLead}
        payments={payments}
        onAddPaymentForLead={() => {
          setCurrentView('payments');
          setIsProjectModalOpen(false);
        }}
        currentUser={currentUser}
        users={users}
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
          setLeads(importedLeads);
          saveLeads(importedLeads);
        }}
        onImportPayments={(importedPayments) => {
          setPayments(importedPayments);
          savePayments(importedPayments);
        }}
        syncConfig={syncConfig}
        onSaveSyncConfig={(cfg) => {
          setSyncConfig(cfg);
          saveSyncConfig(cfg);
        }}
        onTriggerTwoWaySync={handleTriggerTwoWaySync}
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
