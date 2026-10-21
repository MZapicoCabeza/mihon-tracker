import React from 'react';
import { Home, BookOpen, BarChart3, Settings2 } from 'lucide-react';

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
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-5 pt-2">
      <div className="bg-[#F8C866] border-[1.8px] border-[#2D2926] rounded-full p-2 shadow-[0_6px_0px_#2D2926] flex items-center justify-around">
        {/* Inicio */}
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-full transition-all duration-200 ${
            currentTab === 'dashboard'
              ? 'bg-[#2D2926] text-[#FAF7F2] font-bold shadow-sm'
              : 'text-[#2D2926] hover:bg-[#F2BC50] font-semibold'
          }`}
        >
          <Home className="w-5 h-5 stroke-[2.2]" />
          {currentTab === 'dashboard' && (
            <span className="text-xs tracking-tight font-extrabold">Inicio</span>
          )}
        </button>

        {/* Biblioteca */}
        <button
          onClick={() => onTabChange('library')}
          className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-full transition-all duration-200 ${
            currentTab === 'library'
              ? 'bg-[#2D2926] text-[#FAF7F2] font-bold shadow-sm'
              : 'text-[#2D2926] hover:bg-[#F2BC50] font-semibold'
          }`}
        >
          <BookOpen className="w-5 h-5 stroke-[2.2]" />
          {currentTab === 'library' && (
            <span className="text-xs tracking-tight font-extrabold">Biblioteca</span>
          )}
        </button>

        {/* Estadísticas */}
        <button
          onClick={() => onTabChange('stats')}
          className={`flex items-center justify-center gap-1.5 py-2 px-4 rounded-full transition-all duration-200 ${
            currentTab === 'stats'
              ? 'bg-[#2D2926] text-[#FAF7F2] font-bold shadow-sm'
              : 'text-[#2D2926] hover:bg-[#F2BC50] font-semibold'
          }`}
        >
          <BarChart3 className="w-5 h-5 stroke-[2.2]" />
          {currentTab === 'stats' && (
            <span className="text-xs tracking-tight font-extrabold">Métricas</span>
          )}
        </button>

        {/* Sincronización y Ajustes */}
        <button
          onClick={onOpenSyncModal}
          title="Sincronización & Ajustes de Servidor"
          className="flex items-center justify-center p-2 rounded-full text-[#2D2926] hover:bg-[#F2BC50] transition-colors relative"
        >
          <Settings2 className="w-5 h-5 stroke-[2.2]" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#52796F] rounded-full border border-[#FAF7F2]" />
        </button>
      </div>
    </nav>
  );
};
