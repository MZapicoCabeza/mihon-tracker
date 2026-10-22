import React from 'react';
import { Home, BookOpen, BarChart3, RefreshCw } from 'lucide-react';

export type TabType = 'dashboard' | 'library' | 'stats';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSyncModal: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenSyncModal,
}) => {
  return (
    <nav className="fixed bottom-4 left-0 right-0 z-40 max-w-md mx-auto px-4 pointer-events-none">
      <div className="pointer-events-auto bg-[#1C1236]/92 backdrop-blur-2xl border border-white/10 rounded-full px-3 py-2 shadow-[0_20px_50px_rgba(25,12,48,0.38)] flex items-center justify-between">
        {/* Inicio */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all duration-300 ${
            currentTab === 'dashboard'
              ? 'bg-white/15 text-white shadow-inner font-bold'
              : 'text-white/60 hover:text-white/90 font-medium'
          }`}
        >
          <Home className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-[#C084FC]' : 'text-white/60'}`} />
          {currentTab === 'dashboard' && (
            <span className="text-xs tracking-tight">Inicio</span>
          )}
        </button>

        {/* Biblioteca */}
        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all duration-300 ${
            currentTab === 'library'
              ? 'bg-white/15 text-white shadow-inner font-bold'
              : 'text-white/60 hover:text-white/90 font-medium'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${currentTab === 'library' ? 'text-[#C084FC]' : 'text-white/60'}`} />
          {currentTab === 'library' && (
            <span className="text-xs tracking-tight">Biblioteca</span>
          )}
        </button>

        {/* Center Glowing Action Button (Sync / Quick Action) */}
        <button
          onClick={onOpenSyncModal}
          title="Sincronizar con Mihon"
          className="relative -my-1 w-11 h-11 rounded-full bg-gradient-to-tr from-[#9333EA] via-[#D946EF] to-[#F59E0B] flex items-center justify-center text-white shadow-lg shadow-purple-500/40 hover:scale-105 active:scale-95 transition-all group"
        >
          <RefreshCw className="w-4 h-4 group-hover:rotate-180 transition-transform duration-500" />
          <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-[#10B981] rounded-full border-2 border-[#1C1236]" />
        </button>

        {/* Métricas & Historia */}
        <button
          onClick={() => onTabChange('stats')}
          className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all duration-300 ${
            currentTab === 'stats'
              ? 'bg-white/15 text-white shadow-inner font-bold'
              : 'text-white/60 hover:text-white/90 font-medium'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${currentTab === 'stats' ? 'text-[#C084FC]' : 'text-white/60'}`} />
          {currentTab === 'stats' && (
            <span className="text-xs tracking-tight">Historia</span>
          )}
        </button>
      </div>
    </nav>
  );
};
