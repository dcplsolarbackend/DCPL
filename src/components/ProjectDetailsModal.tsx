import React, { useState, useEffect } from 'react';
import { Lead, PipelineStage, PaymentRecord, User } from '../types/crm';
import { 
  loadColumnPermissions, 
  canViewColumn, 
  canEditColumn,
  ColumnAccessRule 
} from '../utils/permissionStorage';
import { 
  X, 
  Save, 
  IndianRupee, 
  Calendar, 
  FileText, 
  Wrench, 
  ShieldCheck, 
  Upload, 
  CheckCircle2,
  ExternalLink,
  Plus,
  Receipt,
  Lock
} from 'lucide-react';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveLead: (lead: Lead) => void;
  payments: PaymentRecord[];
  onAddPaymentForLead: (leadId: string) => void;
  currentUser: User;
}

const STAGES: PipelineStage[] = [
  'Lead',
  'New Leads',
  'Follow Up',
  'Converted',
  'Quotation',
  'Documentation',
  'Registration',
  'Loan',
  'Survey',
  'Material Dispatch',
  'Installation',
  'Inspection',
  'Net Meter',
  'Connection',
  'Complete',
  'Lost',
];

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveLead,
  payments,
  onAddPaymentForLead,
  currentUser,
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [activeTab, setActiveTab] = useState<'info' | 'technical' | 'dates' | 'files' | 'payments'>('info');
  const [columnRules] = useState<ColumnAccessRule[]>(loadColumnPermissions());

  const isViewable = (colKey: string) => canViewColumn(colKey, currentUser.role, columnRules);
  const isEditable = (colKey: string) => canEditColumn(colKey, currentUser.role, columnRules);

  useEffect(() => {
    if (lead) {
      setFormData(lead);
    } else {
      const newId = Math.floor(10000000 + Math.random() * 90000000).toString(16).substring(0, 8);
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        leadId: newId,
        leadDate: today,
        followUpDate: today,
        customerName: '',
        phone: '',
        address: '',
        source: 'Field',
        salesPerson: currentUser.email,
        status: 'Lead',
        systemCapacity: '3.15KW On-Grid',
        dealAmount: 0,
        quotationAmount: 0,
        paymentType: 'Loan',
        panels: 'Adani 620W DCR Panels',
        inverters: 'UTL GTI 3.3kW',
        structure: 'GI',
        netMeterDone: false,
        subsidyDone: false,
        paymentReceived: 0,
        duePayment: 0,
        notes: '',
      });
    }
  }, [lead, isOpen, currentUser]);

  if (!isOpen) return null;

  const leadPayments = payments.filter((p) => p.leadId === formData.leadId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone) {
      alert('Please fill in Customer Name and Phone Number.');
      return;
    }

    const deal = Number(formData.dealAmount) || 0;
    const received = Number(formData.paymentReceived) || 0;
    const due = Math.max(0, deal - received);

    const updatedLead: Lead = {
      leadId: formData.leadId || Math.floor(10000000 + Math.random() * 90000000).toString(16).substring(0, 8),
      leadDate: formData.leadDate || '',
      followUpDate: formData.followUpDate || '',
      nextFollowUp: formData.nextFollowUp || '',
      convertedDate: formData.convertedDate || '',
      quotationDate: formData.quotationDate || '',
      documentationDate: formData.documentationDate || '',
      registrationDate: formData.registrationDate || '',
      loanDate: formData.loanDate || '',
      surveyDate: formData.surveyDate || '',
      mDispatchDate: formData.mDispatchDate || '',
      installationDate: formData.installationDate || '',
      netMeterDate: formData.netMeterDate || '',
      connectionDate: formData.connectionDate || '',
      completeDate: formData.completeDate || '',
      customerName: formData.customerName,
      phone: formData.phone,
      address: formData.address || '',
      source: formData.source || 'Field',
      salesPerson: formData.salesPerson || currentUser.email,
      salesEmail: formData.salesPerson?.includes('@') ? formData.salesPerson : currentUser.email,
      status: (formData.status as PipelineStage) || 'Lead',
      systemCapacity: formData.systemCapacity || '',
      dealAmount: deal,
      quotationAmount: Number(formData.quotationAmount) || deal,
      paymentType: formData.paymentType || 'Cash',
      priceApproval: formData.priceApproval || '',
      quotationFileApproved: formData.quotationFileApproved || '',
      projectSheetApproved: formData.projectSheetApproved || '',
      documentImage: formData.documentImage || '',
      otherDocImage: formData.otherDocImage || '',
      panels: formData.panels || '',
      inverters: formData.inverters || '',
      battery: formData.battery || '',
      wiring: formData.wiring || '',
      structure: formData.structure || 'GI',
      netMeterDone: !!formData.netMeterDone,
      subsidyDone: !!formData.subsidyDone,
      paymentReceived: received,
      duePayment: due,
      notes: formData.notes || '',
      quotationFile: formData.quotationFile || '',
      lastModifiedBy: currentUser.email,
      lastModifiedTime: new Date().toLocaleString(),
      firstPaymentMonth: formData.firstPaymentMonth || '',
      projectType: formData.systemCapacity || 'Solar Power Project',
    };

    onSaveLead(updatedLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {formData.leadId || 'New Project'}
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {lead ? formData.customerName : 'New Solar Project Record'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mapped to Main Project Sheet 44 columns · Auto updates Google Sheet & Drive files
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 text-xs font-medium gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Customer & Sales Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('technical')}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'technical'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            System Specs & Equipment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dates')}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'dates'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Milestone Dates (15 Stages)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'files'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Google Drive & PDF Files
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-2 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Payment History</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {leadPayments.length}
            </span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* TAB 1: Customer & Sales Info */}
          {activeTab === 'info' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LeadID (Col 1)</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.leadId}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Date (Col 2)</label>
                  <input
                    type="text"
                    value={formData.leadDate}
                    onChange={(e) => setFormData({ ...formData, leadDate: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Status (Col 21)</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as PipelineStage })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold text-indigo-700"
                  >
                    {STAGES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Customer Name * (Col 16)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mr. Ram Kishore"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone No * (Col 17)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 7055294686"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Site Address (Col 18)</label>
                <input
                  type="text"
                  placeholder="e.g. H.No 1290, Sector-3 Shastri Nagar, Meerut"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Source (Col 19)</label>
                  <input
                    type="text"
                    placeholder="Field, on call, JD enquiry, Video, etc."
                    value={formData.source}
                    onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Sales Person (Col 20)</label>
                  <input
                    type="text"
                    placeholder="e.g. gurupreetraj12@gmail.com"
                    value={formData.salesPerson}
                    onChange={(e) => setFormData({ ...formData, salesPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deal Amount (₹) (Col 23)</label>
                  <input
                    type="number"
                    value={formData.dealAmount}
                    onChange={(e) => {
                      const deal = parseFloat(e.target.value) || 0;
                      const rec = formData.paymentReceived || 0;
                      setFormData({ ...formData, dealAmount: deal, duePayment: Math.max(0, deal - rec) });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Received (₹) (Col 38)</label>
                  <input
                    type="number"
                    value={formData.paymentReceived}
                    onChange={(e) => {
                      const rec = parseFloat(e.target.value) || 0;
                      const deal = formData.dealAmount || 0;
                      setFormData({ ...formData, paymentReceived: rec, duePayment: Math.max(0, deal - rec) });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Amount (₹) (Col 39)</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.duePayment}
                    className="w-full px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remark / Site Notes (Col 40)</label>
                <textarea
                  rows={2}
                  placeholder="Notes, discussion history, bank sanction remarks..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* TAB 2: System Specs & Equipment */}
          {activeTab === 'technical' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">System Capacity (Col 22)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.15KW Hybrid / 5KW On Grid"
                    value={formData.systemCapacity}
                    onChange={(e) => setFormData({ ...formData, systemCapacity: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quotation Amount (₹) (Col 24)</label>
                  <input
                    type="number"
                    value={formData.quotationAmount}
                    onChange={(e) => setFormData({ ...formData, quotationAmount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method Type (Col 25)</label>
                  <select
                    value={formData.paymentType}
                    onChange={(e) => setFormData({ ...formData, paymentType: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Loan">Bank Loan</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="RTGS/NEFT">RTGS/NEFT</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Panels Modules (Col 31)</label>
                <input
                  type="text"
                  placeholder="e.g. Adani 615w*5nos DCR Panels, Adani 605w*1nos NDCR panels"
                  value={formData.panels}
                  onChange={(e) => setFormData({ ...formData, panels: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Inverters (Col 32)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.3kw UTL Hybrid Sigma / 4kw UTL GTI"
                    value={formData.inverters}
                    onChange={(e) => setFormData({ ...formData, inverters: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Battery (Col 33)</label>
                  <input
                    type="text"
                    placeholder="e.g. UTL 100Ah/51.2V Lithium / NA"
                    value={formData.battery}
                    onChange={(e) => setFormData({ ...formData, battery: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wiring (Col 34)</label>
                  <input
                    type="text"
                    placeholder="e.g. 170 mtr / 200Mtr"
                    value={formData.wiring}
                    onChange={(e) => setFormData({ ...formData, wiring: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Structure Type (Col 35)</label>
                  <input
                    type="text"
                    placeholder="e.g. GI Structure / Hot-Dip / Elevated / Pre-GI"
                    value={formData.structure}
                    onChange={(e) => setFormData({ ...formData, structure: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!formData.netMeterDone}
                    onChange={(e) => setFormData({ ...formData, netMeterDone: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Net Meter Installed (Col 36)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!formData.subsidyDone}
                    onChange={(e) => setFormData({ ...formData, subsidyDone: e.target.checked })}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Subsidy Approved / Claimed (Col 37)</span>
                </label>
              </div>
            </div>
          )}

          {/* TAB 3: Milestone Tracking Dates */}
          {activeTab === 'dates' && (
            <div className="space-y-3">
              <p className="text-[11px] text-slate-500">
                Record exact dates when each project stage was executed in the field (Cols 2–15 & Col 44).
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Follow Up Date (Col 3)</label>
                  <input
                    type="text"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Follow Up (Col 4)</label>
                  <input
                    type="text"
                    value={formData.nextFollowUp}
                    onChange={(e) => setFormData({ ...formData, nextFollowUp: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Converted Date (Col 5)</label>
                  <input
                    type="text"
                    value={formData.convertedDate}
                    onChange={(e) => setFormData({ ...formData, convertedDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quotation Date (Col 6)</label>
                  <input
                    type="text"
                    value={formData.quotationDate}
                    onChange={(e) => setFormData({ ...formData, quotationDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Documentation (Col 7)</label>
                  <input
                    type="text"
                    value={formData.documentationDate}
                    onChange={(e) => setFormData({ ...formData, documentationDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Registration (Col 8)</label>
                  <input
                    type="text"
                    value={formData.registrationDate}
                    onChange={(e) => setFormData({ ...formData, registrationDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loan Date (Col 9)</label>
                  <input
                    type="text"
                    value={formData.loanDate}
                    onChange={(e) => setFormData({ ...formData, loanDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Survey Date (Col 10)</label>
                  <input
                    type="text"
                    value={formData.surveyDate}
                    onChange={(e) => setFormData({ ...formData, surveyDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">M Dispatch (Col 11)</label>
                  <input
                    type="text"
                    value={formData.mDispatchDate}
                    onChange={(e) => setFormData({ ...formData, mDispatchDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Installation (Col 12)</label>
                  <input
                    type="text"
                    value={formData.installationDate}
                    onChange={(e) => setFormData({ ...formData, installationDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Net Meter Date (Col 13)</label>
                  <input
                    type="text"
                    value={formData.netMeterDate}
                    onChange={(e) => setFormData({ ...formData, netMeterDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Connection Date (Col 14)</label>
                  <input
                    type="text"
                    value={formData.connectionDate}
                    onChange={(e) => setFormData({ ...formData, connectionDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Complete Date (Col 15)</label>
                  <input
                    type="text"
                    value={formData.completeDate}
                    onChange={(e) => setFormData({ ...formData, completeDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">First Payment Month (Col 44)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2/5/2026"
                    value={formData.firstPaymentMonth}
                    onChange={(e) => setFormData({ ...formData, firstPaymentMonth: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Google Drive & PDF Files */}
          {activeTab === 'files' && (
            <div className="space-y-3.5">
              <p className="text-[11px] text-slate-500">
                Documents & Google Drive PDF files stored in Google Sheet (Cols 26-30 & Col 41).
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quotation PDF File (Col 41)</label>
                <input
                  type="text"
                  placeholder="e.g. Quotation PDF/Quo_Mr. Ram Kishore_97e43cff.pdf"
                  value={formData.quotationFile}
                  onChange={(e) => setFormData({ ...formData, quotationFile: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Sheet Approved PDF (Col 28)</label>
                <input
                  type="text"
                  placeholder="e.g. Main Project Sheet_Files_/97e43cff.Project Sheet Approved.pdf"
                  value={formData.projectSheetApproved}
                  onChange={(e) => setFormData({ ...formData, projectSheetApproved: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Approval Image (Col 26)</label>
                  <input
                    type="text"
                    placeholder="Image URL or Drive link"
                    value={formData.priceApproval}
                    onChange={(e) => setFormData({ ...formData, priceApproval: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Image (Col 29)</label>
                  <input
                    type="text"
                    placeholder="Adhar/Electricity bill image link"
                    value={formData.documentImage}
                    onChange={(e) => setFormData({ ...formData, documentImage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Payment History */}
          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">Payment History for Lead {formData.leadId}</h4>
                  <p className="text-[11px] text-slate-500">
                    Total Deal: ₹{formData.dealAmount?.toLocaleString('en-IN') || 0} | Paid: ₹{formData.paymentReceived?.toLocaleString('en-IN') || 0} | Due: ₹{formData.duePayment?.toLocaleString('en-IN') || 0}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onAddPaymentForLead(formData.leadId!)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Record Payment</span>
                </button>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[11px] font-semibold text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3 text-right">Amount (₹)</th>
                      <th className="py-2.5 px-3">Transaction ID</th>
                      <th className="py-2.5 px-3">Remark</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-[11px]">
                    {leadPayments.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-6 text-center text-slate-400">
                          No payments recorded yet for this project.
                        </td>
                      </tr>
                    ) : (
                      leadPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 font-mono">{p.paymentDate}</td>
                          <td className="py-2 px-3 font-medium">{p.paymentType}</td>
                          <td className="py-2 px-3 text-right font-mono font-bold text-emerald-700">
                            ₹{p.amount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-2 px-3 font-mono text-slate-500">{p.transactionId}</td>
                          <td className="py-2 px-3 text-slate-600">{p.remark || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Footer Action */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
            <div className="text-[11px] text-slate-400">
              {formData.lastModifiedTime ? `Last modified: ${formData.lastModifiedTime}` : ''}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg shadow-sm cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Save Project Record</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
