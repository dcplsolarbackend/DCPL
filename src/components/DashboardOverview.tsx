import React from 'react';
import { Lead, PipelineStage, ActivityLog } from '../types/crm';
import { 
  BarChart3, 
  TrendingUp, 
  IndianRupee, 
  CheckCircle2, 
  Clock, 
  RefreshCw, 
  Users, 
  Zap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

interface DashboardOverviewProps {
  leads: Lead[];
  activityLogs: ActivityLog[];
  onOpenSync: () => void;
  onSelectStage: (stage: string) => void;
}

const STAGES_ORDER: { stage: PipelineStage; category: 'lead' | 'ops' | 'done' }[] = [
  { stage: 'New Leads', category: 'lead' },
  { stage: 'Follow Up', category: 'lead' },
  { stage: 'Converted', category: 'lead' },
  { stage: 'Quotation', category: 'lead' },
  { stage: 'Documentation', category: 'lead' },
  { stage: 'Registration', category: 'ops' },
  { stage: 'Loan', category: 'ops' },
  { stage: 'Survey', category: 'ops' },
  { stage: 'Material Dispatch', category: 'ops' },
  { stage: 'Installation', category: 'ops' },
  { stage: 'Inspection', category: 'ops' },
  { stage: 'Net Meter', category: 'ops' },
  { stage: 'Connection', category: 'ops' },
  { stage: 'Complete', category: 'done' },
  { stage: 'Lost', category: 'done' },
];

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  leads,
  activityLogs,
  onOpenSync,
  onSelectStage,
}) => {
  const totalLeads = leads.length;
  const completedCount = leads.filter((l) => l.status === 'Complete').length;
  const convertedCount = leads.filter((l) =>
    ['Converted', 'Registration', 'Loan', 'Survey', 'Material Dispatch', 'Installation', 'Inspection', 'Net Meter', 'Connection', 'Complete'].includes(l.status)
  ).length;

  const totalDues = leads.reduce((acc, l) => acc + (l.duePayment || 0), 0);

  // Group by sales rep
  const salesMap = new Map<string, { count: number; converted: number; dues: number; email: string }>();
  leads.forEach((l) => {
    const rep = l.salesPerson || 'Unassigned';
    const cur = salesMap.get(rep) || { count: 0, converted: 0, dues: 0, email: l.salesEmail || '' };
    cur.count += 1;
    if (['Converted', 'Installation', 'Complete'].includes(l.status)) {
      cur.converted += 1;
    }
    cur.dues += l.duePayment || 0;
    salesMap.set(rep, cur);
  });

  const salesLeaderboard = Array.from(salesMap.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Main Project Sheet & Executive Dashboard</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight">DCPL Solar Operations Overview</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Live centralized view linking your Google Sheet with field sales, technical site installations, and accounts collection.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenSync}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-900 bg-white hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-indigo-600" />
            <span>Sync Google Sheet</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <span className="text-xs font-medium text-slate-500">Total Project Inquiries</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-slate-900 mt-1">
            {totalLeads}
          </div>
          <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
            <span>In Google Sheet database</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-emerald-200 shadow-xs">
          <span className="text-xs font-medium text-emerald-700">Converted & In-Progress</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-emerald-900 mt-1">
            {convertedCount}
          </div>
          <div className="text-xs text-emerald-700 mt-1">
            {((convertedCount / (totalLeads || 1)) * 100).toFixed(0)}% conversion rate
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-rose-200 shadow-xs">
          <span className="text-xs font-medium text-rose-700">Outstanding Payment Dues</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-rose-900 mt-1">
            ₹{totalDues.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-rose-700 mt-1">Col I pending collection</div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-indigo-200 shadow-xs">
          <span className="text-xs font-medium text-indigo-700">Fully Commissioned</span>
          <div className="text-2xl font-bold font-mono tabular-nums text-indigo-900 mt-1">
            {completedCount}
          </div>
          <div className="text-xs text-indigo-700 mt-1">Subsidy & Net Meter complete</div>
        </div>
      </div>

      {/* 15-Stage Pipeline Funnel Matrix */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              15-Stage Workflow Pipeline Distribution
            </h3>
            <p className="text-[11px] text-slate-500">
              Click any stage to filter and view leads in that specific phase.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
          {STAGES_ORDER.map(({ stage }) => {
            const count = leads.filter((l) => l.status === stage).length;
            const stageDues = leads
              .filter((l) => l.status === stage)
              .reduce((acc, curr) => acc + (curr.duePayment || 0), 0);

            return (
              <div
                key={stage}
                onClick={() => onSelectStage(stage)}
                className="p-3 bg-slate-50 hover:bg-slate-100/90 rounded-xl border border-slate-200/80 transition-all cursor-pointer group"
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                    {stage}
                  </span>
                  <span className="font-mono tabular-nums font-bold text-slate-900 px-1.5 py-0.2 rounded bg-white border border-slate-200 text-[11px]">
                    {count}
                  </span>
                </div>
                {stageDues > 0 ? (
                  <div className="text-[10px] text-rose-600 font-mono tabular-nums">
                    ₹{(stageDues / 1000).toFixed(0)}k due
                  </div>
                ) : (
                  <div className="text-[10px] text-slate-400 font-mono">0 pending dues</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Two Column Section: Sales Performance & Recent Team Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Sales Performance */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-600" />
              <span>Sales & Engineering Reps Performance</span>
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">{salesLeaderboard.length} Active</span>
          </div>

          <div className="space-y-3">
            {salesLeaderboard.map((rep) => (
              <div key={rep.name} className="p-3 bg-slate-50/70 rounded-lg border border-slate-100 flex items-center justify-between gap-2 text-xs">
                <div>
                  <div className="font-semibold text-slate-900">{rep.name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">{rep.email}</div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div>
                    <div className="font-mono tabular-nums font-bold text-slate-800">{rep.count} Leads</div>
                    <div className="text-[10px] text-emerald-600 font-medium">{rep.converted} Converted</div>
                  </div>
                  {rep.dues > 0 && (
                    <div className="font-mono tabular-nums text-rose-600 font-semibold text-[11px]">
                      ₹{(rep.dues / 1000).toFixed(0)}k due
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Activity Stream */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-600" />
              <span>Recent Team Activities & Sheet Updates</span>
            </h3>
            <span className="text-[11px] text-slate-400">Live</span>
          </div>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
            {activityLogs.slice(0, 5).map((log) => (
              <div key={log.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100 flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 font-medium text-slate-900">
                    <span>{log.userName}</span>
                    <span className="text-[10px] text-slate-400">· {log.userRole}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">{log.details}</p>
                </div>
                <span className="text-[10px] text-slate-400 font-mono tabular-nums shrink-0">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
