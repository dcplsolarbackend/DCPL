import React from 'react';
import { Lead } from '../types/crm';
import { Users, PhoneCall, FileText, IndianRupee, CheckCircle2 } from 'lucide-react';

interface StatsCardsProps {
  leads: Lead[];
  onSelectFilter?: (status: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ leads, onSelectFilter }) => {
  const todayStr = new Date().toISOString().split('T')[0];

  const totalLeads = leads.length;
  const todayFollowUps = leads.filter((l) => l.followUpDate === todayStr && l.status !== 'Complete').length;
  const totalFollowUps = leads.filter((l) => l.status === 'Follow Up').length;
  const inQuotation = leads.filter((l) => l.status === 'Quotation').length;
  const completedLeads = leads.filter((l) => l.status === 'Complete').length;
  
  const totalDues = leads.reduce((acc, curr) => acc + (curr.duePayment || 0), 0);
  const duesCount = leads.filter((l) => (l.duePayment || 0) > 0).length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
      <div 
        onClick={() => onSelectFilter && onSelectFilter('All')}
        className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium text-slate-600">Total Leads</span>
          <Users className="w-4 h-4 text-slate-400" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">{totalLeads}</div>
        <div className="text-xs text-slate-500 mt-1">Across all pipeline stages</div>
      </div>

      <div 
        onClick={() => onSelectFilter && onSelectFilter('Follow Up')}
        className="bg-white p-4 rounded-xl border border-amber-200/80 hover:border-amber-300 transition-all cursor-pointer shadow-xs"
      >
        <div className="flex items-center justify-between text-amber-700 mb-1">
          <span className="text-xs font-medium">Follow-Ups</span>
          <PhoneCall className="w-4 h-4 text-amber-500" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-amber-900">
          {totalFollowUps}
        </div>
        <div className="text-xs text-amber-700 font-medium mt-1">
          {todayFollowUps} scheduled today
        </div>
      </div>

      <div 
        onClick={() => onSelectFilter && onSelectFilter('Quotation')}
        className="bg-white p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-all cursor-pointer shadow-xs"
      >
        <div className="flex items-center justify-between text-slate-500 mb-1">
          <span className="text-xs font-medium text-slate-600">Quotations</span>
          <FileText className="w-4 h-4 text-indigo-500" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-slate-900">{inQuotation}</div>
        <div className="text-xs text-slate-500 mt-1">Proposals under review</div>
      </div>

      <div 
        onClick={() => onSelectFilter && onSelectFilter('due_only')}
        className="bg-white p-4 rounded-xl border border-rose-200/80 hover:border-rose-300 transition-all cursor-pointer shadow-xs"
      >
        <div className="flex items-center justify-between text-rose-700 mb-1">
          <span className="text-xs font-medium">Due Payments</span>
          <IndianRupee className="w-4 h-4 text-rose-500" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-rose-900">
          ₹{(totalDues / 1000).toFixed(0)}k
        </div>
        <div className="text-xs text-rose-700 font-medium mt-1">
          {duesCount} pending collection
        </div>
      </div>

      <div 
        onClick={() => onSelectFilter && onSelectFilter('Complete')}
        className="bg-white p-4 rounded-xl border border-emerald-200/80 hover:border-emerald-300 transition-all cursor-pointer shadow-xs col-span-2 md:col-span-1"
      >
        <div className="flex items-center justify-between text-emerald-700 mb-1">
          <span className="text-xs font-medium">Completed</span>
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
        </div>
        <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900">{completedLeads}</div>
        <div className="text-xs text-emerald-700 font-medium mt-1">Installed & commissioned</div>
      </div>
    </div>
  );
};
