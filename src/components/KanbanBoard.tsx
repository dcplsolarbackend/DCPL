import React, { useMemo } from 'react';
import type { Lead, PipelineStage, User } from '../types/crm';
import { getVisibleStagesForRole } from '../constants/pipeline';
import { getQuotationPdfInfo } from '../utils/storage';
import { 
  ArrowLeft, 
  ArrowRight, 
  MessageSquare, 
  Phone, 
  Calendar, 
  Edit3,
  User as UserIcon,
  FileText
} from 'lucide-react';

interface KanbanBoardProps {
  leads: Lead[];
  onUpdateStatus: (leadId: string, newStatus: PipelineStage) => void;
  onEditLead: (lead: Lead) => void;
  onOpenWhatsApp: (lead: Lead) => void;
  currentUser?: User | null;
}

const ALL_KANBAN_STAGES: { id: PipelineStage; label: string; color: string }[] = [
  { id: 'New Leads', label: 'New Leads', color: 'border-t-amber-500' },
  { id: 'Follow Up', label: 'Follow Up', color: 'border-t-blue-500' },
  { id: 'Converted', label: 'Converted', color: 'border-t-emerald-500' },
  { id: 'Quotation', label: 'Quotation', color: 'border-t-indigo-500' },
  { id: 'Documentation', label: 'Documentation', color: 'border-t-orange-500' },
  { id: 'Registration', label: 'Registration', color: 'border-t-purple-500' },
  { id: 'Loan', label: 'Loan', color: 'border-t-cyan-500' },
  { id: 'Survey', label: 'Survey', color: 'border-t-blue-600' },
  { id: 'Material Dispatch', label: 'Dispatch', color: 'border-t-orange-600' },
  { id: 'Installation', label: 'Installation', color: 'border-t-slate-700' },
  { id: 'Inspection', label: 'Inspection', color: 'border-t-teal-600' },
  { id: 'Net Meter', label: 'Net Meter', color: 'border-t-yellow-500' },
  { id: 'Connection', label: 'Connection', color: 'border-t-slate-800' },
  { id: 'Complete', label: 'Complete', color: 'border-t-emerald-600' },
  { id: 'Lost', label: 'Lost', color: 'border-t-rose-500' },
];

