import React from 'react';
import { PipelineStage, Lead, ViewMode, User } from '../types/crm';
import { 
  Sparkles, 
  PhoneCall, 
  Trophy, 
  FileText, 
  Folder, 
  Layers, 
  FileSignature, 
  Building2, 
  Search, 
  Truck, 
  Wrench, 
  ClipboardCheck, 
  Zap, 
  Plug, 
  CheckSquare, 
  XCircle, 
  CreditCard, 
  BarChart3,
  Users,
  ShieldCheck,
  X
} from 'lucide-react';
import { getVisibleStagesForRole, isAdmin, isSales, isOperations } from '../constants/pipeline';

interface SidebarProps {
  currentView: ViewMode;
  selectedStage: string;
  onSelectViewOrStage: (view: ViewMode, stage?: string) => void;
  leads: Lead[];
  currentUser: User;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  selectedStage,
  onSelectViewOrStage,
  leads,
  currentUser,
  isOpenOnMobile,
  onCloseMobile,
}) => {
  const visibleStages = getVisibleStagesForRole(currentUser.role);
  const userIsAdmin = isAdmin(currentUser.role);
  const userIsSales = isSales(currentUser.role);
  const userIsOps = isOperations(currentUser.role);

  const countForStage = (stage: PipelineStage) => {
    return leads.filter((l) => l.status === stage).length;
  };

  const duesCount = leads.filter((l) => (l.duePayment || 0) > 0).length;

  // Base stage definitions
  const salesItems = [
    { label: 'New Leads', stage: 'New Leads' as PipelineStage, icon: <Sparkles className="w-4 h-4 text-amber-500" /> },
    { label: 'Follow Up', stage: 'Follow Up' as PipelineStage, icon: <PhoneCall className="w-4 h-4 text-blue-500" /> },
    { label: 'Converted', stage: 'Converted' as PipelineStage, icon: <Trophy className="w-4 h-4 text-emerald-500" /> },
    { label: 'Quotation', stage: 'Quotation' as PipelineStage, icon: <FileText className="w-4 h-4 text-indigo-500" /> },
    { label: 'Documentation', stage: 'Documentation' as PipelineStage, icon: <Folder className="w-4 h-4 text-amber-600" /> },
  ].filter((item) => visibleStages.includes(item.stage));

  const opsItems = [
    { label: 'Registration', stage: 'Registration' as PipelineStage, icon: <FileSignature className="w-4 h-4 text-purple-500" /> },
    { label: 'Loan', stage: 'Loan' as PipelineStage, icon: <Building2 className="w-4 h-4 text-cyan-600" /> },
    { label: 'Survey', stage: 'Survey' as PipelineStage, icon: <Search className="w-4 h-4 text-blue-600" /> },
    { label: 'Material Dispatch', stage: 'Material Dispatch' as PipelineStage, icon: <Truck className="w-4 h-4 text-orange-500" /> },
    { label: 'Installation', stage: 'Installation' as PipelineStage, icon: <Wrench className="w-4 h-4 text-slate-600" /> },
    { label: 'Inspection', stage: 'Inspection' as PipelineStage, icon: <ClipboardCheck className="w-4 h-4 text-teal-600" /> },
    { label: 'Net Meter', stage: 'Net Meter' as PipelineStage, icon: <Zap className="w-4 h-4 text-yellow-500" /> },
    { label: 'Connection', stage: 'Connection' as PipelineStage, icon: <Plug className="w-4 h-4 text-slate-800" /> },
  ].filter((item) => visibleStages.includes(item.stage));

  const outcomeItems = [
    { label: 'Complete', stage: 'Complete' as PipelineStage, icon: <CheckSquare className="w-4 h-4 text-emerald-600" /> },
    { label: 'Lost', stage: 'Lost' as PipelineStage, icon: <XCircle className="w-4 h-4 text-rose-500" /> },
  ].filter((item) => visibleStages.includes(item.stage));

  // Build role-based menu sections
  const menuSections: {
    title: string;
    items: Array<{
      label: string;
      stage?: PipelineStage;
      view?: ViewMode;
      icon: React.ReactNode;
      count?: number;
    }>;
  }[] = [];

  // 1. Sales section (if stages are visible for role)
  if (salesItems.length > 0) {
    menuSections.push({
      title: userIsSales ? 'My Sales Pipeline' : 'Sales & Conversion',
      items: salesItems,
    });
  }

  // 2. Operations section (if stages are visible for role)
  if (opsItems.length > 0) {
    menuSections.push({
      title: userIsOps ? 'My Execution Pipeline' : 'Operations & Execution',
      items: opsItems,
    });
  }

  // 3. Outcome section (Admin or Ops)
  if (outcomeItems.length > 0) {
    menuSections.push({
      title: 'Project Outcome',
      items: outcomeItems,
    });
  }

  // 4. Data & Views (Adjusted per role)
  menuSections.push({
    title: 'Data & Analytics',
    items: [
      { 
        label: userIsSales ? 'My Assigned Leads' : 'All Data', 
        view: 'table' as ViewMode, 
        icon: <Layers className="w-4 h-4 text-slate-600" />, 
        count: leads.length 
      },
      ...(!userIsSales ? [{ 
        label: 'Payment Details', 
        view: 'payments' as ViewMode, 
        icon: <CreditCard className="w-4 h-4 text-amber-600" />, 
        count: duesCount 
      }] : []),
      { 
        label: 'Project Overview', 
        view: 'dashboard' as ViewMode, 
        icon: <BarChart3 className="w-4 h-4 text-indigo-600" /> 
      },
    ],
  });

  // 5. Administration (ONLY for Admin)
  if (userIsAdmin) {
    menuSections.push({
      title: 'Administration',
      items: [
        { 
          label: 'Team & Permissions', 
          view: 'users' as ViewMode, 
          icon: <Users className="w-4 h-4 text-slate-700" /> 
        },
      ],
    });
  }

  const content = (
    <div className="flex flex-col justify-between h-full p-3 select-none">
      <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-8rem)] pr-1">
        {/* Mobile Header with Close button */}
        <div className="flex md:hidden items-center justify-between pb-2 border-b border-slate-100">
          <span className="font-bold text-slate-900 text-sm">DCPL Solar Pipeline</span>
          <button
            onClick={onCloseMobile}
            className="p-1 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Role Notice Tag */}
        <div className="px-2.5 py-1.5 bg-slate-100 rounded-lg flex items-center justify-between border border-slate-200 text-[11px]">
          <span className="text-slate-500 font-medium">Logged Role:</span>
          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
            userIsAdmin 
              ? 'bg-indigo-100 text-indigo-800' 
              : userIsSales 
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}>
            {currentUser.role}
          </span>
        </div>

        {menuSections.map((section, sIdx) => (
          <div key={sIdx} className="space-y-1">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 pt-1 pb-0.5">
              {section.title}
            </div>

            <div className="space-y-0.5">
              {section.items.map((item, iIdx) => {
                let isActive = false;
                let badgeCount: number | undefined;

                if ('stage' in item && item.stage) {
                  isActive = currentView === 'table' && selectedStage === item.stage;
                  badgeCount = countForStage(item.stage as PipelineStage);
                } else if ('view' in item && item.view) {
                  isActive = currentView === item.view && (item.view !== 'table' || selectedStage === 'All');
                  badgeCount = item.count;
                }

                return (
                  <button
                    key={iIdx}
                    onClick={() => {
                      if ('stage' in item && item.stage) {
                        onSelectViewOrStage('table', item.stage);
                      } else if ('view' in item && item.view) {
                        onSelectViewOrStage(item.view, item.view === 'table' ? 'All' : undefined);
                      }
                      if (onCloseMobile) onCloseMobile();
                    }}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors text-left cursor-pointer group ${
                      isActive
                        ? 'bg-slate-900 text-white font-semibold shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span className="shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </div>

                    {badgeCount !== undefined && badgeCount > 0 && (
                      <span
                        className={`text-[10px] font-mono tabular-nums px-1.5 py-0.2 rounded ${
                          isActive
                            ? 'bg-slate-800 text-slate-200'
                            : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                        }`}
                      >
                        {badgeCount}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* User profile footer */}
      <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <div className="truncate">
          <div className="font-semibold text-slate-900 truncate flex items-center gap-1">
            <span>{currentUser.name}</span>
            {userIsAdmin && <ShieldCheck className="w-3 h-3 text-indigo-600" />}
          </div>
          <div className="text-[10px] text-slate-400 capitalize">{currentUser.email}</div>
        </div>
        <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-1.5 py-0.5 rounded">
          Active
        </span>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-white border-r border-slate-200 flex-col justify-between min-h-[calc(100vh-4rem)]">
        {content}
      </aside>

      {/* Mobile Drawer (Slide-out) */}
      {isOpenOnMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />
          <div className="relative w-72 max-w-[85vw] bg-white h-full shadow-2xl z-10 animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
};
