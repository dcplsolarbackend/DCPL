import React, { useState, useEffect } from 'react';
import { Lead, PipelineStage } from '../types/crm';
import { X, Save, Sparkles } from 'lucide-react';

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveLead: (lead: Lead) => void;
  initialLead?: Lead | null;
}

const STAGES: PipelineStage[] = [
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

const SALES_REPS = [
  { name: 'Amit Verma', email: 'amit.verma@dcplsolar.com' },
  { name: 'Sunita Rao', email: 'sunita.rao@dcplsolar.com' },
  { name: 'Deepak Joshi', email: 'deepak.joshi@dcplsolar.com' },
  { name: 'Rajesh Kulkarni', email: 'rajesh.kulkarni@dcplsolar.com' },
];

export const LeadModal: React.FC<LeadModalProps> = ({
  isOpen,
  onClose,
  onSaveLead,
  initialLead,
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>({
    leadId: '',
    leadDate: new Date().toISOString().split('T')[0],
    customerName: '',
    phone: '',
    salesPerson: SALES_REPS[0].name,
    salesEmail: SALES_REPS[0].email,
    status: 'New Leads',
    followUpDate: '',
    duePayment: 0,
    projectType: 'Residential Rooftop 5kW',
    notes: '',
  });

  useEffect(() => {
    if (initialLead) {
      setFormData(initialLead);
    } else {
      const generatedId = `LD-${Math.floor(1000 + Math.random() * 9000)}`;
      setFormData({
        leadId: generatedId,
        leadDate: new Date().toISOString().split('T')[0],
        customerName: '',
        phone: '',
        salesPerson: SALES_REPS[0].name,
        salesEmail: SALES_REPS[0].email,
        status: 'New Leads',
        followUpDate: '',
        duePayment: 0,
        projectType: 'Residential Rooftop 5kW',
        notes: '',
      });
    }
  }, [initialLead, isOpen]);

  if (!isOpen) return null;

  const handleSalesRepChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedName = e.target.value;
    const rep = SALES_REPS.find((r) => r.name === selectedName);
    setFormData((prev) => ({
      ...prev,
      salesPerson: selectedName,
      salesEmail: rep ? rep.email : prev.salesEmail || '',
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customerName || !formData.phone) {
      alert('Please fill in Customer Name and Phone number.');
      return;
    }

    const finalLead: Lead = {
      leadId: formData.leadId || `LD-${Math.floor(1000 + Math.random() * 9000)}`,
      leadDate: formData.leadDate || new Date().toISOString().split('T')[0],
      followUpDate: formData.followUpDate || '',
      nextFollowUp: '',
      convertedDate: '',
      quotationDate: '',
      documentationDate: '',
      registrationDate: '',
      loanDate: '',
      surveyDate: '',
      mDispatchDate: '',
      installationDate: '',
      netMeterDate: '',
      connectionDate: '',
      completeDate: '',
      customerName: formData.customerName,
      phone: formData.phone,
      address: '',
      source: 'Field',
      salesPerson: formData.salesPerson || 'Sales Team',
      salesEmail: formData.salesEmail || '',
      status: (formData.status as PipelineStage) || 'New Leads',
      systemCapacity: formData.projectType || '3.15KW Hybrid',
      dealAmount: Number(formData.duePayment) || 0,
      quotationAmount: Number(formData.duePayment) || 0,
      paymentType: 'Cash',
      paymentReceived: 0,
      duePayment: Number(formData.duePayment) || 0,
      projectType: formData.projectType || 'General Solar Inquiry',
      notes: formData.notes || '',
    };

    onSaveLead(finalLead);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-base font-bold text-slate-900">
              {initialLead ? 'Edit Lead Details' : 'Add New Customer Lead'}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Synced directly with your Google Sheet format (Col A - Col I)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Row 1: Lead ID & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead ID (Col A)
              </label>
              <input
                type="text"
                readOnly
                value={formData.leadId}
                className="w-full px-3 py-2 text-xs font-mono bg-slate-100 border border-slate-200 rounded-lg text-slate-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lead Date (Col B)
              </label>
              <input
                type="date"
                value={formData.leadDate}
                onChange={(e) => setFormData({ ...formData, leadDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 2: Customer Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Customer / Firm Name <span className="text-rose-500">*</span> (Col C)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Patel / ABC Enterprises"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Phone / WhatsApp <span className="text-rose-500">*</span> (Col D)
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 9876543210"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 3: Sales Rep & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sales Representative (Col E)
              </label>
              <select
                value={formData.salesPerson}
                onChange={handleSalesRepChange}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {SALES_REPS.map((rep) => (
                  <option key={rep.name} value={rep.name}>
                    {rep.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Sales Email (Col F)
              </label>
              <input
                type="email"
                required
                value={formData.salesEmail}
                onChange={(e) => setFormData({ ...formData, salesEmail: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 4: Pipeline Status & Follow-Up Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pipeline Status (Col G)
              </label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as PipelineStage })
                }
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                {STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Follow-Up Date (Col H)
              </label>
              <input
                type="date"
                value={formData.followUpDate}
                onChange={(e) => setFormData({ ...formData, followUpDate: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Row 5: Due Payment (₹) & Project Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Due Payment in ₹ (Col I)
              </label>
              <input
                type="number"
                min="0"
                step="500"
                placeholder="0"
                value={formData.duePayment}
                onChange={(e) => setFormData({ ...formData, duePayment: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Project / System Capacity
              </label>
              <input
                type="text"
                placeholder="e.g. Rooftop Solar 10kW On-Grid"
                value={formData.projectType}
                onChange={(e) => setFormData({ ...formData, projectType: e.target.value })}
                className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Discussion Notes / Site Remarks
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Customer requested subsidy quotation and solar net-metering details."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-300 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{initialLead ? 'Update Lead' : 'Save New Lead'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
