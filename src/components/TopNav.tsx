import React from 'react';
import { ViewMode, User } from '../types/crm';
import { PWAInstallButton } from './PWAInstallButton';
import { 
  Plus, 
  RefreshCw, 
  Bell, 
  Menu, 
  Share2, 
  LogOut,
  Sliders
} from 'lucide-react';

interface TopNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onOpenNewLeadModal: () => void;
  onOpenSyncModal: () => void;
  onExportCsv: () => void;
  currentUser: User;
  onOpenUserModal: () => void;
  unreadNotificationsCount: number;
  onToggleNotifications: () => void;
  onToggleSidebar: () => void;
  onOpenShareModal: () => void;
  onLogout: () => void;
  isSyncing?: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  currentView,
  onViewChange,
  onOpenNewLeadModal,
  onOpenSyncModal,
  currentUser,
  onOpenUserModal,
  unreadNotificationsCount,
  onToggleNotifications,
  onToggleSidebar,
  onOpenShareModal,
  onLogout,
  isSyncing,
}) => {
  return (
    <header className="sticky top-0 z-30 flex h-14 sm:h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-3 sm:px-6 backdrop-blur-md">
      {/* Zone 1: Hamburger (Mobile) + Single text element wordmark */}
      <div className="flex items-center gap-2">
        <button
          onClick={onToggleSidebar}
          title="Open Stages Menu"
          className="md:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onViewChange('dashboard');
          }}
          className="text-base sm:text-lg font-bold tracking-tight text-slate-900 hover:text-indigo-600 transition-colors whitespace-nowrap"
        >
          DCPL Solar CRM
        </a>
      </div>

      {/* Zone 2: 4-6 clean text navigation links (Desktop) */}
      <nav className="hidden lg:flex items-center gap-5 text-xs xl:text-sm font-medium text-slate-600">
        <button
          onClick={() => onViewChange('dashboard')}
          className={`cursor-pointer transition-colors pb-1 ${
            currentView === 'dashboard'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Main Sheet
        </button>
        <button
          onClick={() => onViewChange('table')}
          className={`cursor-pointer transition-colors pb-1 ${
            currentView === 'table'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          All Data
        </button>
        <button
          onClick={() => onViewChange('kanban')}
          className={`cursor-pointer transition-colors pb-1 ${
            currentView === 'kanban'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Pipeline
        </button>
        <button
          onClick={() => onViewChange('payments')}
          className={`cursor-pointer transition-colors pb-1 ${
            currentView === 'payments'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          Payment Details
        </button>
        <button
          onClick={() => onViewChange('users')}
          className={`cursor-pointer transition-colors pb-1 flex items-center gap-1 ${
            currentView === 'users'
              ? 'text-indigo-600 border-b-2 border-indigo-600 font-semibold'
              : 'hover:text-slate-900'
          }`}
        >
          <span>Team & Permissions</span>
        </button>
      </nav>

      {/* Zone 3: Actions + PWA + Notification & User Status */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* PWA Install Button */}
        <PWAInstallButton />

        {/* Share Public Link Button */}
        <button
          onClick={onOpenShareModal}
          title="Share Public Link & Mobile App"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <Share2 className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">Share</span>
        </button>

        {/* Google Sheet Sync Button */}
        <button
          onClick={onOpenSyncModal}
          title="Google Apps Script two-way sync"
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isSyncing ? 'animate-spin text-indigo-600' : ''}`} />
          <span className="hidden sm:inline">Sync</span>
        </button>

        {/* Notifications Bell */}
        <button
          onClick={onToggleNotifications}
          title="In-App Notifications"
          className="relative p-1.5 sm:p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
        >
          <Bell className="w-4 h-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
          )}
        </button>

        {/* Current User Session Switcher Pill */}
        <button
          onClick={onOpenUserModal}
          title={`Logged in as ${currentUser.email} (${currentUser.role})`}
          className="flex items-center gap-1.5 pl-1.5 pr-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200 max-w-[130px] truncate"
        >
          <div className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px] shrink-0">
            {currentUser.name.charAt(0)}
          </div>
          <span className="hidden md:inline font-medium truncate">{currentUser.name.split(' ')[0]}</span>
        </button>

        {/* Logout */}
        <button
          onClick={onLogout}
          title="Log out from current Google email session"
          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
        </button>

        {/* Add Lead Primary Button */}
        <button
          onClick={onOpenNewLeadModal}
          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-xs transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Lead</span>
        </button>
      </div>
    </header>
  );
};
