import React, { useState, useEffect } from 'react';
import type { User, UserRole, ActivityLog, PipelineStage } from '../types/crm';
import { 
  ColumnAccessRule, 
  loadColumnPermissions, 
  saveColumnPermissions, 
  DEFAULT_COLUMN_RULES 
} from '../utils/permissionStorage';
import {
  ALL_STAGES,
} from '../constants/stages';
import {
  FIELD_DEFINITIONS,
  loadStagePermissions,
  saveStagePermissions,
  DEFAULT_STAGE_PERMISSIONS,
  loadStageMandatoryRules,
  saveStageMandatoryRules,
  DEFAULT_STAGE_MANDATORY_RULES,
} from '../utils/pipelinePermissions';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Mail, 
  Search, 
  Activity, 
  CheckCircle2, 
  Lock, 
  Eye, 
  EyeOff, 
  Sliders, 
  RotateCcw,
  KeyRound,
  Edit2,
  Copy,
  Check,
  Sparkles,
  Smartphone,
  ShieldAlert,
  Save,
  X,
  Layers,
  CheckSquare,
  AlertCircle,
  FolderGit2
} from 'lucide-react';

interface UsersManagementProps {
  users: User[];
  currentUser: User;
  onSwitchUser: (user: User) => void;
  onUpdateUser: (updatedUser: User) => void;
  onAddUser: (newUser: User) => void;
  activityLogs: ActivityLog[];
}

const ROLES: UserRole[] = [
  'Admin',
  'Sales Manager',
  'Sales Executive',
  'Operations Engineer',
  'Accounts Manager',
];

