import React, { useState, useMemo } from 'react';
import { Lead, PipelineStage, User } from '../types/crm';
import { getQuotationPdfInfo } from '../utils/storage';
import { loadColumnPermissions, canViewColumn } from '../utils/permissionStorage';
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
  FileText
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

  const columnRules = useMemo(() => loadColumnPermissions(), []);
  const canSeeQuotationPdf = !currentUser || canViewColumn('quotationFile', currentUser.role, columnRules);
  const canDelete = !currentUser || currentUser.role === 'Admin' || currentUser.role === 'Sales Manager';

  const filteredAndSortedLeads = useMemo(() => {
    return leads
      .filter((lead) => {
        // Stage filter
        if (selectedStageFilter !== 'All') {
          if (selectedStageFilter === 'due_only') {
            if ((lead.duePayment || 0) <= 0) return false;
          } else if (lead.status !== selectedStageFilter) {
            return false;
          }
        }

        // Search term
        if (!searchTerm.trim()) return true;
        const query = searchTerm.toLowerCase();
        return (
          lead.leadId.toLowerCase().includes(query) ||
          lead.customerName.toLowerCase().includes(query) ||
          lead.phone.toLowerCase().includes(query) ||
          lead.salesPerson.toLowerCase().includes(query) ||
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
          diff = a.customerName.localeCompare(b.customerName);
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Table Header Controls */}
      <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search name, phone, lead ID, sales rep..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end text-xs text-slate-500">
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

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              <th className="py-3 px-4">LeadID</th>
              <th className="py-3 px-4">Customer & Capacity</th>
              <th className="py-3 px-4">Phone & City</th>
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
                      // Avoid opening when clicking specific action buttons
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
                        {lead.customerName || 'Unnamed'}
                      </div>
                      <div className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{lead.systemCapacity || 'Solar Project'}</span>
                      </div>
                    </td>

                    {/* Contact & City */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono text-slate-800">{lead.phone || '—'}</div>
                      <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
                        {lead.address || '—'}
                      </div>
                    </td>

                    {/* Sales Rep */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="text-slate-800 font-medium truncate max-w-[120px]">
                        {lead.salesPerson?.split('@')[0] || lead.salesPerson || 'Sales Team'}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono truncate max-w-[120px]">
                        {lead.salesPerson}
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
                        {/* WhatsApp Trigger */}
                        <button
                          onClick={() => onOpenWhatsApp(lead)}
                          title="Open WhatsApp Message"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                        >
                          <MessageSquare className="w-4 h-4" />
                        </button>

                        {/* Phone Call */}
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            title={`Call ${lead.phone}`}
                            className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md transition-colors inline-block"
                          >
                            <Phone className="w-4 h-4" />
                          </a>
                        )}

                        {/* Edit 44 Columns details */}
                        <button
                          onClick={() => onEditLead(lead)}
                          title="View 44 Columns Details"
                          className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        {/* Google Drive Folder */}
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

                        {/* Delete */}
                        {canDelete && (
                          <button
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete project ${lead.leadId} (${lead.customerName})?`
                                )
                              ) {
                                onDeleteLead(lead.leadId);
                              }
                            }}
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
