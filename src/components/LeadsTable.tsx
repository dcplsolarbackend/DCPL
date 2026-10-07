import React, { useState, useMemo, useEffect } from 'react';
import { Lead, PipelineStage, User } from '../types/crm';
import { getQuotationPdfInfo } from '../utils/storage';
import { loadColumnPermissions, canViewColumn } from '../utils/permissionStorage';
import { 
  FIELD_DEFINITIONS, 
  loadStageMandatoryRules, 
  saveStageMandatoryRules, 
  DEFAULT_STAGE_MANDATORY_RULES 
} from '../utils/pipelinePermissions';
import { ALL_STAGES } from '../constants/stages';
import { 
  Search, 
  MessageSquare, 
  Phone, 
  Edit3, 
  Trash2, 
  AlertCircle,
  Check,
  Zap,
  ExternalLink,
  FolderGit2,
  FileText,
  Sliders,
  RotateCcw,
  Layers,
  Sparkles
} from 'lucide-react';

interface LeadsTableProps {
  leads: Lead[];
  onEditLead: (lead: Lead) => void;
  onDeleteLead: (leadId: string) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  onUpdateStatus: (leadId: string, newStatus: PipelineStage) => void;
  selectedStageFilter: string;
  currentUser?: User;
}

export const LeadsTable: React.FC<LeadsTableProps> = ({
  leads,
  onEditLead,
  onDeleteLead,
  onOpenWhatsApp,
  onUpdateStatus,
  selectedStageFilter,
  currentUser,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'date' | 'followup' | 'due' | 'name' | 'deal'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusDropdownOpen, setStatusDropdownOpen] = useState<string | null>(null);

  const [stageMandatoryRules, setStageMandatoryRules] = useState<Record<PipelineStage, string[]>>(() => loadStageMandatoryRules());
  const [isCustomizingStageCols, setIsCustomizingStageCols] = useState(false);
  const [customizerStage, setCustomizerStage] = useState<PipelineStage>('New Leads');
  const [viewStageColumnsOnly, setViewStageColumnsOnly] = useState<boolean>(true);

  const isSpecificStageSelected =
    selectedStageFilter !== 'All' &&
    selectedStageFilter !== 'due_only' &&
    ALL_STAGES.includes(selectedStageFilter as PipelineStage);

  // Sync customizerStage with selectedStageFilter when user clicks a stage in sidebar
  useEffect(() => {
    if (isSpecificStageSelected) {
      setCustomizerStage(selectedStageFilter as PipelineStage);
      setViewStageColumnsOnly(true);
    }
  }, [selectedStageFilter, isSpecificStageSelected]);

  // Listen to global stage rules updates
  useEffect(() => {
    const refresh = () => {
      setStageMandatoryRules(loadStageMandatoryRules());
    };
    window.addEventListener('crm_stage_rules_updated', refresh);
    return () => window.removeEventListener('crm_stage_rules_updated', refresh);
  }, []);

  const columnRules = useMemo(() => loadColumnPermissions(), []);
  const canSeeQuotationPdf = !currentUser || canViewColumn('quotationFile', currentUser.role, columnRules);
  const canDelete = !currentUser || currentUser.role === 'Admin' || currentUser.role === 'Sales Manager';

  const activeStageForColumns: PipelineStage = isSpecificStageSelected
    ? (selectedStageFilter as PipelineStage)
    : customizerStage;

  const activeStageFieldKeys = useMemo(() => {
    return (
      stageMandatoryRules[activeStageForColumns] ||
      DEFAULT_STAGE_MANDATORY_RULES[activeStageForColumns] ||
      ['salesPerson', 'phone', 'source']
    );
  }, [stageMandatoryRules, activeStageForColumns]);

  const activeStageFieldDefs = useMemo(() => {
    return FIELD_DEFINITIONS.filter((def) => activeStageFieldKeys.includes(def.key));
  }, [activeStageFieldKeys]);

  const handleToggleStageField = (stage: PipelineStage, fieldKey: string) => {
    const current = stageMandatoryRules[stage] || [];
    const exists = current.includes(fieldKey);
    const updatedList = exists ? current.filter((k) => k !== fieldKey) : [...current, fieldKey];
    const updatedRules: Record<PipelineStage, string[]> = {
      ...stageMandatoryRules,
      [stage]: updatedList,
    };
    if (stage === 'New Leads') {
      updatedRules['Lead'] = updatedList;
    }
    setStageMandatoryRules(updatedRules);
    saveStageMandatoryRules(updatedRules);
  };

  const handleResetStageDefaults = (stage: PipelineStage) => {
    const defaults = DEFAULT_STAGE_MANDATORY_RULES[stage] || ['salesPerson', 'phone', 'source'];
    const updatedRules: Record<PipelineStage, string[]> = {
      ...stageMandatoryRules,
      [stage]: [...defaults],
    };
    setStageMandatoryRules(updatedRules);
    saveStageMandatoryRules(updatedRules);
  };

  const filteredAndSortedLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        // Stage filter
        if (selectedStageFilter !== 'All') {
          if (selectedStageFilter === 'due_only') {
            if ((lead.duePayment || 0) <= 0) return false;
          } else if (selectedStageFilter === 'New Leads') {
            if (lead.status !== 'New Leads' && lead.status !== 'Lead') return false;
          } else if (lead.status !== selectedStageFilter) {
            return false;
          }
        }

        // Search term
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return (
          lead.leadId.toLowerCase().includes(query) ||
          (lead.customerName || '').toLowerCase().includes(query) ||
          (lead.phone || '').toLowerCase().includes(query) ||
          (lead.salesPerson || '').toLowerCase().includes(query) ||
          (lead.source || '').toLowerCase().includes(query) ||
          (lead.systemCapacity && lead.systemCapacity.toLowerCase().includes(query)) ||
          (lead.address && lead.address.toLowerCase().includes(query))
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortBy === 'date') {
          const da = a.leadDate ? new Date(a.leadDate).getTime() : 0;
          const db = b.leadDate ? new Date(b.leadDate).getTime() : 0;
          diff = da - db;
        } else if (sortBy === 'followup') {
          const fa = a.followUpDate ? new Date(a.followUpDate).getTime() : 0;
          const fb = b.followUpDate ? new Date(b.followUpDate).getTime() : 0;
          diff = fa - fb;
        } else if (sortBy === 'due') {
          diff = (a.duePayment || 0) - (b.duePayment || 0);
        } else if (sortBy === 'deal') {
          diff = (a.dealAmount || 0) - (b.dealAmount || 0);
        } else if (sortBy === 'name') {
          diff = (a.customerName || '').localeCompare(b.customerName || '');
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
  }, [leads, selectedStageFilter, searchTerm, sortBy, sortOrder]);

  const toggleSort = (field: 'date' | 'followup' | 'due' | 'name' | 'deal') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const getStageBadge = (status: PipelineStage) => {
    switch (status) {
      case 'Lead':
      case 'New Leads':
        return 'text-amber-800 bg-amber-50 border-amber-200';
      case 'Follow Up':
        return 'text-blue-800 bg-blue-50 border-blue-200';
      case 'Converted':
        return 'text-emerald-800 bg-emerald-50 border-emerald-200';
      case 'Quotation':
        return 'text-indigo-800 bg-indigo-50 border-indigo-200';
      case 'Documentation':
        return 'text-orange-800 bg-orange-50 border-orange-200';
      case 'Registration':
        return 'text-purple-800 bg-purple-50 border-purple-200';
      case 'Loan':
        return 'text-cyan-800 bg-cyan-50 border-cyan-200';
      case 'Survey':
        return 'text-blue-800 bg-blue-50 border-blue-200';
      case 'Material Dispatch':
        return 'text-orange-900 bg-orange-100 border-orange-300';
      case 'Installation':
        return 'text-slate-800 bg-slate-100 border-slate-300';
      case 'Inspection':
        return 'text-teal-800 bg-teal-50 border-teal-200';
      case 'Net Meter':
        return 'text-yellow-900 bg-yellow-100 border-yellow-300';
      case 'Connection':
        return 'text-slate-900 bg-slate-200 border-slate-400';
      case 'Complete':
        return 'text-emerald-900 bg-emerald-100 border-emerald-300';
      case 'Lost':
        return 'text-rose-800 bg-rose-50 border-rose-200';
      default:
        return 'text-slate-700 bg-slate-100 border-slate-200';
    }
  };

  // Renders the cell value for any dynamic stage column key
  const renderDynamicCell = (lead: Lead, fieldKey: string) => {
    const val = (lead as any)[fieldKey];

    if (fieldKey === 'quotationFile') {
      const pdfInfo = getQuotationPdfInfo(lead);
      return pdfInfo ? (
        <div className="flex flex-col items-start gap-0.5" onClick={(e) => e.stopPropagation()}>
          <a
            href={pdfInfo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px]"
          >
            <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>View PDF</span>
            <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
          </a>
          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[130px]">{pdfInfo.fileName}</span>
        </div>
      ) : (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEditLead(lead);
          }}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-200"
        >
          <FileText className="w-3 h-3" />
          <span>+ Link PDF</span>
        </button>
      );
    }

    if (fieldKey === 'driveFolderUrl') {
      return lead.driveFolderUrl ? (
        <a
          href={lead.driveFolderUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold text-[11px]"
        >
          <FolderGit2 className="w-3.5 h-3.5" />
          <span>Open Drive</span>
        </a>
      ) : (
        <span className="text-slate-300">—</span>
      );
    }

    if (fieldKey === 'dealAmount' || fieldKey === 'quotationAmount' || fieldKey === 'paymentReceived' || fieldKey === 'duePayment') {
      const num = Number(val) || 0;
      return (
        <span className={`font-mono font-semibold ${fieldKey === 'duePayment' && num > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
          ₹{num.toLocaleString('en-IN')}
        </span>
      );
    }

    if (fieldKey === 'phone') {
      return <span className="font-mono font-semibold text-slate-900">{lead.phone || '—'}</span>;
    }

    if (fieldKey === 'salesPerson') {
      return (
        <div>
          <div className="font-semibold text-slate-900">{lead.salesPerson || '—'}</div>
          {lead.salesEmail && <div className="text-[10px] text-slate-400 font-mono">{lead.salesEmail}</div>}
        </div>
      );
    }

    if (fieldKey === 'source') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px]">
          {lead.source || '—'}
        </span>
      );
    }

    if (val === undefined || val === null || val === '') {
      return <span className="text-rose-400 text-[11px] italic">Missing *</span>;
    }

    return <span className="text-slate-800">{String(val)}</span>;
  };

  const showDynamicStageMode = isSpecificStageSelected && viewStageColumnsOnly;

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden space-y-0">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-slate-50/50">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search name, phone, source, sales rep..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            />
          </div>

          {/* Stage Columns Mode Switcher & Customizer Trigger */}
          <div className="flex items-center gap-2 flex-wrap">
            {isSpecificStageSelected && (
              <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
                <button
                  type="button"
                  onClick={() => setViewStageColumnsOnly(true)}
                  className={`px-2.5 py-1 rounded-md font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                    viewStageColumnsOnly
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  <span>{selectedStageFilter} Columns ({activeStageFieldDefs.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewStageColumnsOnly(false)}
                  className={`px-2.5 py-1 rounded-md font-medium flex items-center gap-1 cursor-pointer transition-colors ${
                    !viewStageColumnsOnly
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Layers className="w-3 h-3" />
                  <span>All Columns</span>
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setIsCustomizingStageCols((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                isCustomizingStageCols
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-indigo-700 border-indigo-200 hover:bg-indigo-50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {isCustomizingStageCols
                  ? 'Close Column Customizer'
                  : `Customize Stage Columns (${activeStageForColumns})`}
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 justify-end text-xs text-slate-500">
          <span>Sort:</span>
          <button
            onClick={() => toggleSort('date')}
            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
              sortBy === 'date' ? 'bg-slate-200 text-slate-900 font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            Date {sortBy === 'date' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('deal')}
            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
              sortBy === 'deal' ? 'bg-slate-200 text-slate-900 font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            Deal (₹) {sortBy === 'deal' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
          <button
            onClick={() => toggleSort('due')}
            className={`cursor-pointer px-2 py-1 rounded transition-colors ${
              sortBy === 'due' ? 'bg-slate-200 text-slate-900 font-semibold' : 'hover:bg-slate-100'
            }`}
          >
            Due (₹) {sortBy === 'due' && (sortOrder === 'asc' ? '↑' : '↓')}
          </button>
        </div>
      </div>

      {/* Inline Stage-Wise Column Customizer Panel */}
      {isCustomizingStageCols && (
        <div className="p-4 bg-indigo-50/70 border-b border-indigo-200 space-y-3 animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <span>Customize Mandatory & Visible Columns per Pipeline Stage</span>
              </h4>
              <p className="text-[11px] text-indigo-800 mt-0.5">
                Select a stage below and tick which columns are required at that stage (e.g. New Leads = only Sales Person, Phone No, and Lead Source).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleResetStageDefaults(activeStageForColumns)}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 bg-white hover:bg-indigo-100 border border-indigo-200 rounded-lg cursor-pointer self-start"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset "{activeStageForColumns}" Defaults</span>
            </button>
          </div>

          {/* Stage Selector Pills */}
          <div className="flex flex-wrap gap-1.5">
            {ALL_STAGES.map((st) => {
              const isSelected = activeStageForColumns === st;
              const count = (stageMandatoryRules[st] || []).length;
              return (
                <button
                  key={st}
                  type="button"
                  onClick={() => setCustomizerStage(st)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
                    isSelected
                      ? 'bg-slate-900 text-white shadow-2xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <span>{st}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Columns Checkboxes for Selected Stage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 max-h-56 overflow-y-auto pt-1">
            {FIELD_DEFINITIONS.map((field) => {
              const isChecked = activeStageFieldKeys.includes(field.key);
              return (
                <label
                  key={field.key}
                  className={`p-2 rounded-xl border flex items-center gap-2 cursor-pointer transition-all ${
                    isChecked
                      ? 'bg-white border-indigo-500 shadow-2xs font-semibold text-indigo-950'
                      : 'bg-white/60 border-slate-200 text-slate-600 hover:bg-white'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => handleToggleStageField(activeStageForColumns, field.key)}
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

      {/* Active Stage Mandatory Columns Summary Strip */}
      {isSpecificStageSelected && (
        <div className="px-4 py-2 bg-amber-50/70 border-b border-amber-200/80 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold text-amber-900">
              Mandatory Columns for "{selectedStageFilter}":
            </span>
            {activeStageFieldDefs.map((def) => (
              <span
                key={def.key}
                className="px-2 py-0.5 rounded-md bg-white border border-amber-300 text-amber-900 font-semibold"
              >
                {def.label} *
              </span>
            ))}
          </div>
          <span className="text-amber-800">
            Click <strong>Customize Stage Columns</strong> above to add/remove required fields for {selectedStageFilter}
          </span>
        </div>
      )}

      {/* Main Table */}
      <div className="overflow-x-auto">
        {showDynamicStageMode ? (
          /* STAGE-SPECIFIC DYNAMIC TABLE (Shows ONLY columns configured for this stage!) */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">LeadID</th>
                <th className="py-3 px-4">Status (Stage)</th>
                {activeStageFieldDefs.map((def) => (
                  <th key={def.key} className="py-3 px-4 text-indigo-950">
                    {def.label} <span className="text-rose-600">*</span>
                  </th>
                ))}
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAndSortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={activeStageFieldDefs.length + 3} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No projects found in {selectedStageFilter}</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedLeads.map((lead) => (
                  <tr
                    key={lead.leadId}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (!target.closest('button') && !target.closest('a') && !target.closest('select')) {
                        onEditLead(lead);
                      }
                    }}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {lead.leadId}
                    </td>

                    <td className="py-3 px-4 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                      <div className="inline-block relative">
                        <button
                          type="button"
                          onClick={() =>
                            setStatusDropdownOpen(
                              statusDropdownOpen === lead.leadId ? null : lead.leadId
                            )
                          }
                          className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 cursor-pointer transition-colors ${getStageBadge(
                            lead.status
                          )}`}
                        >
                          <span>{lead.status}</span>
                          <span className="text-[9px] opacity-60">▼</span>
                        </button>

                        {statusDropdownOpen === lead.leadId && (
                          <div className="absolute left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 z-40 py-1 text-xs divide-y divide-slate-100">
                            {ALL_STAGES.map((st) => (
                              <button
                                key={st}
                                onClick={() => {
                                  onUpdateStatus(lead.leadId, st);
                                  setStatusDropdownOpen(null);
                                }}
                                className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer"
                              >
                                <span>{st}</span>
                                {lead.status === st && <Check className="w-3.5 h-3.5 text-indigo-600" />}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>

                    {activeStageFieldDefs.map((def) => (
                      <td key={def.key} className="py-3 px-4 whitespace-nowrap">
                        {renderDynamicCell(lead, def.key)}
                      </td>
                    ))}

                    <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => onOpenWhatsApp(lead)}
                          title="Open WhatsApp Message"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            title={`Call ${lead.phone}`}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors inline-block"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => onEditLead(lead)}
                          title="Edit Stage Columns"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => onDeleteLead(lead.leadId)}
                            title="Delete Project"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          /* FULL MASTER TABLE VIEW */
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-4">LeadID</th>
                <th className="py-3 px-4">Customer & Capacity</th>
                <th className="py-3 px-4">Phone & Source</th>
                <th className="py-3 px-4">Sales Rep</th>
                <th className="py-3 px-4">Status (Stage)</th>
                {canSeeQuotationPdf && <th className="py-3 px-4">View Quotation PDF</th>}
                <th className="py-3 px-4 text-right">Deal (₹)</th>
                <th className="py-3 px-4 text-right">Received (₹)</th>
                <th className="py-3 px-4 text-right">Due (₹)</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAndSortedLeads.length === 0 ? (
                <tr>
                  <td colSpan={canSeeQuotationPdf ? 10 : 9} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center">
                      <AlertCircle className="w-8 h-8 text-slate-300 mb-2" />
                      <p className="text-sm font-medium text-slate-600">No projects found in this view</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Check your search query or pipeline filter.
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredAndSortedLeads.map((lead) => {
                  const pdfInfo = getQuotationPdfInfo(lead);

                  return (
                    <tr
                      key={lead.leadId}
                      className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                      onClick={(e) => {
                        const target = e.target as HTMLElement;
                        if (!target.closest('button') && !target.closest('a') && !target.closest('select')) {
                          onEditLead(lead);
                        }
                      }}
                    >
                      {/* Lead ID */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {lead.leadId}
                      </td>

                      {/* Customer Name & Capacity */}
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-semibold text-slate-900 truncate">
                          {lead.customerName || <span className="text-slate-400 italic">Not set yet (Lead)</span>}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                          <span>{lead.systemCapacity || 'Solar Project'}</span>
                        </div>
                      </td>

                      {/* Phone, Source & City */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-mono font-semibold text-slate-800">{lead.phone || '—'}</div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium">
                            {lead.source || 'Field'}
                          </span>
                          {lead.address && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]">
                              {lead.address}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Sales Rep */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="text-slate-800 font-medium truncate max-w-[120px]">
                          {lead.salesPerson?.split('@')[0] || lead.salesPerson || 'Sales Team'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                          {lead.salesEmail || lead.salesPerson}
                        </div>
                      </td>

                      {/* Status Dropdown */}
                      <td className="py-3 px-4 whitespace-nowrap relative" onClick={(e) => e.stopPropagation()}>
                        <div className="inline-block relative">
                          <button
                            type="button"
                            onClick={() =>
                              setStatusDropdownOpen(
                                statusDropdownOpen === lead.leadId ? null : lead.leadId
                              )
                            }
                            className={`text-xs px-2.5 py-1 rounded-md border font-medium flex items-center gap-1 cursor-pointer transition-colors ${getStageBadge(
                              lead.status
                            )}`}
                          >
                            <span>{lead.status}</span>
                            <span className="text-[9px] opacity-60">▼</span>
                          </button>

                          {statusDropdownOpen === lead.leadId && (
                            <div className="absolute left-0 mt-1 w-48 max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg border border-slate-200 z-40 py-1 text-xs divide-y divide-slate-100">
                              {ALL_STAGES.map((st) => (
                                <button
                                  key={st}
                                  onClick={() => {
                                    onUpdateStatus(lead.leadId, st);
                                    setStatusDropdownOpen(null);
                                  }}
                                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 flex items-center justify-between text-slate-700 hover:text-slate-900 cursor-pointer"
                                >
                                  <span>{st}</span>
                                  {lead.status === st && (
                                    <Check className="w-3.5 h-3.5 text-indigo-600" />
                                  )}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* View Quotation PDF Column */}
                      {canSeeQuotationPdf && (
                        <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {pdfInfo ? (
                            <div className="flex flex-col items-start gap-0.5">
                              <a
                                href={pdfInfo.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`Open Quotation PDF: ${pdfInfo.rawValue}`}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold text-[11px] transition-colors shadow-2xs"
                              >
                                <FileText className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>View PDF</span>
                                <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                              </a>
                              <span
                                className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]"
                                title={pdfInfo.rawValue}
                              >
                                {pdfInfo.fileName}
                              </span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onEditLead(lead)}
                              title="Add Quotation PDF Link"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                            >
                              <FileText className="w-3 h-3" />
                              <span>+ Link PDF</span>
                            </button>
                          )}
                        </td>
                      )}

                      {/* Deal Amount */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums text-slate-900 font-medium">
                        ₹{lead.dealAmount ? lead.dealAmount.toLocaleString('en-IN') : 0}
                      </td>

                      {/* Payment Received */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums text-emerald-700 font-semibold">
                        ₹{lead.paymentReceived ? lead.paymentReceived.toLocaleString('en-IN') : 0}
                      </td>

                      {/* Due Amount (₹) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap font-mono tabular-nums">
                        {lead.duePayment && lead.duePayment > 0 ? (
                          <span className="font-bold text-rose-600">
                            ₹{lead.duePayment.toLocaleString('en-IN')}
                          </span>
                        ) : (
                          <span className="text-slate-400">₹0</span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="py-3 px-4 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => onOpenWhatsApp(lead)}
                            title="Open WhatsApp Message"
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-4 h-4" />
                          </button>

                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              title={`Call ${lead.phone}`}
                              className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors inline-block"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                          )}

                          <button
                            onClick={() => onEditLead(lead)}
                            title="View Stage & 44 Columns Details"
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>

                          {lead.driveFolderUrl && (
                            <a
                              href={lead.driveFolderUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Open Customer Google Drive Folder"
                              className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors inline-block"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <FolderGit2 className="w-4 h-4" />
                            </a>
                          )}

                          {canDelete && (
                            <button
                              onClick={() => onDeleteLead(lead.leadId)}
                              title="Delete Project"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Footer */}
      <div className="p-3 border-t border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
        <div>
          Showing <span className="font-semibold text-slate-700">{filteredAndSortedLeads.length}</span> of{' '}
          <span className="font-semibold text-slate-700">{leads.length}</span> projects
        </div>
        <div className="flex items-center gap-4">
          <span>
            Total Deal Value:{' '}
            <strong className="font-mono text-slate-900">
              ₹{filteredAndSortedLeads.reduce((acc, l) => acc + (l.dealAmount || 0), 0).toLocaleString('en-IN')}
            </strong>
          </span>
          <span>
            Total Pending Dues:{' '}
            <strong className="font-mono text-rose-600">
              ₹{filteredAndSortedLeads.reduce((acc, l) => acc + (l.duePayment || 0), 0).toLocaleString('en-IN')}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};
