import React, { useState } from 'react';
import type { User } from '../types/crm';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  AlertTriangle, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  RefreshCw 
} from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton';
import { loadUsers } from '../utils/userStorage';

interface LoginPageProps {
  onLoginSuccess: (user: User) => void;
  webAppUrl?: string;
  users?: User[];
  onLogin?: (user: User) => void; // alias
}

export function LoginPage({ 
  onLoginSuccess, 
  webAppUrl = '', 
  users = loadUsers(),
  onLogin 
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const triggerLoginSuccess = (user: User) => {
    if (onLoginSuccess) {
      onLoginSuccess(user);
    } else if (onLogin) {
      onLogin(user);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();

    if (!cleanEmail) {
      setError('Please enter your email address.');
      setLoading(false);
      return;
    }

    if (!cleanPassword) {
      setError('Please enter your password.');
      setLoading(false);
      return;
    }

    try {
      // 1. Live Apps Script Auth API Call (if webAppUrl is provided)
      let authenticatedUser: User | null = null;

      if (webAppUrl) {
        try {
          const response = await fetch(webAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'login',
              email: cleanEmail,
              password: cleanPassword,
            }),
          });

          if (response.ok) {
            const resData = await response.json();

            if (resData.status === 'success' && resData.user) {
              if (resData.user.status === 'Inactive') {
                setError('Account Suspended / Inactive. Contact Admin.');
                setLoading(false);
                return;
              }

              authenticatedUser = {
                id: resData.user.id || `USR-${Date.now()}`,
                name: resData.user.name || cleanEmail.split('@')[0],
                email: resData.user.email || cleanEmail,
                role: resData.user.role || 'Sales Executive',
                status: 'Active',
                phone: resData.user.phone || '',
                lastActive: 'Just now',
                createdAt: new Date().toISOString(),
              };
            } else if (resData.status === 'error') {
              setError(resData.message || 'Invalid Email or Password');
              setLoading(false);
              return;
            }
          }
        } catch (netErr) {
          console.warn('Live Google Sheet auth unreachable, checking internal directory:', netErr);
        }
      }

      // 2. Local Fallback Verification (Internal database / offline)
      if (!authenticatedUser) {
        const localList = users.length > 0 ? users : loadUsers();
        const matched = localList.find((u) => u.email.toLowerCase() === cleanEmail);

        if (!matched) {
          setError('Access Denied: This email is not registered in DCPL Solar CRM. Contact Admin.');
          setLoading(false);
          return;
        }

        if (matched.status === 'Inactive') {
          setError('Account Suspended / Inactive. Contact Admin.');
          setLoading(false);
          return;
        }

        if (matched.password && matched.password !== cleanPassword) {
          setError('Invalid Email or Password');
          setLoading(false);
          return;
        }

        authenticatedUser = matched;
      }

      // Save session with 8-Hour Expiry Timestamp
      const sessionData: User = {
        ...authenticatedUser,
        loggedInAt: Date.now(),
        expiryAt: Date.now() + 8 * 60 * 60 * 1000, // 8 Hours Session Limit
      };

      localStorage.setItem('dcpl_crm_user', JSON.stringify(sessionData));
      triggerLoginSuccess(sessionData);

    } catch (err: any) {
      setError(err.message || 'Authentication Failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 relative selection:bg-indigo-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-900/80 to-slate-950 pointer-events-none" />

      <div className="bg-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 max-w-md w-full border border-slate-700 relative z-10">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto text-white shadow-lg shadow-indigo-600/30 mb-3">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">DCPL Solar CRM</h1>
          <p className="text-slate-400 text-xs mt-1">Authorized Role-Based Access Only</p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="bg-rose-500/10 border border-rose-500/40 text-rose-300 px-4 py-3 rounded-xl text-xs mb-5 flex items-start gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Strictly Manual Credentials Form (NO Demo Buttons) */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Registered Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setError('');
                }}
                placeholder="name@dcplsolar.com"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 text-xs font-semibold mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="w-full bg-slate-900/90 border border-slate-700 rounded-xl pl-10 pr-10 py-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Authenticating with Server...</span>
              </>
            ) : (
              <>
                <span>Sign In to Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* PWA App Install option */}
        <div className="pt-5 mt-6 border-t border-slate-700/60 text-center flex flex-col items-center gap-1.5">
          <PWAInstallButton />
          <p className="text-[11px] text-slate-500">
            Install DCPL Solar CRM on Android, iOS, or Desktop
          </p>
        </div>

      </div>
    </div>
  );
}

export default LoginPage;
