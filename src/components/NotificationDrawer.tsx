import React from 'react';
import { InAppNotification } from '../types/crm';
import { Bell, Check, Trash2, X, ExternalLink } from 'lucide-react';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: InAppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onClearAll: () => void;
  onSelectLead?: (leadId: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onClearAll,
  onSelectLead,
}) => {
  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="absolute right-6 top-16 z-50 w-84 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-indigo-600" />
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            In-App Notifications
          </h3>
          {unreadCount > 0 && (
            <span className="text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 font-bold">
              {unreadCount} new
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              title="Mark all as read"
              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={onClearAll}
            title="Clear all"
            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer ml-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Bell className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
            <p className="font-medium text-slate-600">No notifications</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              You are all caught up with CRM updates.
            </p>
          </div>
        ) : (
          notifications.map((n) => (
            <div
              key={n.id}
              onClick={() => {
                onMarkAsRead(n.id);
                if (n.targetLeadId && onSelectLead) {
                  onSelectLead(n.targetLeadId);
                  onClose();
                }
              }}
              className={`p-3.5 transition-colors cursor-pointer flex items-start justify-between gap-3 ${
                n.read ? 'hover:bg-slate-50' : 'bg-indigo-50/40 hover:bg-indigo-50/70'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-1.5">
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />}
                  <span className="font-semibold text-slate-900">{n.title}</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{n.message}</p>
                <div className="flex items-center gap-2 pt-0.5 text-[10px] text-slate-400 font-mono">
                  <span>{new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  {n.targetLeadId && (
                    <span className="text-indigo-600 font-medium flex items-center gap-0.5">
                      <span>View {n.targetLeadId}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-2 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-400">
        Notifications update live when team members edit leads or sync sheets.
      </div>
    </div>
  );
};
