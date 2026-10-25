import React from 'react';
import { Menu, RefreshCw } from 'lucide-react';
import { TabType } from './BottomNavigation';

interface TopStatusBarProps {
  onOpenDrawer: () => void;
  onSyncClick: () => void;
  isSyncing?: boolean;
  currentTab: TabType;
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  onOpenDrawer,
  onSyncClick,
  isSyncing = false,
  currentTab,
}) => {
  const getTabLabel = () => {
    switch (currentTab) {
      case 'dashboard':
        return 'Inicio';
      case 'library':
        return 'Biblioteca';
      case 'stats':
        return 'Historia & Métricas';
      default:
        return 'Tracker';
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#F7F5FC] border-b border-[#E9D5FF]/50 shadow-2xs">
      {/* 
        Safe area top spacer:
        Isolates the phone's clock, battery, and camera notch/cutout on mobile devices.
        Uses the exact background color #F7F5FC so content never overlaps the status bar.
      */}
      <div className="h-[max(env(safe-area-inset-top,0px),14px)] w-full bg-[#F7F5FC]" />

      {/* Main Top Header Bar */}
      <div className="px-4 py-2 flex items-center justify-between max-w-md mx-auto">
        {/* Left: Hamburger button to open Left Drawer */}
        <button
          onClick={onOpenDrawer}
          className="flex items-center gap-2 p-2 -ml-2 rounded-2xl text-[#1E1238] hover:bg-white active:scale-95 transition-all cursor-pointer"
          aria-label="Abrir menú desplegable"
        >
          <Menu className="w-5 h-5 text-[#7C3AED]" />
          <span className="text-xs font-black text-[#1E1238] hidden sm:inline">Menú</span>
        </button>

        {/* Center: App branding and active view */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] p-0.5 flex items-center justify-center shadow-xs">
            <span className="text-xs">📖</span>
          </div>
          <div className="text-center">
            <span className="text-xs font-black text-[#1E1238] tracking-tight block leading-tight">
              Mihon Tracker
            </span>
            <span className="text-[10px] font-bold text-[#7C3AED] block leading-none">
              {getTabLabel()}
            </span>
          </div>
        </div>

        {/* Right: Cloud Sync Action Pill */}
        <button
          onClick={onSyncClick}
          disabled={isSyncing}
          title="Sincronizar con el servidor y Mihon"
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white border border-[#E9D5FF] text-[11px] font-bold text-[#7C3AED] hover:bg-[#F3E8FF] active:scale-95 transition-all shadow-2xs disabled:opacity-50 cursor-pointer"
        >
          <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
          <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span className="hidden xs:inline">{isSyncing ? '...' : 'Sync'}</span>
        </button>
      </div>
    </header>
  );
};
