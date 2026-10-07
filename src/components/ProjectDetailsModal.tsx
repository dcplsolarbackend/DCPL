import React, { useState, useEffect, useMemo } from 'react';
import { Lead, PipelineStage, PaymentRecord, User } from '../types/crm';
import { getQuotationPdfInfo } from '../utils/storage';
import { 
  loadColumnPermissions, 
  canViewColumn, 
  canEditColumn,
  ColumnAccessRule 
} from '../utils/permissionStorage';
import { 
  FIELD_DEFINITIONS,
  loadStageMandatoryRules,
  saveStageMandatoryRules,
  DEFAULT_STAGE_MANDATORY_RULES,
  validateLeadForStage 
} from '../utils/pipelinePermissions';
import { ALL_STAGES } from '../constants/stages';
import { 
  X, 
  Save, 
  FileText, 
  ExternalLink,
  Plus,
  FolderGit2,
  Sliders,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Sparkles,
  Layers
} from 'lucide-react';

interface ProjectDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: Lead | null;
  onSaveLead: (lead: Lead) => void;
  payments: PaymentRecord[];
  onAddPaymentForLead: (leadId: string) => void;
  currentUser: User;
  users?: User[];
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

export const ProjectDetailsModal: React.FC<ProjectDetailsModalProps> = ({
  isOpen,
  onClose,
  lead,
  onSaveLead,
  payments,
  onAddPaymentForLead,
  currentUser,
  users = [],
}) => {
  const [formData, setFormData] = useState<Partial<Lead>>({});
  const [activeTab, setActiveTab] = useState<'stage' | 'info' | 'technical' | 'dates' | 'files' | 'payments'>('stage');
  const [columnRules] = useState<ColumnAccessRule[]>(loadColumnPermissions());
  const [stageMandatoryRules, setStageMandatoryRules] = useState<Record<PipelineStage, string[]>>(() => loadStageMandatoryRules());
  const [isCustomizingStage, setIsCustomizingStage] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [missingFieldKeys, setMissingFieldKeys] = useState<string[]>([]);

  const isViewable = (colKey: string) => canViewColumn(colKey, currentUser.role, columnRules);
  const isEditable = (colKey: string) => canEditColumn(colKey, currentUser.role, columnRules);

  // Sync stage rules whenever modal opens or rules change
  useEffect(() => {
    const refreshRules = () => {
      setStageMandatoryRules(loadStageMandatoryRules());
    };
    refreshRules();
    window.addEventListener('crm_stage_rules_updated', refreshRules);
    return () => window.removeEventListener('crm_stage_rules_updated', refreshRules);
  }, [isOpen]);

  useEffect(() => {
    setValidationError(null);
    setMissingFieldKeys([]);
    setIsCustomizingStage(false);
    setActiveTab('stage');

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
        salesPerson: currentUser.name,
        salesEmail: currentUser.email,
        assignedTo: currentUser.id,
        driveFolderUrl: '',
        status: 'New Leads',
        systemCapacity: '',
        dealAmount: 0,
        quotationAmount: 0,
        paymentType: 'Loan',
        panels: '',
        inverters: '',
        structure: 'GI',
        netMeterDone: false,
        subsidyDone: false,
        paymentReceived: 0,
        duePayment: 0,
        notes: '',
      });
    }
  }, [lead, isOpen, currentUser]);

  const currentStage: PipelineStage = (formData.status as PipelineStage) || 'New Leads';

  // Active mandatory fields for the currently selected stage
  const currentStageFieldKeys = useMemo(() => {
    return stageMandatoryRules[currentStage] || DEFAULT_STAGE_MANDATORY_RULES[currentStage] || ['salesPerson', 'phone', 'source'];
  }, [stageMandatoryRules, currentStage]);

  const currentStageFieldDefs = useMemo(() => {
    // Keep the order in currentStageFieldKeys or FIELD_DEFINITIONS
    return FIELD_DEFINITIONS.filter((def) => currentStageFieldKeys.includes(def.key));
  }, [currentStageFieldKeys]);

  if (!isOpen) return null;

  const leadPayments = payments.filter((p) => p.leadId === formData.leadId);

  const handleToggleStageField = (fieldKey: string) => {
    const currentList = stageMandatoryRules[currentStage] || [];
    const exists = currentList.includes(fieldKey);
    const updatedList = exists
      ? currentList.filter((k) => k !== fieldKey)
      : [...currentList, fieldKey];

    const updatedRules: Record<PipelineStage, string[]> = {
      ...stageMandatoryRules,
      [currentStage]: updatedList,
    };
    if (currentStage === 'New Leads') {
      updatedRules['Lead'] = updatedList;
    }
    setStageMandatoryRules(updatedRules);
    saveStageMandatoryRules(updatedRules);
    setValidationError(null);
    setMissingFieldKeys([]);
  };

  const handleResetCurrentStageRules = () => {
    const defaultList = DEFAULT_STAGE_MANDATORY_RULES[currentStage] || ['salesPerson', 'phone', 'source'];
    const updatedRules: Record<PipelineStage, string[]> = {
      ...stageMandatoryRules,
      [currentStage]: [...defaultList],
    };
    setStageMandatoryRules(updatedRules);
    saveStageMandatoryRules(updatedRules);
  };

  const updateFieldValue = (key: string, val: any) => {
    setValidationError(null);
    if (missingFieldKeys.includes(key)) {
      setMissingFieldKeys((prev) => prev.filter((k) => k !== key));
    }

    if (key === 'salesPerson') {
      const matched = (users || []).find((u) => u.name === val);
      setFormData((prev) => ({
        ...prev,
        salesPerson: val,
        salesEmail: matched ? matched.email : val.includes('@') ? val : prev.salesEmail,
        assignedTo: matched ? matched.id : prev.assignedTo,
      }));
      return;
    }

    if (key === 'dealAmount') {
      const deal = parseFloat(val) || 0;
      const rec = Number(formData.paymentReceived) || 0;
      setFormData((prev) => ({
        ...prev,
        dealAmount: deal,
        duePayment: Math.max(0, deal - rec),
      }));
      return;
    }

    if (key === 'paymentReceived') {
      const rec = parseFloat(val) || 0;
      const deal = Number(formData.dealAmount) || 0;
      setFormData((prev) => ({
        ...prev,
        paymentReceived: rec,
        duePayment: Math.max(0, deal - rec),
      }));
      return;
    }

    if (key === 'quotationAmount') {
      setFormData((prev) => ({
        ...prev,
        quotationAmount: parseFloat(val) || 0,
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [key]: val,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setMissingFieldKeys([]);

    const deal = Number(formData.dealAmount) || 0;
    const received = Number(formData.paymentReceived) || 0;
    const due = Math.max(0, deal - received);

    // Resolve Sales Person name & backend email
    const salesPersonName = formData.salesPerson || currentUser.name;
    const matchedUser = (users || []).find((u) => u.name === salesPersonName);
    const resolvedEmail = matchedUser ? matchedUser.email : (formData.salesEmail || currentUser.email);
    const resolvedAssignedTo = matchedUser ? matchedUser.id : (formData.assignedTo || currentUser.id);

    const updatedLead: Lead = {
      leadId: formData.leadId || Math.floor(10000000 + Math.random() * 90000000).toString(16).substring(0, 8),
      leadDate: formData.leadDate || new Date().toISOString().split('T')[0],
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
      customerName: (formData.customerName || '').trim(),
      phone: (formData.phone || '').trim(),
      address: formData.address || '',
      source: formData.source || '',
      salesPerson: salesPersonName,
      salesEmail: resolvedEmail,
      assignedTo: resolvedAssignedTo,
      driveFolderUrl: formData.driveFolderUrl || '',
      status: (formData.status as PipelineStage) || 'New Leads',
      systemCapacity: formData.systemCapacity || '',
      dealAmount: deal,
      quotationAmount: Number(formData.quotationAmount) || 0,
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

    // Dynamic Stage-wise mandatory fields validation (NO hardcoded customerName requirement)
    const validation = validateLeadForStage(updatedLead, updatedLead.status);
    if (!validation.isValid) {
      setValidationError(validation.errorMessage || 'Please fill all required fields for this stage.');
      setMissingFieldKeys(validation.missingKeys);
      setActiveTab('stage');
      return;
    }

    onSaveLead(updatedLead);
    onClose();
  };

  // Dynamic input renderer for any field key
  const renderDynamicStageField = (fieldKey: string) => {
    const def = FIELD_DEFINITIONS.find((f) => f.key === fieldKey);
    const label = def ? def.label : fieldKey;
    const isMissing = missingFieldKeys.includes(fieldKey);
    const val = (formData as any)[fieldKey] ?? '';

    if (fieldKey === 'salesPerson') {
      return (
        <div key={fieldKey} className="space-y-1">
          <label className="block font-semibold text-slate-800 text-xs flex items-center justify-between">
            <span>
              {label} <span className="text-rose-600 font-bold">*</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              Mandatory for {currentStage}
            </span>
          </label>
          <select
            value={formData.salesPerson || ''}
            onChange={(e) => updateFieldValue('salesPerson', e.target.value)}
            className={`w-full px-3 py-2.5 border rounded-xl text-xs font-semibold text-slate-900 bg-white focus:outline-none focus:ring-2 ${
              isMissing
                ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
            }`}
          >
            <option value="">-- Select Sales Person --</option>
            {(users || []).map((u) => (
              <option key={u.id} value={u.name}>
                {u.name} ({u.role})
              </option>
            ))}
          </select>
          {formData.salesEmail && (
            <span className="text-[10px] text-slate-400 font-mono block">
              Linked Account: {formData.salesEmail}
            </span>
          )}
        </div>
      );
    }

    if (fieldKey === 'source') {
      const commonSources = ['Field', 'On Call', 'JD Enquiry', 'Referral', 'Social Media', 'Website', 'Camp / Exhibition'];
      return (
        <div key={fieldKey} className="space-y-1">
          <label className="block font-semibold text-slate-800 text-xs flex items-center justify-between">
            <span>
              {label} <span className="text-rose-600 font-bold">*</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              Mandatory for {currentStage}
            </span>
          </label>
          <div className="flex gap-2">
            <select
              value={commonSources.includes(val) ? val : '__custom__'}
              onChange={(e) => {
                if (e.target.value !== '__custom__') {
                  updateFieldValue('source', e.target.value);
                }
              }}
              className="w-1/2 px-3 py-2.5 border border-slate-300 rounded-xl text-xs bg-white font-medium text-slate-800"
            >
              {commonSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__custom__">Other / Custom...</option>
            </select>
            <input
              type="text"
              placeholder={def?.placeholder || 'Enter source...'}
              value={val}
              onChange={(e) => updateFieldValue('source', e.target.value)}
              className={`w-1/2 px-3 py-2.5 border rounded-xl text-xs bg-white ${
                isMissing
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
                  : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
              }`}
            />
          </div>
        </div>
      );
    }

    if (fieldKey === 'paymentType') {
      return (
        <div key={fieldKey} className="space-y-1">
          <label className="block font-semibold text-slate-800 text-xs flex items-center justify-between">
            <span>
              {label} <span className="text-rose-600 font-bold">*</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              Mandatory
            </span>
          </label>
          <select
            value={val || 'Loan'}
            onChange={(e) => updateFieldValue('paymentType', e.target.value)}
            className="w-full px-3 py-2.5 border border-slate-300 rounded-xl bg-white text-xs font-medium"
          >
            <option value="Loan">Bank Loan</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="RTGS/NEFT">RTGS/NEFT</option>
          </select>
        </div>
      );
    }

    if (fieldKey === 'quotationFile') {
      const pdfInfo = getQuotationPdfInfo(formData);
      return (
        <div key={fieldKey} className="space-y-1 p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
          <div className="flex items-center justify-between gap-2">
            <label className="font-semibold text-rose-950 text-xs flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-rose-600 shrink-0" />
              <span>
                {label} <span className="text-rose-600 font-bold">*</span>
              </span>
            </label>
            {pdfInfo && (
              <a
                href={pdfInfo.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs shrink-0"
              >
                <FileText className="w-3 h-3" />
                <span>View PDF</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          <input
            type="text"
            placeholder={def?.placeholder || 'Paste Quotation PDF link or Google Drive path...'}
            value={val}
            onChange={(e) => updateFieldValue('quotationFile', e.target.value)}
            className={`w-full px-3 py-2 bg-white border rounded-lg font-mono text-xs ${
              isMissing ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-300'
            }`}
          />
        </div>
      );
    }

    if (def?.inputType === 'textarea') {
      return (
        <div key={fieldKey} className="space-y-1 sm:col-span-2">
          <label className="block font-semibold text-slate-800 text-xs flex items-center justify-between">
            <span>
              {label} <span className="text-rose-600 font-bold">*</span>
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
              Mandatory for {currentStage}
            </span>
          </label>
          <textarea
            rows={2}
            placeholder={def?.placeholder || ''}
            value={val}
            onChange={(e) => updateFieldValue(fieldKey, e.target.value)}
            className={`w-full px-3 py-2 border rounded-xl text-xs bg-white ${
              isMissing ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30' : 'border-slate-300'
            }`}
          />
        </div>
      );
    }

    const isDateField = fieldKey.toLowerCase().includes('date');

    return (
      <div key={fieldKey} className="space-y-1">
        <label className="block font-semibold text-slate-800 text-xs flex items-center justify-between">
          <span>
            {label} <span className="text-rose-600 font-bold">*</span>
          </span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
            Mandatory
          </span>
        </label>
        <input
          type={def?.inputType === 'number' ? 'number' : isDateField ? 'date' : 'text'}
          placeholder={def?.placeholder || `Enter ${label}`}
          value={val}
          onChange={(e) => updateFieldValue(fieldKey, e.target.value)}
          className={`w-full px-3 py-2.5 border rounded-xl text-xs bg-white focus:outline-none focus:ring-2 ${
            isMissing
              ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/30'
              : 'border-slate-300 focus:ring-indigo-500/20 focus:border-indigo-500'
          }`}
        />
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
                {formData.leadId || 'New Project'}
              </span>
              <h3 className="text-base font-bold text-slate-900">
                {formData.customerName
                  ? formData.customerName
                  : formData.phone
                  ? `Lead (${formData.phone})`
                  : 'New Solar Project Record'}
              </h3>
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
                Stage: {currentStage}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Stage-wise customized form · Only fields marked mandatory for <strong>{currentStage}</strong> are required
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
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50 text-xs font-medium gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('stage')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'stage'
                ? 'border-indigo-600 text-indigo-600 font-bold bg-indigo-50/50'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Stage Columns ({currentStage})</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-indigo-100 text-indigo-800">
              {currentStageFieldDefs.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'info'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            All Basic Info
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('technical')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'technical'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            System Specs
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('dates')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'dates'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Milestone Dates (15)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('files')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'files'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            Drive & Quotation PDF
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('payments')}
            className={`py-2.5 px-3 border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1 ${
              activeTab === 'payments'
                ? 'border-indigo-600 text-indigo-600 font-semibold'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Payments</span>
            <span className="font-mono text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700">
              {leadPayments.length}
            </span>
          </button>
        </div>

        {/* Validation Error Alert Banner */}
        {validationError && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-300 rounded-xl flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold block">Mandatory Stage Columns Missing:</strong>
              <span>{validationError}</span>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {/* TAB 0: DYNAMIC STAGE-WISE COLUMNS (Default View) */}
          {activeTab === 'stage' && (
            <div className="space-y-4">
              {/* Stage Selector + Customize Stage Columns Button */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 space-y-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Current Pipeline Stage (Col 21)
                  </label>
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={currentStage}
                      onChange={(e) => {
                        setFormData({ ...formData, status: e.target.value as PipelineStage });
                        setValidationError(null);
                        setMissingFieldKeys([]);
                      }}
                      className="px-3.5 py-2 border border-indigo-300 rounded-xl bg-white font-bold text-indigo-700 text-xs shadow-2xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      {STAGES.map((st) => (
                        <option key={st} value={st}>
                          {st} ({(stageMandatoryRules[st] || []).length} Required Columns)
                        </option>
                      ))}
                    </select>

                    <span className="text-[11px] text-slate-500">
                      Showing <strong>{currentStageFieldDefs.length}</strong> mandatory column(s) configured for <strong>{currentStage}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsCustomizingStage((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      isCustomizingStage
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                    <span>{isCustomizingStage ? 'Done Customizing' : `Customize "${currentStage}" Columns`}</span>
                  </button>
                </div>
              </div>

              {/* Inline Stage Column Customizer Drawer */}
              {isCustomizingStage && (
                <div className="p-4 bg-indigo-50/70 border-2 border-indigo-200 rounded-2xl space-y-3 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-200/80 pb-2.5">
                    <div>
                      <h4 className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-indigo-600" />
                        <span>Select Mandatory Columns for Stage: "{currentStage}"</span>
                      </h4>
                      <p className="text-[11px] text-indigo-800 mt-0.5">
                        Tick the columns you want required & displayed when a project is in <strong>{currentStage}</strong> stage. Changes apply immediately!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetCurrentStageRules}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer self-start"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reset "{currentStage}" Defaults</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-60 overflow-y-auto pr-1">
                    {FIELD_DEFINITIONS.map((field) => {
                      const isChecked = currentStageFieldKeys.includes(field.key);
                      return (
                        <label
                          key={field.key}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                            isChecked
                              ? 'bg-white border-indigo-500 shadow-2xs font-semibold text-indigo-950'
                              : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleStageField(field.key)}
                            className="rounded text-indigo-600 w-4 h-4 cursor-pointer shrink-0"
                          />
                          <div className="truncate">
                            <div className="text-xs truncate">{field.label}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{field.category}</div>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Dynamic Fields Rendered for Selected Stage */}
              <div className="p-4 bg-white border border-slate-200 rounded-2xl space-y-4 shadow-2xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-slate-900">
                      Required Columns for {currentStage} Stage
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('info')}
                    className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>View All 44 Columns →</span>
                  </button>
                </div>

                {currentStageFieldDefs.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 space-y-2">
                    <p className="text-xs font-medium text-slate-600">
                      No mandatory columns configured for "{currentStage}" stage.
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsCustomizingStage(true)}
                      className="px-3 py-1.5 bg-indigo-50 text-indigo-700 font-semibold rounded-lg text-xs cursor-pointer"
                    >
                      + Select Columns for {currentStage}
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentStageFieldDefs.map((def) => renderDynamicStageField(def.key))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 1: All Customer & Sales Info */}
          {activeTab === 'info' && (
            <div className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LeadID (Col 1)</label>
                  <input
                    type="text"
                    readOnly
                    value={formData.leadId || ''}
                    className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg font-mono text-slate-600"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Lead Date (Col 2)</label>
                  <input
                    type="text"
                    value={formData.leadDate || ''}
                    onChange={(e) => updateFieldValue('leadDate', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Current Status (Col 21)</label>
                  <select
                    value={formData.status || 'New Leads'}
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
                    Customer Name (Col 16)
                    {currentStageFieldKeys.includes('customerName') && (
                      <span className="text-rose-600 font-bold ml-1">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mr. Ram Kishore (Optional at New Leads)"
                    value={formData.customerName || ''}
                    onChange={(e) => updateFieldValue('customerName', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Phone No (Col 17)
                    {currentStageFieldKeys.includes('phone') && (
                      <span className="text-rose-600 font-bold ml-1">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 7055294686"
                    value={formData.phone || ''}
                    onChange={(e) => updateFieldValue('phone', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Full Site Address (Col 18)
                  {currentStageFieldKeys.includes('address') && (
                    <span className="text-rose-600 font-bold ml-1">*</span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="e.g. H.No 1290, Sector-3 Shastri Nagar, Meerut"
                  value={formData.address || ''}
                  onChange={(e) => updateFieldValue('address', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Lead Source (Col 19)
                    {currentStageFieldKeys.includes('source') && (
                      <span className="text-rose-600 font-bold ml-1">*</span>
                    )}
                  </label>
                  <input
                    type="text"
                    placeholder="Field, on call, JD enquiry, Video, etc."
                    value={formData.source || ''}
                    onChange={(e) => updateFieldValue('source', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Sales Person Name (Col 20)
                    {currentStageFieldKeys.includes('salesPerson') && (
                      <span className="text-rose-600 font-bold ml-1">*</span>
                    )}
                  </label>
                  <select
                    disabled={!isEditable('salesPerson') || (currentUser.role.includes('Sales') && currentUser.role !== 'Sales Manager')}
                    value={formData.salesPerson || ''}
                    onChange={(e) => updateFieldValue('salesPerson', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 bg-white"
                  >
                    <option value="">-- Select Sales Person --</option>
                    {(users || []).map((u) => (
                      <option key={u.id} value={u.name}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                  {formData.salesEmail && (
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">
                      Backend Security Key: {formData.salesEmail}
                    </span>
                  )}
                </div>
              </div>

              {/* Google Drive Folder Link & View Quotation PDF Link */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="font-semibold text-indigo-950 text-xs flex items-center gap-1.5">
                      <FolderGit2 className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>Google Drive Folder</span>
                    </label>
                    {formData.driveFolderUrl && (
                      <a
                        href={formData.driveFolderUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs shrink-0"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Open Drive</span>
                      </a>
                    )}
                  </div>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/drive/folders/..."
                    value={formData.driveFolderUrl || ''}
                    onChange={(e) => updateFieldValue('driveFolderUrl', e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800"
                  />
                </div>

                {isViewable('quotationFile') && (
                  <div className="p-3 bg-rose-50/70 border border-rose-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <label className="font-semibold text-rose-950 text-xs flex items-center gap-1.5">
                        <FileText className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>View Quotation PDF (Col 41)</span>
                      </label>
                      {getQuotationPdfInfo(formData) && (
                        <a
                          href={getQuotationPdfInfo(formData)!.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-2xs shrink-0"
                        >
                          <FileText className="w-3 h-3" />
                          <span>View PDF</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                    <input
                      type="text"
                      disabled={!isEditable('quotationFile')}
                      placeholder="https://drive.google.com/... or Quotation PDF/..."
                      value={formData.quotationFile || formData.quotationFileApproved || ''}
                      onChange={(e) => updateFieldValue('quotationFile', e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px] text-slate-800 disabled:bg-slate-100"
                    />
                  </div>
                )}
              </div>

              {/* Financial Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Deal Amount (₹) (Col 23)</label>
                  <input
                    type="number"
                    value={formData.dealAmount || 0}
                    onChange={(e) => updateFieldValue('dealAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Received (₹) (Col 38)</label>
                  <input
                    type="number"
                    value={formData.paymentReceived || 0}
                    onChange={(e) => updateFieldValue('paymentReceived', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Due Amount (₹) (Col 39)</label>
                  <input
                    type="number"
                    readOnly
                    value={formData.duePayment || 0}
                    className="w-full px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Remark / Site Notes (Col 40)</label>
                <textarea
                  rows={2}
                  placeholder="Notes, discussion history, bank sanction remarks..."
                  value={formData.notes || ''}
                  onChange={(e) => updateFieldValue('notes', e.target.value)}
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
                    value={formData.systemCapacity || ''}
                    onChange={(e) => updateFieldValue('systemCapacity', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quotation Amount (₹) (Col 24)</label>
                  <input
                    type="number"
                    value={formData.quotationAmount || 0}
                    onChange={(e) => updateFieldValue('quotationAmount', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Payment Method Type (Col 25)</label>
                  <select
                    value={formData.paymentType || 'Loan'}
                    onChange={(e) => updateFieldValue('paymentType', e.target.value)}
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
                  placeholder="e.g. Adani 615w*5nos DCR Panels"
                  value={formData.panels || ''}
                  onChange={(e) => updateFieldValue('panels', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Inverters (Col 32)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3.3kw UTL Hybrid Sigma"
                    value={formData.inverters || ''}
                    onChange={(e) => updateFieldValue('inverters', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Battery (Col 33)</label>
                  <input
                    type="text"
                    placeholder="e.g. UTL 100Ah/51.2V Lithium / NA"
                    value={formData.battery || ''}
                    onChange={(e) => updateFieldValue('battery', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Wiring (Col 34)</label>
                  <input
                    type="text"
                    placeholder="e.g. 170 mtr"
                    value={formData.wiring || ''}
                    onChange={(e) => updateFieldValue('wiring', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Structure Type (Col 35)</label>
                  <input
                    type="text"
                    placeholder="e.g. GI Structure / Hot-Dip / Elevated"
                    value={formData.structure || ''}
                    onChange={(e) => updateFieldValue('structure', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!formData.netMeterDone}
                    onChange={(e) => updateFieldValue('netMeterDone', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Net Meter Installed (Col 36)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-800">
                  <input
                    type="checkbox"
                    checked={!!formData.subsidyDone}
                    onChange={(e) => updateFieldValue('subsidyDone', e.target.checked)}
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
                    value={formData.followUpDate || ''}
                    onChange={(e) => updateFieldValue('followUpDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Next Follow Up (Col 4)</label>
                  <input
                    type="text"
                    value={formData.nextFollowUp || ''}
                    onChange={(e) => updateFieldValue('nextFollowUp', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Converted Date (Col 5)</label>
                  <input
                    type="text"
                    value={formData.convertedDate || ''}
                    onChange={(e) => updateFieldValue('convertedDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quotation Date (Col 6)</label>
                  <input
                    type="text"
                    value={formData.quotationDate || ''}
                    onChange={(e) => updateFieldValue('quotationDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Documentation (Col 7)</label>
                  <input
                    type="text"
                    value={formData.documentationDate || ''}
                    onChange={(e) => updateFieldValue('documentationDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Registration (Col 8)</label>
                  <input
                    type="text"
                    value={formData.registrationDate || ''}
                    onChange={(e) => updateFieldValue('registrationDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Loan Date (Col 9)</label>
                  <input
                    type="text"
                    value={formData.loanDate || ''}
                    onChange={(e) => updateFieldValue('loanDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Survey Date (Col 10)</label>
                  <input
                    type="text"
                    value={formData.surveyDate || ''}
                    onChange={(e) => updateFieldValue('surveyDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">M Dispatch (Col 11)</label>
                  <input
                    type="text"
                    value={formData.mDispatchDate || ''}
                    onChange={(e) => updateFieldValue('mDispatchDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Installation (Col 12)</label>
                  <input
                    type="text"
                    value={formData.installationDate || ''}
                    onChange={(e) => updateFieldValue('installationDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Net Meter Date (Col 13)</label>
                  <input
                    type="text"
                    value={formData.netMeterDate || ''}
                    onChange={(e) => updateFieldValue('netMeterDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Connection Date (Col 14)</label>
                  <input
                    type="text"
                    value={formData.connectionDate || ''}
                    onChange={(e) => updateFieldValue('connectionDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Complete Date (Col 15)</label>
                  <input
                    type="text"
                    value={formData.completeDate || ''}
                    onChange={(e) => updateFieldValue('completeDate', e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-md font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">First Payment Month (Col 44)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2/5/2026"
                    value={formData.firstPaymentMonth || ''}
                    onChange={(e) => updateFieldValue('firstPaymentMonth', e.target.value)}
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

              <div className="p-3.5 bg-rose-50/50 border border-rose-200 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-bold text-rose-950 text-xs flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-rose-600" />
                    <span>View Quotation PDF File (Col 41)</span>
                  </label>
                  {getQuotationPdfInfo(formData) && (
                    <a
                      href={getQuotationPdfInfo(formData)!.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[11px] shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Open Quotation PDF</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. https://drive.google.com/file/d/... or Quotation PDF/Quo_Mr. Ram Kishore_97e43cff.pdf"
                  value={formData.quotationFile || ''}
                  onChange={(e) => updateFieldValue('quotationFile', e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Quotation File Approved (Col 27)</label>
                  {formData.quotationFileApproved && (
                    <a
                      href={
                        /^https?:\/\//i.test(formData.quotationFileApproved)
                          ? formData.quotationFileApproved
                          : `https://drive.google.com/drive/search?q=${encodeURIComponent(formData.quotationFileApproved.split('/').pop() || formData.quotationFileApproved)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>View File</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="Approved quotation file link or path"
                  value={formData.quotationFileApproved || ''}
                  onChange={(e) => updateFieldValue('quotationFileApproved', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">Project Sheet Approved PDF (Col 28)</label>
                  {formData.projectSheetApproved && (
                    <a
                      href={
                        /^https?:\/\//i.test(formData.projectSheetApproved)
                          ? formData.projectSheetApproved
                          : `https://drive.google.com/drive/search?q=${encodeURIComponent(formData.projectSheetApproved.split('/').pop() || formData.projectSheetApproved)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
                    >
                      <span>View Approved Sheet</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <input
                  type="text"
                  placeholder="e.g. Main Project Sheet_Files_/97e43cff.Project Sheet Approved.pdf"
                  value={formData.projectSheetApproved || ''}
                  onChange={(e) => updateFieldValue('projectSheetApproved', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price Approval Image (Col 26)</label>
                  <input
                    type="text"
                    placeholder="Image URL or Drive link"
                    value={formData.priceApproval || ''}
                    onChange={(e) => updateFieldValue('priceApproval', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Document Image (Col 29)</label>
                  <input
                    type="text"
                    placeholder="Adhar/Electricity bill image link"
                    value={formData.documentImage || ''}
                    onChange={(e) => updateFieldValue('documentImage', e.target.value)}
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
              {formData.lastModifiedTime ? `Last modified: ${formData.lastModifiedTime}` : `Active Stage: ${currentStage}`}
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
