import React from 'react';
import {
  X,
  Home,
  BookOpen,
  BarChart3,
  Trophy,
  Calendar,
  Sparkles,
  RefreshCw,
  Smartphone,
  Download,
  Trash2,
  Clock,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { TabType } from './BottomNavigation';
import { ReadingStats, MangaItem } from '../../types/tracker';

interface LeftDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  onNavigateToStatsSection?: (section: 'actividad' | 'historia' | 'mangas' | 'habitos') => void;
  onNavigateToLibraryFilter?: (filter: 'all' | 'deleted') => void;
  onOpenSyncModal: () => void;
  onOpenDownloadModal: () => void;
  onOpenWrapped: () => void;
  onExportBackup: () => void;
  stats: ReadingStats;
  mangas: MangaItem[];
}

export const LeftDrawer: React.FC<LeftDrawerProps> = ({
  isOpen,
  onClose,
  currentTab,
  onSelectTab,
  onNavigateToStatsSection,
  onNavigateToLibraryFilter,
  onOpenSyncModal,
  onOpenDownloadModal,
  onOpenWrapped,
  onExportBackup,
  stats,
  mangas,
}) => {
  if (!isOpen) return null;

  const totalMangas = mangas.filter((m) => m.status !== 'deleted').length;
  const deletedCount = mangas.filter((m) => m.status === 'deleted').length;
  const readingPaceStr = stats.readingPace?.formattedPace || '4m 24s';

  const handleTabClick = (tab: TabType) => {
    onSelectTab(tab);
    onClose();
  };

  const handleStatsSubClick = (section: 'actividad' | 'historia' | 'mangas') => {
    onSelectTab('stats');
    if (onNavigateToStatsSection) {
      onNavigateToStatsSection(section);
    }
    onClose();
  };

  const handleTrashClick = () => {
    onSelectTab('library');
    if (onNavigateToLibraryFilter) {
      onNavigateToLibraryFilter('deleted');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex animate-fadeIn">
      {/* Semi-transparent backdrop with blur */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out drawer panel from the left */}
      <div className="relative w-80 max-w-[85vw] h-full bg-[#FAF7F2] text-[#1E1238] shadow-2xl flex flex-col z-10 border-r border-[#E9D5FF]/60 overflow-hidden">
        {/* Top safe area spacer matching phone clock/battery */}
        <div className="h-[max(env(safe-area-inset-top,0px),16px)] w-full bg-[#FAF7F2]" />

        {/* Drawer Header */}
        <div className="px-5 py-4 flex items-center justify-between border-b border-[#E9D5FF]/40 bg-white/60 backdrop-blur-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] p-0.5 shadow-sm shadow-purple-500/20">
              <div className="w-full h-full rounded-2xl bg-white flex items-center justify-center text-base">
                📖
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-black text-[#1E1238] tracking-tight">Mihon Tracker</span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" title="En línea" />
              </div>
              <p className="text-[11px] font-bold text-[#7C3AED]">Hola, Lectora 👋</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[#6B7280] hover:text-[#1E1238] hover:bg-[#F3E8FF] transition-all active:scale-95 cursor-pointer"
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body - Scrollable content */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Main Navigation Views */}
          <div className="space-y-1.5">
            <span className="px-2 text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
              Vistas Principales
            </span>

            {/* Inicio */}
            <button
              onClick={() => handleTabClick('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/20'
                  : 'hover:bg-white text-[#1E1238]'
              }`}
            >
              <div className="flex items-center gap-3">
                <Home className="w-4 h-4" />
                <span>Inicio & Resumen</span>
              </div>
              <ChevronRight className={`w-4 h-4 ${currentTab === 'dashboard' ? 'text-white' : 'text-[#6B7280]'}`} />
            </button>

            {/* Biblioteca */}
            <button
              onClick={() => handleTabClick('library')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                currentTab === 'library'
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/20'
                  : 'hover:bg-white text-[#1E1238]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4" />
                <span>Biblioteca</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  currentTab === 'library' ? 'bg-white/20 text-white' : 'bg-[#F3E8FF] text-[#7C3AED]'
                }`}
              >
                {totalMangas}
              </span>
            </button>

            {/* Historia & Métricas */}
            <button
              onClick={() => handleTabClick('stats')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs transition-all cursor-pointer ${
                currentTab === 'stats'
                  ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/20'
                  : 'hover:bg-white text-[#1E1238]'
              }`}
            >
              <div className="flex items-center gap-3">
                <BarChart3 className="w-4 h-4" />
                <span>Historia & Ritmo</span>
              </div>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                  currentTab === 'stats' ? 'bg-white/20 text-white' : 'bg-[#ECFDF5] text-[#065F46]'
                }`}
              >
                {readingPaceStr}
              </span>
            </button>
          </div>

          {/* Quick Access to Sections */}
          <div className="space-y-1.5">
            <span className="px-2 text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
              Análisis & Historia
            </span>

            {/* Mihon Wrapped */}
            <button
              onClick={() => {
                onOpenWrapped();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] bg-gradient-to-r from-amber-50 to-purple-50 border border-amber-200/60 hover:border-amber-300 transition-all cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <span>Tu Mihon Wrapped</span>
              </div>
              <span className="text-[10px] font-black bg-amber-400 text-amber-950 px-2 py-0.5 rounded-full">
                Especial
              </span>
            </button>

            {/* Podio de Fidelidad */}
            <button
              onClick={() => handleStatsSubClick('mangas')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Trophy className="w-4 h-4 text-[#EC4899]" />
                <span>Podio de Fidelidad</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {/* Calendario de Actividad */}
            <button
              onClick={() => handleStatsSubClick('actividad')}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-[#F59E0B]" />
                <span>Calendario de Actividad</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>
          </div>

          {/* Tools & Mihon Settings */}
          <div className="space-y-1.5">
            <span className="px-2 text-[10px] font-black uppercase tracking-wider text-[#6B7280]">
              Herramientas & Mihon
            </span>

            {/* Sincronización */}
            <button
              onClick={() => {
                onOpenSyncModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <RefreshCw className="w-4 h-4 text-[#7C3AED]" />
                <span>Sincronización Cloud</span>
              </div>
              <span className="text-[9px] font-black text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                Turso SQLite
              </span>
            </button>

            {/* Descargar APK v0.21.3 */}
            <button
              onClick={() => {
                onOpenDownloadModal();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Smartphone className="w-4 h-4 text-[#065F46]" />
                <span>Descargar APK Mihon</span>
              </div>
              <span className="text-[9px] font-black text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
                v0.21.3
              </span>
            </button>

            {/* Exportar Respaldo JSON */}
            <button
              onClick={() => {
                onExportBackup();
                onClose();
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Download className="w-4 h-4 text-[#3B82F6]" />
                <span>Exportar Copia JSON</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-[#6B7280]" />
            </button>

            {/* Papelera de Reciclaje */}
            <button
              onClick={handleTrashClick}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl font-bold text-xs text-[#1E1238] hover:bg-white transition-all cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Trash2 className="w-4 h-4 text-[#EF4444]" />
                <span>Papelera de Reciclaje</span>
              </div>
              {deletedCount > 0 && (
                <span className="text-[10px] font-black text-white bg-[#EF4444] px-2 py-0.5 rounded-full">
                  {deletedCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-[#E9D5FF]/40 bg-white/60 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Base de Datos Turso SQLite</span>
            </div>
            <span className="text-[10px] text-[#7C3AED]">v1.2</span>
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-[#6B7280] bg-[#F7F5FC] px-2.5 py-1.5 rounded-xl">
            <Clock className="w-3 h-3 text-[#7C3AED]" />
            <span>Ritmo calculado: ~{readingPaceStr} por capítulo</span>
          </div>
        </div>

        {/* Bottom safe area spacer for gesture navigation bar on mobile */}
        <div className="h-[max(env(safe-area-inset-bottom,0px),12px)] w-full bg-[#FAF7F2]" />
      </div>
    </div>
  );
};
