import React, { useState } from 'react';
import { User } from '../types/crm';
import { ShieldCheck, Mail, AlertTriangle, ArrowRight, UserCheck, Lock } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';

interface AuthGateProps {
  users: User[];
  onLoginSuccess: (user: User) => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ users, onLoginSuccess }) => {
  const [emailInput, setEmailInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const email = emailInput.trim().toLowerCase();
    if (!email) {
      setErrorMessage('Please enter your Google Email address.');
      return;
    }

    const matchedUser = users.find((u) => u.email.toLowerCase() === email);

    if (!matchedUser) {
      setErrorMessage(
        'Access Denied: This Google Email is not registered in DCPL Solar CRM. Contact Admin (dcplsolarbackend@gmail.com) for access.'
      );
      return;
    }

    if (matchedUser.status === 'Inactive') {
      setErrorMessage(
        'Account Suspended: Your access has been deactivated by the Administrator. Please contact management.'
      );
      return;
    }

    // Success
    onLoginSuccess(matchedUser);
  };

  const handleQuickSelect = (user: User) => {
    if (user.status === 'Inactive') {
      setErrorMessage(`User ${user.name} is set to Inactive. Cannot log in.`);
      return;
    }
    setErrorMessage(null);
    onLoginSuccess(user);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      {/* Background Glow */}
      <div className="absolute inset-0 bg-radial from-indigo-900/30 via-transparent to-transparent pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-7 sm:p-8 space-y-6 border border-slate-100 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-md shadow-indigo-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DCPL Solar CRM</h1>
          <p className="text-xs text-slate-500">
            Google Email Authentication & Role-Based Security Portal
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Enter Registered Google Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. name@dcplsolar.com / gmail.com"
                value={emailInput}
                onChange={(e) => {
                  setEmailInput(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Only authorized active team members can access project records.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <p className="leading-snug">{errorMessage}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
          >
            <span>Verify & Log In</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Quick Switcher for Testing Different Roles */}
        <div className="pt-4 border-t border-slate-100 space-y-2.5">
          <div className="flex items-center justify-between text-[11px] text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-slate-400">
              Quick Role Login (One-Click)
            </span>
            <span>{users.filter((u) => u.status === 'Active').length} Active</span>
          </div>

          <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickSelect(u)}
                className={`w-full p-2 rounded-lg text-left text-xs flex items-center justify-between transition-colors border cursor-pointer ${
                  u.status === 'Active'
                    ? 'bg-slate-50 hover:bg-indigo-50/60 border-slate-200 hover:border-indigo-300'
                    : 'bg-rose-50/40 border-rose-100 opacity-60'
                }`}
              >
                <div className="truncate">
                  <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    <span>{u.name}</span>
                    {u.status === 'Inactive' && (
                      <span className="text-[10px] text-rose-600 font-bold">(Inactive)</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-700 shrink-0 ml-2">
                  {u.role.split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Install Phone App prompt */}
        <div className="pt-2 text-center flex flex-col items-center gap-2">
          <PWAInstallButton />
          <p className="text-[11px] text-slate-400">
            Android & iPhone Home Screen App compatible
          </p>
        </div>
      </div>
    </div>
  );
};
