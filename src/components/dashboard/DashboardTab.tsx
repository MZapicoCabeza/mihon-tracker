import React, { useState } from 'react';
import {
  Flame,
  Clock,
  Sparkles,
  ChevronRight,
  BookOpen,
  Trophy,
  RefreshCw,
  Calendar as CalendarIcon,
  Zap,
  Bookmark,
  Heart,
} from 'lucide-react';
import { WeeklyChart } from '../charts/WeeklyChart';
import { MangaDetailModal } from '../library/MangaDetailModal';
import { ReaderWrappedModal } from '../statistics/ReaderWrappedModal';
import { MangaItem, ReadingHistoryEvent, ReadingStats, MangaStatus } from '../../types/tracker';
import { formatRelativeTimeSpanish } from '../../utils/dateUtils';
import { getCoverSrc } from '../../utils/coverUtils';

interface DashboardTabProps {
  stats: ReadingStats;
  recentEvents: ReadingHistoryEvent[];
  mangas: MangaItem[];
  onSelectManga: (mangaId: string) => void;
  onOpenSyncModal: () => void;
  onOpenDownloadModal: () => void;
  onNavigateTab?: (tab: 'dashboard' | 'library' | 'stats') => void;
  onToggleFavorite?: (id: string) => void;
  onUpdateStatus?: (id: string, status: MangaStatus) => void;
  onDeletePermanently?: (id: string) => void;
  onRefreshData?: () => Promise<void>;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  recentEvents,
  mangas,
  onSelectManga,
  onOpenSyncModal,
  onNavigateTab = () => {},
  onToggleFavorite = () => {},
  onUpdateStatus = () => {},
  onDeletePermanently,
  onRefreshData,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(6); // Default to today
  const [selectedManga, setSelectedManga] = useState<MangaItem | null>(null);
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSyncClick = async () => {
    if (onRefreshData) {
      setIsSyncing(true);
      try {
        await onRefreshData();
      } finally {
        setIsSyncing(false);
      }
    } else {
      onOpenSyncModal();
    }
  };

  const weeklyDays = stats.weeklyActivity.length === 7
    ? stats.weeklyActivity
    : [
        { day: 'Lunes', shortDay: 'Lun', chapters: 0, date: '' },
        { day: 'Martes', shortDay: 'Mar', chapters: 0, date: '' },
        { day: 'Miércoles', shortDay: 'Mié', chapters: 0, date: '' },
        { day: 'Jueves', shortDay: 'Jue', chapters: 0, date: '' },
        { day: 'Viernes', shortDay: 'Vie', chapters: 0, date: '' },
        { day: 'Sábado', shortDay: 'Sáb', chapters: 0, date: '' },
        { day: 'Domingo', shortDay: 'Dom', chapters: 0, date: '' },
      ];

  const totalWeekly = stats.weeklyActivity.reduce((acc, curr) => acc + curr.chapters, 0);
  const activeDay = weeklyDays[selectedDayIndex] || weeklyDays[weeklyDays.length - 1];

