import React, { useState } from 'react';
import { Lead } from '../types/crm';
import { 
  IndianRupee, 
  MessageSquare, 
  Phone, 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';

interface PaymentsTrackerProps {
  leads: Lead[];
  onOpenWhatsApp: (lead: Lead) => void;
  onUpdatePayment: (leadId: string, newAmount: number) => void;
}

export const PaymentsTracker: React.FC<PaymentsTrackerProps> = ({
  leads,
  onOpenWhatsApp,
  onUpdatePayment,
}) => {
  const [editingLeadId, setEditingLeadId] = useState<string | null>(null);
  const [payAmountInput, setPayAmountInput] = useState<string>('');

  const leadsWithDues = leads
    .filter((l) => (l.duePayment || 0) > 0)
    .sort((a, b) => (b.duePayment || 0) - (a.duePayment || 0));

  const totalOutstanding = leadsWithDues.reduce((acc, l) => acc + (l.duePayment || 0), 0);
  const highValueDues = leadsWithDues.filter((l) => (l.duePayment || 0) >= 100000);

  const handleClearPayment = (lead: Lead) => {
    if (window.confirm(`Mark all ₹${lead.duePayment.toLocaleString('en-IN')} as fully paid for ${lead.customerName}?`)) {
      onUpdatePayment(lead.leadId, 0);
    }
  };

  const handleSavePartial = (leadId: string) => {
    const val = parseFloat(payAmountInput);
    if (!isNaN(val) && val >= 0) {
      onUpdatePayment(leadId, val);
      setEditingLeadId(null);
      setPayAmountInput('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-rose-200/80 shadow-xs">
          <div className="flex items-center justify-between text-rose-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Outstanding Dues</span>
            <IndianRupee className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-900 mt-1">
            ₹{totalOutstanding.toLocaleString('en-IN')}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Across {leadsWithDues.length} pending client invoices
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">High Value Dues (≥ ₹1L)</span>
            <ArrowUpRight className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {highValueDues.length} Accounts
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Totaling ₹{highValueDues.reduce((acc, l) => acc + (l.duePayment || 0), 0).toLocaleString('en-IN')}
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-600 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Due Per Account</span>
            <TrendingDown className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            ₹{leadsWithDues.length > 0 ? Math.round(totalOutstanding / leadsWithDues.length).toLocaleString('en-IN') : 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tracked in Google Sheet Col I
          </p>
        </div>
      </div>

      {/* Dues Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Receivables Ledger & Collection Management
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Send WhatsApp payment reminders with auto-filled amounts and record payments.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">Lead ID</th>
                <th className="py-3 px-4">Customer & Project</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4 text-right">Outstanding (₹)</th>
                <th className="py-3 px-4 text-center">Quick Collection Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {leadsWithDues.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-slate-700">All Accounts Cleared!</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      There are currently zero pending payment dues.
                    </p>
                  </td>
                </tr>
              ) : (
                leadsWithDues.map((lead) => (
                  <tr key={lead.leadId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-medium text-slate-900 whitespace-nowrap">
                      {lead.leadId}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{lead.customerName}</div>
                      <div className="text-[11px] text-slate-500">{lead.projectType || 'Solar Project'}</div>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {lead.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap text-slate-700">
                      <div>{lead.salesPerson}</div>
                      <div className="text-[11px] text-slate-400">{lead.salesEmail}</div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                      <div className="text-base font-bold text-rose-600">
                        ₹{lead.duePayment.toLocaleString('en-IN')}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1-Click WhatsApp Payment Reminder */}
                        <button
                          onClick={() => onOpenWhatsApp(lead)}
                          title="Send WhatsApp Payment Reminder"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-3.5 h-3.5" />
                          <span>WhatsApp Reminder</span>
                        </button>

                        {/* Call */}
                        <a
                          href={`tel:${lead.phone}`}
                          title="Call Customer"
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors inline-block"
                        >
                          <Phone className="w-3.5 h-3.5" />
                        </a>

                        {/* Adjust / Record */}
                        <button
                          onClick={() => {
                            setEditingLeadId(lead.leadId);
                            setPayAmountInput(String(lead.duePayment));
                          }}
                          title="Adjust Due Amount"
                          className="px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer border border-slate-200"
                        >
                          Edit Due
                        </button>

                        {/* Mark Paid (₹0) */}
                        <button
                          onClick={() => handleClearPayment(lead)}
                          title="Mark Entire Due as Paid (Clear to ₹0)"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-100/80 hover:bg-emerald-200 rounded-md transition-colors cursor-pointer"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Clear Due</span>
                        </button>
                      </div>

                      {/* Inline Edit Form */}
                      {editingLeadId === lead.leadId && (
                        <div className="mt-2 p-2 bg-slate-100 rounded-lg flex items-center justify-end gap-2">
                          <span className="text-xs text-slate-600">New Due Amount (₹):</span>
                          <input
                            type="number"
                            value={payAmountInput}
                            onChange={(e) => setPayAmountInput(e.target.value)}
                            className="w-28 px-2 py-1 text-xs border border-slate-300 rounded bg-white font-mono"
                          />
                          <button
                            onClick={() => handleSavePartial(lead.leadId)}
                            className="px-2.5 py-1 text-xs bg-indigo-600 text-white font-medium rounded hover:bg-indigo-700 cursor-pointer"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => setEditingLeadId(null)}
                            className="px-2 py-1 text-xs text-slate-500 hover:text-slate-700 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
