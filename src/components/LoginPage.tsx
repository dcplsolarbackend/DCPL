import React, { useState } from 'react';
import type { User, SheetSyncConfig } from '../types/crm';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertTriangle, 
  ArrowRight, 
  KeyRound, 
  Eye, 
  EyeOff, 
  RefreshCw,
  Sparkles,
  Smartphone,
  CheckCircle2
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { loadSyncConfig } from '../utils/storage';

interface LoginPageProps {
  users: User[];
  onLogin: (user: User) => void;
  syncConfig?: SheetSyncConfig;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  users, 
  onLogin,
  syncConfig = loadSyncConfig()
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setErrorMessage('Please enter your registered Google Email address.');
      return;
    }

    setIsLoading(true);

    try {
      // 1. If Google Sheets Web App URL is configured, try live Apps Script verification
      if (syncConfig.webAppUrl && cleanPassword) {
        try {
          const response = await fetch(syncConfig.webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'login',
              email: cleanEmail,
              password: cleanPassword,
            }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.status === 'success' && data.user) {
              const sheetUser: User = {
                id: data.user.id || `USR-${Date.now()}`,
                name: data.user.name || cleanEmail.split('@')[0],
                email: data.user.email || cleanEmail,
                role: data.user.role || 'Sales Executive',
                status: 'Active',
                lastActive: 'Just now',
                createdAt: new Date().toISOString(),
              };
              setIsLoading(false);
              onLogin(sheetUser);
              return;
            } else if (data.status === 'error') {
              setErrorMessage(data.message || 'Invalid Credentials in Google Sheet Users.');
              setIsLoading(false);
              return;
            }
          }
        } catch (netErr) {
          // If live sync is unreachable, fallback to local users list
          console.warn('Live Google Sheet auth unreachable, checking local database:', netErr);
        }
      }

      // 2. Verify against local registered users database
      const matchedUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

      if (!matchedUser) {
        setErrorMessage(
          'Access Denied: This email is not registered in DCPL Solar CRM. Contact Admin (dcplsolarbackend@gmail.com) to grant access.'
        );
        setIsLoading(false);
        return;
      }

      if (matchedUser.status === 'Inactive') {
        setErrorMessage(
          'Account Suspended: Your access has been deactivated by the Administrator. Please contact management.'
        );
        setIsLoading(false);
        return;
      }

      // Password check if user provided a password
      if (cleanPassword && matchedUser.password && matchedUser.password !== cleanPassword) {
        setErrorMessage('Incorrect password for this user account.');
        setIsLoading(false);
        return;
      }

      // Login success
      setIsLoading(false);
      onLogin(matchedUser);

    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err.message || 'An error occurred during authentication.');
    }
  };

  const handleQuickDemoSelect = (user: User) => {
    setErrorMessage(null);
    if (user.status === 'Inactive') {
      setErrorMessage(`User ${user.name} (${user.email}) is currently Inactive/Suspended.`);
      return;
    }
    onLogin(user);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center p-4 selection:bg-indigo-500 selection:text-white relative">
      {/* Ambient Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900/80 to-slate-950 pointer-events-none" />

      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 sm:p-8 space-y-5 border border-slate-100 relative z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Logo & Header */}
        <div className="text-center space-y-1.5">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-md shadow-indigo-600/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">DCPL Solar CRM</h1>
          <p className="text-xs text-slate-500">
            Google Email & Role-Based Access Security Gate
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Email Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Registered Google Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                placeholder="e.g. dcplsolarbackend@gmail.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <span className="text-[10px] text-slate-400">
                (Optional for registered Google email)
              </span>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMessage(null);
                }}
                className="w-full pl-10 pr-10 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <p className="leading-snug text-[11px]">{errorMessage}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-70"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Verifying credentials...</span>
              </>
            ) : (
              <>
                <span>Secure Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Step 2 Demonstration: Quick Role Selector */}
        <div className="pt-3 border-t border-slate-100 space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Select Role to Test:</span>
            </span>
            <span className="text-[10px] text-slate-400">1-Click Login</span>
          </div>

          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {users.map((u) => {
              const isInactive = u.status === 'Inactive';
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickDemoSelect(u)}
                  className={`w-full p-2 rounded-xl text-left text-xs flex items-center justify-between transition-all border cursor-pointer ${
                    isInactive
                      ? 'bg-rose-50/40 border-rose-100 opacity-60 hover:opacity-80'
                      : 'bg-slate-50 hover:bg-indigo-50/70 border-slate-200 hover:border-indigo-300'
                  }`}
                >
                  <div className="truncate flex-1 min-w-0 pr-2">
                    <div className="font-semibold text-slate-900 truncate flex items-center gap-1.5">
                      <span>{u.name}</span>
                      {isInactive && (
                        <span className="text-[9px] px-1 py-0.2 bg-rose-100 text-rose-700 font-bold rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{u.email}</div>
                  </div>
                  <div className="flex flex-col items-end shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                      u.role === 'Admin'
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : u.role.includes('Sales')
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-amber-50 border-amber-200 text-amber-700'
                    }`}>
                      {u.role.split(' ')[0]}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">
                      {u.role === 'Admin' ? 'All 15 Stages' : u.role.includes('Sales') ? '5 Sales Stages' : 'Ops Stages'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* PWA & Mobile Installation */}
        <div className="pt-2 text-center flex flex-col items-center gap-1.5 border-t border-slate-100">
          <PWAInstallButton />
          <p className="text-[10px] text-slate-400">
            Installable on Android & iOS Home Screen
          </p>
        </div>

      </div>
    </div>
  );
};
