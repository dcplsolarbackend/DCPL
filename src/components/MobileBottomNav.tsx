import React from 'react';
import { ViewMode } from '../types/crm';
import { 
  BarChart3, 
  Layers, 
  CreditCard, 
  PhoneCall, 
  Menu
} from 'lucide-react';

interface MobileBottomNavProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  onToggleSidebar: () => void;
  todayFollowUpsCount: number;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentView,
  onViewChange,
  onToggleSidebar,
  todayFollowUpsCount,
}) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1.5 flex items-center justify-around shadow-lg">
      <button
        onClick={() => onViewChange('dashboard')}
        className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
          currentView === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-500'
        }`}
      >
        <BarChart3 className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Main Sheet</span>
      </button>

      <button
        onClick={() => onViewChange('table')}
        className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
          currentView === 'table' ? 'text-indigo-600 font-bold' : 'text-slate-500'
        }`}
      >
        <Layers className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">All Data</span>
      </button>

      <button
        onClick={() => onViewChange('payments')}
        className={`flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
          currentView === 'payments' ? 'text-indigo-600 font-bold' : 'text-slate-500'
        }`}
      >
        <CreditCard className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Payments</span>
      </button>

      <button
        onClick={() => onViewChange('followups')}
        className={`relative flex flex-col items-center justify-center p-1 cursor-pointer transition-colors ${
          currentView === 'followups' ? 'text-indigo-600 font-bold' : 'text-slate-500'
        }`}
      >
        <PhoneCall className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">Follow-Ups</span>
        {todayFollowUpsCount > 0 && (
          <span className="absolute top-0 right-1 w-2 h-2 rounded-full bg-amber-500" />
        )}
      </button>

      <button
        onClick={onToggleSidebar}
        className="flex flex-col items-center justify-center p-1 text-slate-500 hover:text-slate-900 cursor-pointer"
      >
        <Menu className="w-5 h-5" />
        <span className="text-[10px] mt-0.5">15 Stages</span>
      </button>
    </nav>
  );
};
