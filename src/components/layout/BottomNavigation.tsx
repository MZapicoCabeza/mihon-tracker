import React from 'react';
import { Home, BookOpen, BarChart3 } from 'lucide-react';

export type TabType = 'dashboard' | 'library' | 'stats';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenSyncModal?: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
}) => {
  return (
    <nav className="fixed bottom-4 left-0 right-0 z-40 max-w-md mx-auto px-6 pointer-events-none">
      <div className="pointer-events-auto bg-[#1C1236]/94 backdrop-blur-2xl border border-white/10 rounded-full px-3 py-2 shadow-[0_20px_50px_rgba(25,12,48,0.38)] flex items-center justify-around">
        {/* Inicio */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center gap-1.5 py-2 px-4 rounded-full transition-all duration-300 cursor-pointer ${
            currentTab === 'dashboard'
              ? 'bg-white/15 text-white shadow-inner font-bold'
              : 'text-white/60 hover:text-white/90 font-medium'
          }`}
        >
          <Home className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-[#C084FC]' : 'text-white/60'}`} />
          <span className="text-xs tracking-tight">Inicio</span>
        </button>

        {/* Biblioteca */}
        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center gap-1.5 py-2 px-4 rounded-full transition-all duration-300 cursor-pointer ${
            currentTab === 'library'
              ? 'bg-white/15 text-white shadow-inner font-bold'
              : 'text-white/60 hover:text-white/90 font-medium'
          }`}
        >
          <BookOpen className={`w-4 h-4 ${currentTab === 'library' ? 'text-[#C084FC]' : 'text-white/60'}`} />
          <span className="text-xs tracking-tight">Biblioteca</span>
        </button>

        {/* Métricas & Historia */}
        <button
          onClick={() => onTabChange('stats')}
          className={`flex items-center gap-1.5 py-2 px-4 rounded-full transition-all duration-300 cursor-pointer ${
            currentTab === 'stats'
              ? 'bg-white/15 text-white shadow-inner font-bold'
              : 'text-white/60 hover:text-white/90 font-medium'
          }`}
        >
          <BarChart3 className={`w-4 h-4 ${currentTab === 'stats' ? 'text-[#C084FC]' : 'text-white/60'}`} />
          <span className="text-xs tracking-tight">Historia</span>
        </button>
      </div>
    </nav>
  );
};
