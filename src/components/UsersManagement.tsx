import React, { useState } from 'react';
import { User, UserRole, ActivityLog } from '../types/crm';
import { 
  ColumnAccessRule, 
  loadColumnPermissions, 
  saveColumnPermissions, 
  DEFAULT_COLUMN_RULES 
} from '../utils/permissionStorage';
import { 
  Users, 
  ShieldCheck, 
  Plus, 
  Mail, 
  Search, 
  LogIn,
  Activity,
  CheckCircle2,
  Lock,
  Eye,
  Sliders,
  RotateCcw
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
  const [activeTab, setActiveTab] = useState<'users' | 'columns' | 'activity'>('users');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [emailLoginInput, setEmailLoginInput] = useState('');

  // Column Permissions state
  const [columnRules, setColumnRules] = useState<ColumnAccessRule[]>(loadColumnPermissions());
  const [colSearch, setColSearch] = useState('');

  // New user form state
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('Sales Executive');
  const [newUserPhone, setNewUserPhone] = useState('');

  const isAdmin = currentUser.role === 'Admin';

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
    if (!newUserEmail || !newUserName) return;

    if (users.some((u) => u.email.toLowerCase() === newUserEmail.toLowerCase())) {
      alert('A user with this email address already exists!');
      return;
    }

    const created: User = {
      id: `USR-${Math.floor(100 + Math.random() * 900)}`,
      name: newUserName,
      email: newUserEmail.toLowerCase(),
      role: newUserRole,
      status: 'Active',
      phone: newUserPhone || '',
      lastActive: 'Just joined',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onAddUser(created);
    setIsAddUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
  };

  const handleEmailDirectLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const found = users.find((u) => u.email.toLowerCase() === emailLoginInput.toLowerCase().trim());
    if (!found) {
      alert('No user found with this email. Please check spelling or contact Administrator.');
      return;
    }
    if (found.status === 'Inactive') {
      alert('This user account is currently set to INACTIVE. Please contact Admin.');
      return;
    }
    onSwitchUser(found);
    setEmailLoginInput('');
  };

  // Toggle View role permission
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

  // Toggle Edit role permission
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
      {/* Current Session Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
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
            <div className="text-xs text-slate-500 font-mono mt-0.5">
              Logged in as: <strong>{currentUser.email}</strong>
            </div>
          </div>
        </div>

        {/* Quick Email Switcher */}
        <form onSubmit={handleEmailDirectLogin} className="flex items-center gap-2">
          <div className="relative">
            <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              placeholder="Switch user by email..."
              value={emailLoginInput}
              onChange={(e) => setEmailLoginInput(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-56 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Switch</span>
          </button>
        </form>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-4 text-xs font-medium">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Team Directory & Active/Inactive ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('columns')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'columns'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Sliders className="w-4 h-4 text-indigo-600" />
          <span>Column & Field Permissions ({columnRules.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-2.5 border-b-2 flex items-center gap-1.5 cursor-pointer transition-colors ${
            activeTab === 'activity'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-4 h-4 text-blue-600" />
          <span>Audit Activity Log ({activityLogs.length})</span>
        </button>
      </div>

      {/* TAB 1: User Management List */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsAddUserModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Team Member</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">Role Assigned</th>
                  <th className="py-3 px-4">Access Status</th>
                  <th className="py-3 px-4">Last Activity</th>
                  <th className="py-3 px-4 text-center">Quick Switch / Login</th>
                  {isAdmin && <th className="py-3 px-4 text-center">Admin Controls</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredUsers.map((u) => {
                  const isCurrent = u.email === currentUser.email;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs ${
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
                            <div className="text-[11px] text-slate-500 font-mono">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isAdmin ? (
                          <select
                            value={u.role}
                            onChange={(e) => handleRoleChange(u, e.target.value as UserRole)}
                            className="text-xs bg-white border border-slate-300 rounded-md px-2 py-1 focus:ring-1 focus:ring-indigo-500 cursor-pointer font-medium"
                          >
                            {ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {u.role}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${
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

                      <td className="py-3 px-4 text-slate-500 text-[11px] whitespace-nowrap">
                        {u.lastActive}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCurrent ? (
                          <span className="text-xs text-emerald-600 font-medium flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Current Session
                          </span>
                        ) : (
                          <button
                            disabled={u.status === 'Inactive'}
                            onClick={() => onSwitchUser(u)}
                            className="px-2.5 py-1 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-md transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Log in as {u.name.split(' ')[0]}
                          </button>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="py-3 px-4 text-center whitespace-nowrap">
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                              u.status === 'Active'
                                ? 'text-rose-700 hover:bg-rose-50 border border-rose-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-200'
                            }`}
                          >
                            {u.status === 'Active' ? 'Deactivate' : 'Activate User'}
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Granular Column & Field-Level Access Control */}
      {activeTab === 'columns' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-4 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Field-Level Security & Column Permissions</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Admin can configure which columns each role can View (Active/Inactive) or Edit.
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
                      <div className="inline-flex items-center gap-2">
                        <label title="Can View" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={col.viewRoles.includes('Sales Executive')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Sales Executive')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label title="Can Edit" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
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
                      <div className="inline-flex items-center gap-2">
                        <label title="Can View" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={col.viewRoles.includes('Operations Engineer')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Operations Engineer')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label title="Can Edit" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
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
                      <div className="inline-flex items-center gap-2">
                        <label title="Can View" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={col.viewRoles.includes('Accounts Manager')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Accounts Manager')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label title="Can Edit" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
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
                      <div className="inline-flex items-center gap-2">
                        <label title="Can View" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
                            checked={col.viewRoles.includes('Sales Manager')}
                            onChange={() => handleToggleViewRole(col.columnKey, 'Sales Manager')}
                            className="rounded text-indigo-600 w-3.5 h-3.5"
                          />
                          <span className="text-[10px] text-slate-500">View</span>
                        </label>
                        <label title="Can Edit" className="flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={!isAdmin}
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

      {/* TAB 3: Activity Audit Log */}
      {activeTab === 'activity' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Real-Time Team Activity Stream
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Tracks changes made by users via email, stage transitions, payments, and Google Sheet sync.
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
                    {log.leadName && (
                      <div className="text-[11px] text-indigo-600 font-medium mt-0.5">
                        Lead: {log.leadId} - {log.leadName}
                      </div>
                    )}
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

      {/* Add User Modal */}
      {isAddUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Add New Team Member</h3>
              <button
                onClick={() => setIsAddUserModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Google Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. ramesh@dcplsolar.com"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role</label>
                <select
                  value={newUserRole}
                  onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsAddUserModalOpen(false)}
                  className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 cursor-pointer"
                >
                  Save User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