export const KanbanBoard: React.FC<KanbanBoardProps> = ({
  leads,
  onUpdateStatus,
  onEditLead,
  onOpenWhatsApp,
  currentUser,
}) => {
  const visibleStageNames = useMemo(() => {
    return getVisibleStagesForRole(currentUser?.role);
  }, [currentUser?.role]);

  const activeStages = useMemo(() => {
    return ALL_KANBAN_STAGES.filter((s) => visibleStageNames.includes(s.id));
  }, [visibleStageNames]);

  const todayStr = new Date().toISOString().split('T')[0];

  const getStageIndex = (stage: PipelineStage) => activeStages.findIndex((s) => s.id === stage);

  const moveStage = (lead: Lead, direction: 'prev' | 'next') => {
    const currentIndex = getStageIndex(lead.status);
    if (direction === 'prev' && currentIndex > 0) {
      onUpdateStatus(lead.leadId, activeStages[currentIndex - 1].id);
    } else if (direction === 'next' && currentIndex < activeStages.length - 1) {
      onUpdateStatus(lead.leadId, activeStages[currentIndex + 1].id);
    }
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-6 items-start min-h-[calc(100vh-14rem)]">
      {activeStages.map((stage, idx) => {
        const stageLeads = leads.filter((l) => l.status === stage.id);
        const stageDues = stageLeads.reduce((acc, l) => acc + (l.duePayment || 0), 0);

        return (
          <div
            key={stage.id}
            className={`w-68 shrink-0 bg-slate-100/80 rounded-xl border border-slate-200 border-t-4 ${stage.color} flex flex-col max-h-[calc(100vh-14rem)] shadow-2xs`}
          >
            {/* Column Header */}
            <div className="p-2.5 border-b border-slate-200/80 flex items-center justify-between bg-white/70 rounded-t-lg">
              <div className="truncate">
                <h3 className="text-xs font-bold text-slate-800 tracking-tight truncate">
                  {stage.label}
                </h3>
                {stageDues > 0 && (
                  <div className="text-[10px] text-rose-600 font-mono tabular-nums font-semibold">
                    ₹{(stageDues / 1000).toFixed(0)}k due
                  </div>
                )}
              </div>
              <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 font-bold ml-1">
                {stageLeads.length}
              </span>
            </div>

            {/* Column Content / Cards */}
            <div className="p-2 space-y-2 overflow-y-auto flex-1">
              {stageLeads.length === 0 ? (
                <div className="py-6 text-center text-[11px] text-slate-400 border border-dashed border-slate-300 rounded-lg bg-white/40">
                  Empty
                </div>
              ) : (
                stageLeads.map((lead) => {
                  const isFollowUpToday =
                    lead.followUpDate === todayStr && lead.status !== 'Complete';
                  const isOverdue =
                    lead.followUpDate &&
                    lead.followUpDate < todayStr &&
                    lead.status !== 'Complete';

                  return (
                    <div
                      key={lead.leadId}
                      className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow space-y-1.5 group"
                    >
                      {/* Top Row: Lead ID and Edit */}
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-mono font-bold text-slate-700">
                          {lead.leadId}
                        </span>
                        <button
                          onClick={() => onEditLead(lead)}
                          title="Edit"
                          className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Customer Name & Project */}
                      <div>
                        <h4 className="text-xs font-semibold text-slate-900 leading-snug truncate">
                          {lead.customerName}
                        </h4>
                        {lead.projectType && (
                          <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                            {lead.projectType}
                          </p>
                        )}
                      </div>

                      {/* Rep & Due */}
                      <div className="text-[10px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-100">
                        <span className="truncate flex items-center gap-1 text-slate-500">
                          <UserIcon className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[80px]">{lead.salesPerson}</span>
                        </span>
                        {lead.duePayment && lead.duePayment > 0 ? (
                          <span className="font-mono tabular-nums font-semibold text-rose-600">
                            ₹{(lead.duePayment / 1000).toFixed(0)}k
                          </span>
                        ) : null}
                      </div>

                      {/* Follow-up date if present */}
                      {lead.followUpDate && (
                        <div
                          className={`flex items-center gap-1 text-[10px] font-mono tabular-nums ${
                            isFollowUpToday
                              ? 'text-amber-700 font-bold'
                              : isOverdue
                              ? 'text-rose-600 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          <Calendar className="w-2.5 h-2.5 shrink-0" />
                          <span>{lead.followUpDate}</span>
                          {isFollowUpToday && <span>(Today)</span>}
                        </div>
                      )}

                      {/* Bottom Controls */}
                      <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onOpenWhatsApp(lead)}
                            title="WhatsApp"
                            className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3 h-3" />
                          </button>
                          <a
                            href={`tel:${lead.phone}`}
                            title="Call"
                            className="p-1 text-sky-600 hover:bg-sky-50 rounded transition-colors inline-block"
                          >
                            <Phone className="w-3 h-3" />
                          </a>
                          {getQuotationPdfInfo(lead) && (
                            <a
                              href={getQuotationPdfInfo(lead)!.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title={`View Quotation PDF: ${getQuotationPdfInfo(lead)!.fileName}`}
                              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded transition-colors"
                            >
                              <FileText className="w-2.5 h-2.5 text-rose-600" />
                              <span>PDF</span>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center gap-0.5">
                          <button
                            disabled={idx === 0}
                            onClick={() => moveStage(lead, 'prev')}
                            title="Move back"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowLeft className="w-3 h-3" />
                          </button>
                          <button
                            disabled={idx === activeStages.length - 1}
                            onClick={() => moveStage(lead, 'next')}
                            title="Advance"
                            className="p-1 text-indigo-600 hover:text-indigo-800 rounded disabled:opacity-20 cursor-pointer"
                          >
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
