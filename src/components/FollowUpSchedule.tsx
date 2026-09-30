import React, { useState } from 'react';
import { Lead } from '../types/crm';
import { 
  CalendarClock, 
  MessageSquare, 
  Phone, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  User
} from 'lucide-react';

interface FollowUpScheduleProps {
  leads: Lead[];
  onOpenWhatsApp: (lead: Lead) => void;
  onEditLead: (lead: Lead) => void;
  onReschedule: (leadId: string, newDate: string) => void;
}

export const FollowUpSchedule: React.FC<FollowUpScheduleProps> = ({
  leads,
  onOpenWhatsApp,
  onEditLead,
  onReschedule,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [rescheduleLeadId, setRescheduleLeadId] = useState<string | null>(null);
  const [newDateInput, setNewDateInput] = useState('');

  // Partition leads
  const todayLeads = leads.filter(
    (l) => l.followUpDate === todayStr && l.status !== 'Complete'
  );

  const overdueLeads = leads.filter(
    (l) => l.followUpDate && l.followUpDate < todayStr && l.status !== 'Complete'
  );

  const upcomingLeads = leads
    .filter((l) => l.followUpDate && l.followUpDate > todayStr && l.status !== 'Complete')
    .sort((a, b) => new Date(a.followUpDate).getTime() - new Date(b.followUpDate).getTime());

  const handleSaveReschedule = (leadId: string) => {
    if (newDateInput) {
      onReschedule(leadId, newDateInput);
      setRescheduleLeadId(null);
      setNewDateInput('');
    }
  };

  const renderLeadCard = (lead: Lead, isOverdue = false, isToday = false) => (
    <div
      key={lead.leadId}
      className={`p-4 rounded-xl border transition-all ${
        isToday
          ? 'bg-amber-50/50 border-amber-200 shadow-2xs'
          : isOverdue
          ? 'bg-rose-50/40 border-rose-200 shadow-2xs'
          : 'bg-white border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-slate-800">{lead.leadId}</span>
            <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
              {lead.status}
            </span>
          </div>
          <h4 className="text-sm font-bold text-slate-900 mt-1">{lead.customerName}</h4>
          {lead.projectType && (
            <p className="text-xs text-slate-500 mt-0.5">{lead.projectType}</p>
          )}
          {lead.notes && (
            <p className="text-xs text-slate-600 italic bg-white/60 p-1.5 rounded mt-2 border border-slate-200/50">
              "{lead.notes}"
            </p>
          )}
        </div>

        <div className="flex flex-col sm:items-end gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>Assigned: <strong>{lead.salesPerson}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {/* WhatsApp trigger */}
            <button
              onClick={() => onOpenWhatsApp(lead)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-100/70 hover:bg-emerald-200/70 rounded-md transition-colors cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            {/* Direct call */}
            <a
              href={`tel:${lead.phone}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-700 bg-sky-100/70 hover:bg-sky-200/70 rounded-md transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Call</span>
            </a>

            {/* Reschedule Button */}
            <button
              onClick={() => {
                setRescheduleLeadId(lead.leadId);
                setNewDateInput(lead.followUpDate || todayStr);
              }}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>Reschedule</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reschedule Input dropdown */}
      {rescheduleLeadId === lead.leadId && (
        <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2">
          <span className="text-xs text-slate-600">New Follow-Up Date:</span>
          <input
            type="date"
            value={newDateInput}
            onChange={(e) => setNewDateInput(e.target.value)}
            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
          />
          <button
            onClick={() => handleSaveReschedule(lead.leadId)}
            className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 cursor-pointer"
          >
            Save
          </button>
          <button
            onClick={() => setRescheduleLeadId(null)}
            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Overview header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarClock className="w-5 h-5 text-indigo-600" />
            Follow-Up & Client Engagement Schedule
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time daily reminders for pending conversations, site visits, and proposal follow-ups.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
          <div className="flex items-center gap-1.5 text-amber-700 font-bold">
            <Clock className="w-4 h-4" />
            <span>Today: {todayLeads.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-rose-600 font-bold">
            <AlertTriangle className="w-4 h-4" />
            <span>Overdue: {overdueLeads.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-slate-600">
            <Calendar className="w-4 h-4" />
            <span>Upcoming: {upcomingLeads.length}</span>
          </div>
        </div>
      </div>

      {/* 1. Today's Follow-ups */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-600" />
            Scheduled For Today ({todayStr})
          </h3>
          <span className="text-xs text-slate-500 font-mono tabular-nums">
            {todayLeads.length} Action Items
          </span>
        </div>

        {todayLeads.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
            All caught up! No pending follow-ups scheduled for today.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {todayLeads.map((lead) => renderLeadCard(lead, false, true))}
          </div>
        )}
      </div>

      {/* 2. Overdue Follow-ups */}
      {overdueLeads.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-rose-800 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              Overdue Follow-Ups ({overdueLeads.length})
            </h3>
            <span className="text-xs text-rose-600 font-medium">Requires immediate response</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5">
            {overdueLeads.map((lead) => renderLeadCard(lead, true, false))}
          </div>
        </div>
      )}

      {/* 3. Upcoming Follow-ups */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
          <Calendar className="w-4 h-4 text-slate-500" />
          Upcoming Follow-Ups ({upcomingLeads.length})
        </h3>
        {upcomingLeads.length === 0 ? (
          <div className="p-6 bg-white rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            No upcoming follow-ups scheduled for later this week.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {upcomingLeads.map((lead) => renderLeadCard(lead, false, false))}
          </div>
        )}
      </div>
    </div>
  );
};
