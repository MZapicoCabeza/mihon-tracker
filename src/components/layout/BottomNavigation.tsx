import React from 'react';
import { Home, BookOpen, BarChart3, Radio } from 'lucide-react';

export type TabType = 'dashboard' | 'library' | 'stats';

interface BottomNavigationProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
  onOpenWebhookModal: () => void;
}

export const BottomNavigation: React.FC<BottomNavigationProps> = ({
  currentTab,
  onTabChange,
  onOpenWebhookModal,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 max-w-md mx-auto px-4 pb-5 pt-2">
      <div className="bg-[#151128]/90 backdrop-blur-xl border border-purple-900/40 rounded-2xl p-1.5 shadow-[0_10px_30px_rgba(0,0,0,0.5),0_0_20px_rgba(139,92,246,0.15)] flex items-center justify-around">
        <button
          onClick={() => onTabChange('dashboard')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-300 relative ${
            currentTab === 'dashboard'
              ? 'text-purple-300 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {currentTab === 'dashboard' && (
            <div className="absolute inset-0 bg-purple-600/20 rounded-xl border border-purple-500/30 blur-[1px]" />
          )}
          <Home className={`w-5 h-5 relative z-10 transition-transform ${currentTab === 'dashboard' ? 'scale-110 text-purple-400' : ''}`} />
          <span className="text-[11px] font-medium relative z-10">Inicio</span>
        </button>

        <button
          onClick={() => onTabChange('library')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-300 relative ${
            currentTab === 'library'
              ? 'text-purple-300 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {currentTab === 'library' && (
            <div className="absolute inset-0 bg-purple-600/20 rounded-xl border border-purple-500/30 blur-[1px]" />
          )}
          <BookOpen className={`w-5 h-5 relative z-10 transition-transform ${currentTab === 'library' ? 'scale-110 text-purple-400' : ''}`} />
          <span className="text-[11px] font-medium relative z-10">Biblioteca</span>
        </button>

        <button
          onClick={() => onTabChange('stats')}
          className={`flex flex-col items-center gap-1 py-1.5 px-4 rounded-xl transition-all duration-300 relative ${
            currentTab === 'stats'
              ? 'text-purple-300 font-bold'
              : 'text-gray-400 hover:text-gray-200'
          }`}
        >
          {currentTab === 'stats' && (
            <div className="absolute inset-0 bg-purple-600/20 rounded-xl border border-purple-500/30 blur-[1px]" />
          )}
          <BarChart3 className={`w-5 h-5 relative z-10 transition-transform ${currentTab === 'stats' ? 'scale-110 text-purple-400' : ''}`} />
          <span className="text-[11px] font-medium relative z-10">Estadísticas</span>
        </button>

        {/* Sync / Mihon Webhook Simulator Button */}
        <button
          onClick={onOpenWebhookModal}
          title="Simulador de Webhook Mihon"
          className="flex flex-col items-center gap-1 py-1.5 px-3 rounded-xl text-purple-400 hover:text-purple-200 hover:bg-purple-950/40 transition-all border border-purple-800/40 bg-purple-950/20"
        >
          <div className="relative">
            <Radio className="w-5 h-5" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-emerald-400 rounded-full" />
          </div>
          <span className="text-[10px] font-medium text-purple-300">Sync</span>
        </button>
      </div>
    </nav>
  );
};