export const UsersManagement: React.FC<UsersManagementProps> = ({
  users,
  currentUser,
  onSwitchUser,
  onUpdateUser,
  onAddUser,
  activityLogs,
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'pipeline' | 'mandatory' | 'columns' | 'activity'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<User | null>(null);

  // Edit User Form State
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('Sales Executive');
  const [editStatus, setEditStatus] = useState<'Active' | 'Inactive'>('Active');
  const [editPhone, setEditPhone] = useState('');
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editCustomStages, setEditCustomStages] = useState<PipelineStage[]>([]);
  const [hasCustomStagesOverride, setHasCustomStagesOverride] = useState(false);
  const [editModalMessage, setEditModalMessage] = useState<string | null>(null);

  // Column Permissions state
  const [columnRules, setColumnRules] = useState<ColumnAccessRule[]>(loadColumnPermissions());
  const [colSearch, setColSearch] = useState('');

  // Pipeline Stage Access state (Role-wise)
  const [stagePermissions, setStagePermissions] = useState<Record<UserRole, PipelineStage[]>>(loadStagePermissions());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Stage-Wise Mandatory Fields state
  const [mandatoryRules, setMandatoryRules] = useState<Record<PipelineStage, string[]>>(loadStageMandatoryRules());
  const [selectedStageForRules, setSelectedStageForRules] = useState<PipelineStage>('New Leads');

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Sales Executive');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Password visibility map for table rows
  const [visiblePasswordMap, setVisiblePasswordMap] = useState<Record<string, boolean>>({});
  const [copiedEmailMap, setCopiedEmailMap] = useState<Record<string, boolean>>({});

  const isAdmin = currentUser.role === 'Admin';

  useEffect(() => {
    const refreshRules = () => {
      setMandatoryRules(loadStageMandatoryRules());
      setStagePermissions(loadStagePermissions());
    };
    window.addEventListener('crm_stage_rules_updated', refreshRules);
    return () => window.removeEventListener('crm_stage_rules_updated', refreshRules);
  }, []);

  const showBannerMessage = (msg: string) => {
    setSaveSuccessMsg(msg);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredColumns = columnRules.filter(
    (c) =>
      c.label.toLowerCase().includes(colSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(colSearch.toLowerCase()) ||
      c.columnKey.toLowerCase().includes(colSearch.toLowerCase())
  );

  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswordMap((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedEmailMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedEmailMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const handleOpenEditModal = (targetUser: User) => {
    setSelectedUserForEdit(targetUser);
    setEditName(targetUser.name);
    setEditEmail(targetUser.email);
    setEditPassword(targetUser.password || 'dcpl123');
    setEditRole(targetUser.role);
    setEditStatus(targetUser.status);
    setEditPhone(targetUser.phone || '');
    setShowEditPassword(false);
    setEditModalMessage(null);
    const custom = targetUser.customAllowedStages;
    if (custom && custom.length > 0) {
      setHasCustomStagesOverride(true);
      setEditCustomStages([...custom]);
    } else {
      setHasCustomStagesOverride(false);
      setEditCustomStages([...(stagePermissions[targetUser.role] || DEFAULT_STAGE_PERMISSIONS[targetUser.role] || ALL_STAGES)]);
    }
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    const cleanEmail = editEmail.trim().toLowerCase();
    const cleanPassword = editPassword.trim();

    if (!cleanEmail || !editName.trim()) {
      setEditModalMessage('Name and Email are required.');
      return;
    }

    if (!cleanPassword) {
      setEditModalMessage('Password cannot be empty.');
      return;
    }

    // Check duplicate email
    const duplicate = users.find(
      (u) => u.id !== selectedUserForEdit.id && u.email.toLowerCase() === cleanEmail
    );
    if (duplicate) {
      setEditModalMessage(`A user with email ${cleanEmail} already exists (${duplicate.name}).`);
      return;
    }

    const updated: User = {
      ...selectedUserForEdit,
      name: editName.trim(),
      email: cleanEmail,
      password: cleanPassword,
      role: editRole,
      status: editStatus,
      phone: editPhone.trim(),
      customAllowedStages: hasCustomStagesOverride ? editCustomStages : undefined,
      lastActive: 'Credentials updated',
    };

    onUpdateUser(updated);
    setIsEditUserModalOpen(false);
  };

  const handleToggleStatus = (targetUser: User) => {
    if (!isAdmin) {
      alert('Only Administrators can change user active/inactive status.');
      return;
    }
    if (targetUser.email === currentUser.email) {
      alert('You cannot deactivate your own current admin account.');
      return;
    }

    const newStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';
    onUpdateUser({
      ...targetUser,
      status: newStatus,
      lastActive: newStatus === 'Active' ? 'Re-activated' : 'Deactivated by Admin',
    });
  };

  const handleRoleChange = (targetUser: User, newRole: UserRole) => {
    if (!isAdmin) {
      alert('Only Administrators can modify user roles.');
      return;
    }
    onUpdateUser({
      ...targetUser,
      role: newRole,
    });
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = newUserEmail.trim().toLowerCase();
    const cleanPassword = newUserPassword.trim() || 'dcpl123';

    if (!cleanEmail || !newUserName.trim()) return;

    if (users.some((u) => u.email.toLowerCase() === cleanEmail)) {
      alert('A user with this email address already exists!');
      return;
    }

    const created: User = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: newUserName.trim(),
      email: cleanEmail,
      password: cleanPassword,
      role: newUserRole,
      status: 'Active',
      phone: newUserPhone.trim() || '',
      lastActive: 'Just registered',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddUser(created);
    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserPhone('');
    setShowNewPassword(false);
  };

  // ------------------ Pipeline Stage Access Handlers ------------------
  const handleToggleRoleStage = (role: UserRole, stage: PipelineStage) => {
    if (!isAdmin) return;
    const currentList = stagePermissions[role] || [];
    const hasStage = currentList.includes(stage);
    const updatedStages = hasStage
      ? currentList.filter((s) => s !== stage)
      : [...currentList, stage];

    const updatedPermissions = {
      ...stagePermissions,
      [role]: updatedStages,
    };
    setStagePermissions(updatedPermissions);
    saveStagePermissions(updatedPermissions);
    showBannerMessage(`Updated stage access for [${role}].`);
  };

  const handleResetStagePermissions = () => {
    if (window.confirm('Reset all pipeline stage permissions to default matrix?')) {
      setStagePermissions(DEFAULT_STAGE_PERMISSIONS);
      saveStagePermissions(DEFAULT_STAGE_PERMISSIONS);
      showBannerMessage('Pipeline stage permissions reset to defaults.');
    }
  };

  // ------------------ Stage-Wise Mandatory Rules Handlers ------------------
  const handleToggleMandatoryField = (stage: PipelineStage, fieldKey: string) => {
    if (!isAdmin) return;
    const currentFields = mandatoryRules[stage] || [];
    const isMandatory = currentFields.includes(fieldKey);
    const updatedFields = isMandatory
      ? currentFields.filter((k) => k !== fieldKey)
      : [...currentFields, fieldKey];

    const updatedRules: Record<PipelineStage, string[]> = {
      ...mandatoryRules,
      [stage]: updatedFields,
    };
    if (stage === 'New Leads') {
      updatedRules['Lead'] = updatedFields;
    }
    setMandatoryRules(updatedRules);
    saveStageMandatoryRules(updatedRules);
    showBannerMessage(`Updated mandatory columns for stage "${stage}".`);
  };

  const handleResetMandatoryRules = () => {
    if (window.confirm('Reset all stage mandatory field rules to defaults?')) {
      setMandatoryRules(DEFAULT_STAGE_MANDATORY_RULES);
      saveStageMandatoryRules(DEFAULT_STAGE_MANDATORY_RULES);
      showBannerMessage('Stage mandatory rules reset to defaults.');
    }
  };

  // ------------------ Column Access Handlers ------------------
  const handleToggleViewRole = (colKey: string, role: UserRole) => {
    if (!isAdmin) return;
    const updated = columnRules.map((r) => {
      if (r.columnKey === colKey) {
        const has = r.viewRoles.includes(role);
        const newRoles = has ? r.viewRoles.filter((ro) => ro !== role) : [...r.viewRoles, role];
        return { ...r, viewRoles: newRoles };
      }
      return r;
    });
    setColumnRules(updated);
    saveColumnPermissions(updated);
  };

  const handleToggleEditRole = (colKey: string, role: UserRole) => {
    if (!isAdmin) return;
    const updated = columnRules.map((r) => {
      if (r.columnKey === colKey) {
        const has = r.editRoles.includes(role);
        const newRoles = has ? r.editRoles.filter((ro) => ro !== role) : [...r.editRoles, role];
        return { ...r, editRoles: newRoles };
      }
      return r;
    });
    setColumnRules(updated);
    saveColumnPermissions(updated);
  };

  const handleResetPermissions = () => {
    if (window.confirm('Reset all field & column permissions to default security matrix?')) {
      setColumnRules(DEFAULT_COLUMN_RULES);
      saveColumnPermissions(DEFAULT_COLUMN_RULES);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      {saveSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-medium">{saveSuccessMsg}</span>
          </div>
          <button onClick={() => setSaveSuccessMsg(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Current Session Banner with Security Info */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
            {currentUser.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">{currentUser.name}</span>
              <span className="text-[10px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-200">
                {currentUser.role}
              </span>
              <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                Active Session
              </span>
            </div>
            <div className="text-xs text-slate-500 font-mono mt-0.5 flex flex-wrap items-center gap-2">
              <span>Admin Email: <strong>{currentUser.email}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="text-slate-500">Pipeline Stage Access, Column Rules, and Stage Mandatory Rules are active</span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsAddUserModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Add New User & Password</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Tabs (5 Tabs) */}
      <div className="flex border-b border-slate-200 gap-2 sm:gap-4 text-xs font-medium overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-indigo-600" />
          <span>User Directory & Passwords ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('pipeline')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'pipeline'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-600" />
          <span>Pipeline Stage Access (Who Sees What)</span>
        </button>

        <button
          onClick={() => setActiveTab('mandatory')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'mandatory'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <CheckSquare className="w-4 h-4 text-amber-600" />
          <span>Stage-Wise Mandatory Fields Manager</span>
        </button>

        <button
          onClick={() => setActiveTab('columns')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'columns'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-slate-600" />
          <span>Column & Field Permissions ({columnRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Security Audit Log ({activityLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: User Credentials & Passwords Management Table */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">Total Staff: <strong>{users.length}</strong></span>
              <span className="hidden sm:inline">•</span>
              <span className="text-emerald-600 font-medium">
                Active: {users.filter((u) => u.status === 'Active').length}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">User Details (Name & Email)</th>
                  <th className="py-3 px-4">Role Assigned</th>
                  <th className="py-3 px-4">Login Password</th>
                  <th className="py-3 px-4">Stage Access Level</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4 text-center">Set Email, Password & Stages</th>
                  <th className="py-3 px-4 text-center">Active Toggle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => {
                  const isCurrent = u.email === currentUser.email;
                  const isPasswordVisible = !!visiblePasswordMap[u.id];
                  const userPassword = u.password || 'dcpl123';
                  const isCopied = !!copiedEmailMap[u.id];
                  const hasCustom = u.customAllowedStages && u.customAllowedStages.length > 0;
                  const stageCount = hasCustom ? u.customAllowedStages!.length : (stagePermissions[u.role] || []).length;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* User Info & Email */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 ${
                              u.status === 'Active'
                                ? 'bg-slate-900 text-white'
                                : 'bg-slate-200 text-slate-500'
                            }`}
                          >
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                              <span>{u.name}</span>
                              {isCurrent && (
                                <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-sans font-medium">
                                  You
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span>{u.email}</span>
                              <button
                                onClick={() => copyToClipboard(u.email, u.id)}
                                title="Copy Email"
                                className="text-slate-400 hover:text-slate-700 p-0.5 rounded cursor-pointer"
                              >
                                {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                              </button>
                            </div>
                            {u.phone && (
                              <div className="text-[10px] text-slate-400 font-mono">{u.phone}</div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium text-slate-800"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 font-medium">
                            {u.role}
                          </span>
                        )}
                      </td>

                      {/* Password Field with Eye Toggle */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-lg w-fit">
                          <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="font-mono text-xs font-semibold text-slate-800 tracking-wider">
                            {isPasswordVisible ? userPassword : '••••••••'}
                          </span>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(u.id)}
                            title={isPasswordVisible ? 'Hide password' : 'Show password'}
                            className="text-slate-400 hover:text-slate-700 p-0.5 ml-1 cursor-pointer"
                          >
                            {isPasswordVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </td>

                      {/* Pipeline Stage Access Level */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ${
                          hasCustom
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}>
                          <Layers className="w-3 h-3" />
                          <span>{stageCount} Stages {hasCustom ? '(Custom)' : '(By Role)'}</span>
                        </span>
                      </td>

                      {/* Access Status */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              u.status === 'Active' ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          {u.status}
                        </span>
                      </td>

                      {/* Set Email & Password Button */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          onClick={() => handleOpenEditModal(u)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Set Password / Edit</span>
                        </button>
                      </td>

                      {/* Deactivate / Activate Toggle */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <button
                          disabled={isCurrent}
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
                            u.status === 'Active'
                              ? 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                          }`}
                        >
                          {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Pipeline Stage Access Matrix (Who Sees What) */}
      {activeTab === 'pipeline' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Pipeline Stage Access Control Matrix</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Configure which pipeline stages each staff role can view and access in the Sidebar, Kanban, and Table.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={handleResetStagePermissions}
                className="px-3.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Standard Defaults</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase">
                  <th className="py-3 px-4">Pipeline Stage Name</th>
                  <th className="py-3 px-3 text-center">Sales Executive</th>
                  <th className="py-3 px-3 text-center">Operations Engineer</th>
                  <th className="py-3 px-3 text-center">Sales Manager</th>
                  <th className="py-3 px-3 text-center">Accounts Manager</th>
                  <th className="py-3 px-3 text-center">Admin (Full)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ALL_STAGES.map((stage) => (
                  <tr key={stage} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4 font-semibold text-slate-900 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-500" />
                      <span>{stage}</span>
                    </td>

                    {/* Sales Executive */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={(stagePermissions['Sales Executive'] || []).includes(stage)}
                        onChange={() => handleToggleRoleStage('Sales Executive', stage)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Operations Engineer */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={(stagePermissions['Operations Engineer'] || []).includes(stage)}
                        onChange={() => handleToggleRoleStage('Operations Engineer', stage)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Sales Manager */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={(stagePermissions['Sales Manager'] || []).includes(stage)}
                        onChange={() => handleToggleRoleStage('Sales Manager', stage)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Accounts Manager */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        checked={(stagePermissions['Accounts Manager'] || []).includes(stage)}
                        onChange={() => handleToggleRoleStage('Accounts Manager', stage)}
                        className="rounded text-indigo-600 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Admin */}
                    <td className="py-2.5 px-3 text-center">
                      <input
                        type="checkbox"
                        disabled
                        checked={true}
                        className="rounded text-indigo-600 w-4 h-4 opacity-70 cursor-not-allowed"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Stage-Wise Mandatory Fields Manager */}
      {activeTab === 'mandatory' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-5 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-amber-600" />
                <span>Stage-Wise Mandatory (Required) Fields Manager</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Decide which fields are required at each pipeline stage. E.g. At 'New Leads', customer capacity is NOT required, only Name, Phone, Source, and Sales Person are required.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={handleResetMandatoryRules}
                className="px-3.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center gap-1.5 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Standard Mandatory Rules</span>
              </button>
            )}
          </div>

          {/* Stage Selector Pills */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700">Select Pipeline Stage to Configure:</label>
            <div className="flex flex-wrap gap-1.5">
              {ALL_STAGES.map((st) => {
                const isSelected = selectedStageForRules === st;
                const fieldCount = (mandatoryRules[st] || []).length;

                return (
                  <button
                    key={st}
                    onClick={() => setSelectedStageForRules(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    <span>{st}</span>
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                      {fieldCount} req
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Current Stage Mandatory Fields Checklist */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                  <span>Required Fields for Stage:</span>
                  <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-lg font-mono">
                    {selectedStageForRules}
                  </span>
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Checked fields must be filled before a project can be saved or moved to this stage.
                </p>
              </div>
              <span className="text-xs text-slate-500 font-mono">
                Total Required: <strong>{(mandatoryRules[selectedStageForRules] || []).length}</strong>
              </span>
            </div>

            {/* Fields Grid by Category */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {FIELD_DEFINITIONS.map((field) => {
                const isChecked = (mandatoryRules[selectedStageForRules] || []).includes(field.key);

                return (
                  <label
                    key={field.key}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition-all ${
                      isChecked
                        ? 'bg-white border-indigo-400 shadow-2xs'
                        : 'bg-white/60 border-slate-200 hover:bg-white'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handleToggleMandatoryField(selectedStageForRules, field.key)}
                      className="mt-0.5 rounded text-indigo-600 w-4 h-4 cursor-pointer"
                    />
                    <div>
                      <div className="font-semibold text-slate-900 text-xs">{field.label}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <span className="font-mono">{field.key}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1 rounded">{field.category}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Column & Field-Level Access Control */}
      {activeTab === 'columns' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Field-Level Security & Column Permissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin can configure which columns each role can View or Edit in the CRM table.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Filter columns..."
                value={colSearch}
                onChange={(e) => setColSearch(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
              />
              {isAdmin && (
                <button
                  onClick={handleResetPermissions}
                  className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default</span>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[11px] font-semibold text-slate-700 uppercase">
                  <th className="py-2.5 px-3">Column / Field</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">Sales Executive</th>
                  <th className="py-2.5 px-3 text-center">Operations Eng.</th>
                  <th className="py-2.5 px-3 text-center">Accounts Mgr.</th>
                  <th className="py-2.5 px-3 text-center">Sales Manager</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredColumns.map((col) => (
                  <tr key={col.columnKey} className="hover:bg-slate-50/70">
                    <td className="py-2 px-3 font-medium text-slate-900">
                      <div>{col.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{col.columnKey}</div>
                    </td>

                    <td className="py-2 px-3 text-slate-500 text-[11px]">
                      <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {col.category}
                      </span>
                    </td>

                    {/* Sales Executive */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.viewRoles.includes('Sales Executive')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Sales Executive')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.editRoles.includes('Sales Executive')}
                            onChange={() => handleToggleEditRole(col.columnKey, 'Sales Executive')}
                            className="rounded text-emerald-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">Edit</span>
                        </label>
                      </div>
                    </td>

                    {/* Operations Engineer */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.viewRoles.includes('Operations Engineer')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Operations Engineer')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.editRoles.includes('Operations Engineer')}
                            onChange={() => handleToggleEditRole(col.columnKey, 'Operations Engineer')}
                            className="rounded text-emerald-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">Edit</span>
                        </label>
                      </div>
                    </td>

                    {/* Accounts Manager */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.viewRoles.includes('Accounts Manager')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Accounts Manager')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.editRoles.includes('Accounts Manager')}
                            onChange={() => handleToggleEditRole(col.columnKey, 'Accounts Manager')}
                            className="rounded text-emerald-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">Edit</span>
                        </label>
                      </div>
                    </td>

                    {/* Sales Manager */}
                    <td className="py-2 px-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.viewRoles.includes('Sales Manager')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Sales Manager')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={col.editRoles.includes('Sales Manager')}
                            onChange={() => handleToggleEditRole(col.columnKey, 'Sales Manager')}
                            className="rounded text-emerald-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">Edit</span>
                        </label>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: Activity Audit Log */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Real-Time Security & User Audit Log
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Logs user logins, password updates, status changes, and stage transitions.
            </p>
          </div>

          <div className="divide-y divide-slate-100 max-h-[600px] overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log.id} className="p-4 hover:bg-slate-50/80 transition-colors flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-100 text-slate-600 rounded-lg mt-0.5 shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900 flex items-center gap-2">
                      <span>{log.userName}</span>
                      <span className="text-[10px] text-slate-500 font-mono">({log.userEmail})</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-600">
                        {log.userRole}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-0.5">{log.details}</p>
                  </div>
                </div>

                <span className="text-[11px] text-slate-400 font-mono tabular-nums whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Set Email, Password & Custom Stages (Edit Credentials Modal) */}
      {isEditUserModalOpen && selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 my-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Set Email, Password & Stage Access</h3>
                  <p className="text-[11px] text-slate-500">
                    Update user credentials and customized stage permissions for <strong>{selectedUserForEdit.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsEditUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4 text-xs max-h-[75vh] overflow-y-auto">
              {editModalMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{editModalMessage}</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                />
              </div>

              {/* Email Address */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Login Email Address (Backend Security Key) *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">
                    Login Password *
                  </label>
                  <button
                    type="button"
                    onClick={() => setEditPassword(`dcpl${Math.floor(100 + Math.random() * 900)}`)}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                  >
                    Generate Random
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showEditPassword ? 'text' : 'password'}
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold font-mono text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600"
                  />
                  <button
                    type="button"
                    onClick={() => setShowEditPassword(!showEditPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Role & Status Row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Assigned</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Access Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'Active' | 'Inactive')}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium cursor-pointer"
                  >
                    <option value="Active">Active (Allowed)</option>
                    <option value="Inactive">Inactive (Suspended)</option>
                  </select>
                </div>
              </div>

              {/* Custom Pipeline Stage Access Override */}
              <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-2xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-purple-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-purple-600" />
                    <span>Custom Pipeline Stage Override for This User</span>
                  </label>
                  <label className="flex items-center gap-1 text-[11px] cursor-pointer text-purple-800 font-medium">
                    <input
                      type="checkbox"
                      checked={hasCustomStagesOverride}
                      onChange={(e) => setHasCustomStagesOverride(e.target.checked)}
                      className="rounded text-purple-600 w-3.5 h-3.5"
                    />
                    <span>Enable Custom Override</span>
                  </label>
                </div>

                {hasCustomStagesOverride ? (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] text-purple-700">
                      Select which specific pipeline stages this user is allowed to access:
                    </p>
                    <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto p-1 bg-white rounded-xl border border-purple-200">
                      {ALL_STAGES.map((st) => {
                        const isChecked = editCustomStages.includes(st);
                        return (
                          <label key={st} className="flex items-center gap-1.5 text-[11px] p-1 rounded hover:bg-purple-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setEditCustomStages((prev) =>
                                  prev.includes(st) ? prev.filter((s) => s !== st) : [...prev, st]
                                );
                              }}
                              className="rounded text-purple-600 w-3.5 h-3.5"
                            />
                            <span className="truncate">{st}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-purple-700">
                    Currently follows standard permissions for <strong>{editRole}</strong> (configured in "Pipeline Stage Access" tab).
                  </p>
                )}
              </div>

              {/* Phone */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 9876543210"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                />
              </div>

              {/* Buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditUserModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Credentials</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Add New Team Member & Password Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 text-white rounded-xl">
                  <Plus className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Add New User & Password</h3>
                  <p className="text-[11px] text-slate-500">Register new staff member for DCPL Solar CRM</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Address *</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="ramesh@dcplsolar.com"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Set Initial Password *</label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    placeholder="e.g. sales123"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-semibold font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Role Assigned</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium cursor-pointer"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    placeholder="+91 9876543210"
                    value={newUserPhone}
                    onChange={(e) => setNewUserPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl cursor-pointer shadow-xs flex items-center gap-1.5 transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>Save User & Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersManagement;