  const handleMangaCardClick = (mangaId: string, mangaTitle?: string) => {
    let found = mangas.find((m) => m.id === mangaId);
    if (!found && mangaTitle) {
      found = mangas.find(
        (m) => m.title.toLowerCase().trim() === mangaTitle.toLowerCase().trim()
      );
    }
    if (found) {
      setSelectedManga(found);
    } else {
      onSelectManga(mangaId);
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header Card inspired by Reference Image */}
      <div className="pt-2 px-1">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#8B5CF6] to-[#EC4899] p-0.5 shadow-sm shadow-purple-500/20">
              <div className="w-full h-full rounded-full bg-white flex items-center justify-center text-sm font-black text-[#7C3AED]">
                📖
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider block">
                Mihon Tracker Cloud
              </span>
              <h1 className="text-xl font-black text-[#1E1238] tracking-tight leading-none">
                Hola, Lectora 👋
              </h1>
            </div>
          </div>

          {/* Sync Pill */}
          <button
            onClick={handleSyncClick}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-[#E9D5FF] text-xs font-bold text-[#7C3AED] shadow-xs hover:bg-[#F3E8FF] active:scale-95 transition-all disabled:opacity-60 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
          </button>
        </div>

        {/* Two Large Vibrant Cards (Like "Create Note" & "Create Task" in Reference) */}
        <div className="grid grid-cols-2 gap-3 mb-2">
          {/* Card 1: Mi Historia */}
          <div
            onClick={() => onNavigateTab('stats')}
            className="rounded-3xl p-4 text-white bg-gradient-to-tr from-[#8B5CF6] to-[#C026D3] shadow-md shadow-purple-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-sm">
                👑
              </span>
              <span className="text-[10px] font-black uppercase text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
                {stats.yearsActiveLabel || '2 años'}
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white">Mi Historia</h3>
              <p className="text-xs text-white/80 font-medium">
                {stats.totalChaptersRead} caps leídos
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-white/90 pt-1 border-t border-white/15">
              <span>Ver Hitos</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </div>
          </div>

          {/* Card 2: Racha */}
          <div
            onClick={() => setIsWrappedOpen(true)}
            className="rounded-3xl p-4 text-white bg-gradient-to-tr from-[#F59E0B] to-[#F97316] shadow-md shadow-amber-500/20 cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all space-y-3 relative overflow-hidden"
          >
            <div className="flex items-center justify-between">
              <span className="w-8 h-8 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-sm">
                🔥
              </span>
              <span className="text-[10px] font-black uppercase text-white/80 bg-white/15 px-2 py-0.5 rounded-full">
                Racha
              </span>
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {stats.currentStreakDays} Días Activos
              </h3>
              <p className="text-xs text-white/80 font-medium">
                Récord: {stats.longestStreakDays || 17} días
              </p>
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-white/90 pt-1 border-t border-white/15">
              <span>Tu Wrapped</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Daily Activity Card (Directly inspired by top-left card in reference image) */}
      <div className="glass-card p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-[#7C3AED]" />
              <h3 className="text-sm font-black text-[#1E1238]">Actividad Diaria</h3>
            </div>
            <p className="text-[11px] font-medium text-[#6B7280]">
              {activeDay?.day || 'Hoy'} • {activeDay?.date || 'Sesión en curso'}
            </p>
          </div>

          <span className="text-xs font-black text-[#7C3AED] bg-[#F3E8FF] px-2.5 py-1 rounded-full">
            {activeDay?.chapters || 0} capítulos
          </span>
        </div>

        {/* Counter numbers */}
        <div className="flex items-baseline justify-between pt-1">
          <div>
            <span className="text-3xl font-black text-[#1E1238] tracking-tight">
              {totalWeekly}
            </span>
            <span className="text-xs font-bold text-[#6B7280] ml-1.5">caps esta semana</span>
          </div>
          <span className="text-xs font-black text-[#10B981] bg-[#ECFDF5] px-2 py-0.5 rounded-full">
            {stats.weeklyComparison ? `${stats.weeklyComparison.percentDiff >= 0 ? '+' : ''}${stats.weeklyComparison.percentDiff}% vs ant.` : '+38%'}
          </span>
        </div>

        {/* Multi-color segmented progress bar from Reference Image */}
        <div className="w-full h-3.5 rounded-full bg-[#F3EFFC] overflow-hidden flex p-0.5 gap-0.5">
          <div className="h-full rounded-l-full bg-[#67E8F9]" style={{ width: '25%' }} />
          <div className="h-full bg-[#C084FC]" style={{ width: '35%' }} />
          <div className="h-full bg-[#FDE047]" style={{ width: '20%' }} />
          <div className="h-full rounded-r-full bg-[#F472B6]" style={{ width: '20%' }} />
        </div>

        {/* Days of week horizontal selector */}
        <div className="grid grid-cols-7 gap-1.5 pt-1">
          {weeklyDays.map((item, idx) => {
            const isSelected = idx === selectedDayIndex;
            return (
              <button
                key={item.date || idx}
                onClick={() => setSelectedDayIndex(idx)}
                className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-[#7C3AED] text-white shadow-md shadow-purple-500/25 scale-105'
                    : 'bg-[#F7F5FC] text-[#6B7280] hover:bg-[#F3E8FF]'
                }`}
              >
                <span className="text-[9px] font-bold uppercase">{item.shortDay}</span>
                <span className="text-xs font-black mt-0.5">{item.chapters}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Quick Action Navigation Buttons */}
      <div className="grid grid-cols-4 gap-2 px-1 text-center">
        <button
          onClick={() => onNavigateTab('library')}
          className="p-3 rounded-2xl bg-white border border-[#E9D5FF]/70 shadow-2xs hover:border-[#8B5CF6] transition-all"
        >
          <BookOpen className="w-5 h-5 text-[#8B5CF6] mx-auto mb-1" />
          <span className="text-[10px] font-black text-[#1E1238] block leading-tight">Biblioteca</span>
          <span className="text-[9px] text-[#6B7280] font-semibold">{mangas.length} obras</span>
        </button>

        <button
          onClick={() => onNavigateTab('stats')}
          className="p-3 rounded-2xl bg-white border border-[#E9D5FF]/70 shadow-2xs hover:border-[#EC4899] transition-all"
        >
          <Trophy className="w-5 h-5 text-[#EC4899] mx-auto mb-1" />
          <span className="text-[10px] font-black text-[#1E1238] block leading-tight">Podio</span>
          <span className="text-[9px] text-[#6B7280] font-semibold">Fidelidad</span>
        </button>

        <button
          onClick={() => onNavigateTab('stats')}
          className="p-3 rounded-2xl bg-white border border-[#E9D5FF]/70 shadow-2xs hover:border-[#F59E0B] transition-all"
        >
          <CalendarIcon className="w-5 h-5 text-[#F59E0B] mx-auto mb-1" />
          <span className="text-[10px] font-black text-[#1E1238] block leading-tight">GitHub</span>
          <span className="text-[9px] text-[#6B7280] font-semibold">Calendario</span>
        </button>

        <button
          onClick={() => setIsWrappedOpen(true)}
          className="p-3 rounded-2xl bg-white border border-[#E9D5FF]/70 shadow-2xs hover:border-[#10B981] transition-all"
        >
          <Sparkles className="w-5 h-5 text-[#10B981] mx-auto mb-1" />
          <span className="text-[10px] font-black text-[#1E1238] block leading-tight">Wrapped</span>
          <span className="text-[9px] text-[#6B7280] font-semibold">Tu Historia</span>
        </button>
      </div>

      {/* Recently Read Section */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-sm font-black text-[#1E1238] uppercase tracking-wider flex items-center gap-1.5">
              <span>Lecturas Recientes</span>
              <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            </h2>
            <p className="text-[11px] font-medium text-[#6B7280]">Capítulos sincronizados automáticamente</p>
          </div>
          <span className="text-[11px] font-bold text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
            Mihon Sync
          </span>
        </div>

        {recentEvents.length === 0 ? (
          <div className="glass-card p-6 text-center space-y-1">
            <span className="text-2xl">📚</span>
            <p className="text-xs font-black text-[#1E1238]">Sin lecturas recientes todavía</p>
            <p className="text-[11px] text-[#6B7280]">
              Los capítulos que leas en Mihon aparecerán aquí en vivo.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {recentEvents.slice(0, 8).map((event) => {
              const correspondingManga = mangas.find((m) => m.id === event.manga_id);
              return (
                <div
                  key={event.id}
                  onClick={() => handleMangaCardClick(event.manga_id, event.manga_title)}
                  className="glass-card p-3 flex items-center gap-3.5 hover:shadow-md hover:border-[#C4B5FD] transition-all cursor-pointer group"
                >
                  {/* Cover */}
                  <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#EDE9FE] to-[#F3EFFC] border border-purple-100 shadow-2xs">
                    {getCoverSrc(correspondingManga?.coverUrl || event.cover_url) ? (
                      <img
                        src={getCoverSrc(correspondingManga?.coverUrl || event.cover_url)}
                        alt={event.manga_title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent) {
                            const fallback = parent.querySelector('.cover-dash-fallback');
                            if (fallback) fallback.classList.remove('hidden');
                          }
                        }}
                      />
                    ) : null}
                    <div
                      className={`cover-dash-fallback absolute inset-0 flex items-center justify-center text-xl bg-[#EDE9FE] ${
                        getCoverSrc(correspondingManga?.coverUrl || event.cover_url) ? 'hidden' : ''
                      }`}
                    >
                      📖
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-black text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
                        Cap. {event.chapter_number}
                      </span>
                      {correspondingManga?.readingMonths ? (
                        <span className="text-[9px] font-black text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full">
                          ⏱️ {correspondingManga.readingMonths}m
                        </span>
                      ) : null}
                    </div>

                    <h3 className="text-sm font-black text-[#1E1238] truncate group-hover:text-[#7C3AED] transition-colors">
                      {event.manga_title}
                    </h3>

                    <div className="flex items-center gap-1 text-[11px] font-semibold text-[#6B7280] mt-0.5">
                      <Clock className="w-3 h-3 text-[#9CA3AF]" />
                      <span>{formatRelativeTimeSpanish(event.timestamp)}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className="w-7 h-7 rounded-full bg-[#F7F5FC] flex items-center justify-center text-[#6B7280] group-hover:text-[#7C3AED] group-hover:translate-x-0.5 transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Manga Detail Modal */}
      <MangaDetailModal
        manga={selectedManga}
        onClose={() => setSelectedManga(null)}
        onToggleFavorite={onToggleFavorite}
        onUpdateStatus={onUpdateStatus}
        onDeletePermanently={onDeletePermanently}
      />

      {/* Reader Wrapped Modal */}
      {isWrappedOpen && (
        <ReaderWrappedModal
          stats={stats}
          mangas={mangas}
          onClose={() => setIsWrappedOpen(false)}
        />
      )}
    </div>
  );
};
