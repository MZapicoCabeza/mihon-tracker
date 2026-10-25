import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Heart,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Layers,
  X,
  Clock,
  ArrowUpDown,
  BookOpen,
  Sparkles,
  Flame,
  Radio,
  Trash2,
  RotateCcw,
  AlertCircle,
} from 'lucide-react';
import { MangaItem, MangaStatus } from '../../types/tracker';
import { MangaDetailModal } from './MangaDetailModal';
import { formatRelativeTimeSpanish } from '../../utils/dateUtils';
import { getCoverSrc } from '../../utils/coverUtils';

export { getCoverSrc };

interface LibraryTabProps {
  mangas: MangaItem[];
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: MangaStatus) => void;
  onDeletePermanently?: (id: string) => void;
  onEmptyTrash?: () => void;
  selectedMangaId?: string | null;
  onUpdateChapter?: (id: string, chapter: number) => void;
  initialFilter?: LibraryFilterOption;
}

export type LibraryFilterOption =
  | 'all'
  | 'recent_reading'
  | 'on_hold'
  | 'favorites'
  | 'completed'
  | 'paused'
  | 'deleted';

export type LibrarySortOption =
  | 'unread_longest'
  | 'recent'
  | 'duration'
  | 'progress'
  | 'title';

const RECENCY_THRESHOLD_DAYS = 45;

export const LibraryTab: React.FC<LibraryTabProps> = ({
  mangas,
  onToggleFavorite,
  onUpdateStatus,
  onDeletePermanently,
  onEmptyTrash,
  selectedMangaId,
  onUpdateChapter,
  initialFilter,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<LibraryFilterOption>(initialFilter || 'all');

  useEffect(() => {
    if (initialFilter) {
      setActiveFilter(initialFilter);
    }
  }, [initialFilter]);
  const [sortBy, setSortBy] = useState<LibrarySortOption>('duration');
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectedManga, setSelectedManga] = useState<MangaItem | null>(null);

  // Helper: days since last read
  const getDaysSinceLastRead = (manga: MangaItem): number => {
    if (manga.daysSinceLastRead !== undefined) return manga.daysSinceLastRead;
    const dateStr = manga.lastReadAt || manga.startedAt;
    if (!dateStr) return 9999;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 9999;
    const now = new Date();
    return Math.max(0, Math.round((now.getTime() - d.getTime()) / (1000 * 3600 * 24)));
  };

  const isRecentlyRead = (manga: MangaItem): boolean => {
    return getDaysSinceLastRead(manga) <= RECENCY_THRESHOLD_DAYS;
  };

  // Filter & sort logic
  const filteredMangas = useMemo(() => {
    const list = mangas.filter((manga) => {
      // Trash isolation: deleted items only appear in 'deleted' filter
      if (activeFilter === 'deleted') {
        if (manga.status !== 'deleted') return false;
      } else {
        if (manga.status === 'deleted') return false;
      }

      const matchesSearch =
        manga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manga.genres.some((g) => g.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (manga.author && manga.author.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'all' || activeFilter === 'deleted') return true;
      if (activeFilter === 'favorites') return manga.isFavorite;
      if (activeFilter === 'recent_reading') return isRecentlyRead(manga);
      if (activeFilter === 'on_hold') return !isRecentlyRead(manga);
      if (activeFilter === 'completed') return manga.status === 'completed';
      if (activeFilter === 'paused') return manga.status === 'paused';
      return true;
    });

    return list.sort((a, b) => {
      if (sortBy === 'unread_longest') {
        // Los que más tiempo llevan sin leer primero (mayor daysSinceLastRead)
        const daysA = getDaysSinceLastRead(a);
        const daysB = getDaysSinceLastRead(b);
        return daysB - daysA;
      }
      if (sortBy === 'recent') {
        // Última lectura más reciente primero
        const timeA = new Date(a.lastReadAt || a.startedAt || 0).getTime();
        const timeB = new Date(b.lastReadAt || b.startedAt || 0).getTime();
        return timeB - timeA;
      }
      if (sortBy === 'duration') {
        // Más tiempo leyendo en meses (fidelidad)
        const diff = (b.readingMonths || 0) - (a.readingMonths || 0);
        if (diff !== 0) return diff;
      }
      if (sortBy === 'progress') {
        const progA = a.currentChapter / (a.totalChapters || 1);
        const progB = b.currentChapter / (b.totalChapters || 1);
        const diff = progB - progA;
        if (diff !== 0) return diff;
      }
      if (sortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return (b.lastReadAt || '').localeCompare(a.lastReadAt || '');
    });
  }, [mangas, searchTerm, activeFilter, sortBy]);

  // Counts for each tab badge
  const counts = useMemo(() => {
    let recent = 0;
    let onHold = 0;
    let favs = 0;
    let completed = 0;
    let paused = 0;
    let deleted = 0;
    for (const m of mangas) {
      if (m.status === 'deleted') {
        deleted++;
        continue;
      }
      if (m.status === 'completed') completed++;
      if (m.status === 'paused') paused++;
      if (isRecentlyRead(m)) recent++;
      else onHold++;
      if (m.isFavorite) favs++;
    }
    const all = mangas.length - deleted;
    return { recent, onHold, favs, completed, paused, deleted, all };
  }, [mangas]);

  // Grouping logic
  const groupedData = useMemo(() => {
    if (!groupByCategory) return null;
    return {
      leyendoUltimamente: filteredMangas.filter((m) => isRecentlyRead(m)),
      tiempoSinLeer: filteredMangas.filter((m) => !isRecentlyRead(m)),
      emisionTerminada: filteredMangas.filter((m) => m.status === 'completed'),
      favoritos: filteredMangas.filter((m) => m.isFavorite),
    };
  }, [filteredMangas, groupByCategory]);

  const renderMangaCard = (manga: MangaItem) => {
    const percentage = Math.min(
      100,
      Math.round((manga.currentChapter / (manga.totalChapters || 1)) * 100)
    );
    const recent = isRecentlyRead(manga);
    const isFinished = manga.status === 'completed';

    return (
      <div
        key={manga.id}
        onClick={() => setSelectedManga(manga)}
        className="glass-card p-3.5 flex gap-3.5 hover:shadow-md hover:border-[#C4B5FD] transition-all cursor-pointer group relative overflow-hidden"
      >
        {/* Cover Image with Cross-Origin & Hotlink Protection */}
        <div className="relative w-20 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#EDE9FE] to-[#F3EFFC] border border-purple-100 shadow-2xs">
          {getCoverSrc(manga.coverUrl) ? (
            <img
              src={getCoverSrc(manga.coverUrl)}
              alt={manga.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  const fallback = parent.querySelector('.cover-fallback');
                  if (fallback) fallback.classList.remove('hidden');
                }
              }}
            />
          ) : null}

          {/* Elegant fallback card when image fails or is absent */}
          <div
            className={`cover-fallback absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[#ECE7FC] to-[#F5F3FF] text-[#6B21A8] ${
              getCoverSrc(manga.coverUrl) ? 'hidden' : ''
            }`}
          >
            <span className="text-2xl mb-1 drop-shadow-xs">📖</span>
            <span className="text-[9px] font-black leading-tight line-clamp-3 text-[#581C87]">
              {manga.title}
            </span>
          </div>

          {/* Favorite heart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(manga.id);
            }}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 shadow-xs hover:scale-110 active:scale-95 transition-transform"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                manga.isFavorite ? 'fill-[#EC4899] text-[#EC4899]' : 'text-gray-400'
              }`}
            />
          </button>
        </div>

        {/* Card Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            {/* Top Badges: Recency habit & Publication Status */}
            <div className="flex items-center justify-between gap-1.5 flex-wrap">
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* 1. Hábitos de Lectura / Papelera */}
                {manga.status === 'deleted' ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                    <Trash2 className="w-2.5 h-2.5" />
                    En papelera
                  </span>
                ) : recent ? (
                  <span className="flex items-center gap-1 text-[10px] font-black text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                    Leyendo últimamente
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-black text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                    <Clock className="w-2.5 h-2.5" />
                    Llevo tiempo sin leer
                  </span>
                )}

                {/* 2. Estado de lectura del usuario */}
                {manga.status === 'completed' ? (
                  <span className="text-[9px] font-bold text-[#6D28D9] bg-[#EDE9FE] px-2 py-0.5 rounded-full border border-[#C4B5FD]">
                    🏁 Terminado
                  </span>
                ) : manga.status === 'paused' ? (
                  <span className="text-[9px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                    ⏸️ En pausa
                  </span>
                ) : (
                  <span className="text-[9px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                    📖 Leyendo
                  </span>
                )}
              </div>

              {/* Progress percentage */}
              <span className="text-[11px] font-black font-mono text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
                {percentage}%
              </span>
            </div>

            <h3 className="text-sm font-black text-[#1E1238] truncate mt-1.5 group-hover:text-[#7C3AED] transition-colors">
              {manga.title}
            </h3>

            {manga.author && (
              <p className="text-[11px] font-medium text-[#6B7280] truncate">{manga.author}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {manga.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="text-[9px] font-bold text-[#6D28D9] bg-[#FAF5FF] px-2 py-0.5 rounded-full border border-purple-100"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="font-semibold text-[#6B7280]">Progreso:</span>
                {manga.totalChapters > manga.currentChapter && (
                  <span className="text-[9px] font-black text-[#047857] bg-[#ECFDF5] px-1.5 py-0.5 rounded-md border border-[#A7F3D0] truncate">
                    ⏱️ ~{Math.round((manga.totalChapters - manga.currentChapter) * 4.4 / 60) > 0 
                      ? `${Math.round((manga.totalChapters - manga.currentChapter) * 4.4 / 60)}h` 
                      : `${Math.round((manga.totalChapters - manga.currentChapter) * 4.4)}m`}
                  </span>
                )}
              </div>
              <span className="font-black text-[#1E1238] flex-shrink-0">
                {manga.currentChapter} / {manga.totalChapters} caps
              </span>
            </div>

            {/* Visual Capsule Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#EDE9FE] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Duration & Last read */}
            <div className="flex items-center justify-between text-[10px] font-medium text-[#6B7280] pt-0.5 gap-1">
              <span className="truncate">
                Última: {formatRelativeTimeSpanish(manga.lastReadAt)}
              </span>
              {manga.readingMonths !== undefined && manga.readingMonths > 0 ? (
                <span
                  title={
                    manga.startedAt
                      ? `Iniciado en ${new Date(manga.startedAt).toLocaleDateString('es-ES', {
                          month: 'short',
                          year: 'numeric',
                        })}`
                      : ''
                  }
                  className="flex-shrink-0 text-[#92400E] font-black bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                >
                  <span>⏱️</span>
                  <span>
                    {manga.readingMonths} {manga.readingMonths === 1 ? 'mes' : 'meses'}
                  </span>
                </span>
              ) : null}
            </div>

            {/* Quick Actions if In Trash */}
            {manga.status === 'deleted' && (
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-rose-100 mt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateStatus(manga.id, 'reading');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Restaurar
                </button>
                {onDeletePermanently && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        window.confirm(
                          `¿Eliminar definitivamente "${manga.title}" de la base de datos?`
                        )
                      ) {
                        onDeletePermanently(manga.id);
                      }
                    }}
                    className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 text-[10px] font-bold flex items-center gap-1 shadow-2xs transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Eliminar
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header Card */}
      <div className="pt-2 px-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7C3AED]">
              Tu Colección
            </span>
            <h1 className="text-xl font-black text-[#1E1238] tracking-tight">BIBLIOTECA</h1>
          </div>

          <button
            onClick={() => setGroupByCategory(!groupByCategory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-xs ${
              groupByCategory
                ? 'bg-[#7C3AED] text-white shadow-purple-500/20'
                : 'bg-white text-[#6B7280] border border-[#E9D5FF]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{groupByCategory ? 'Agrupado' : 'Agrupar'}</span>
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar manhwa, autor o género..."
            className="w-full pl-10 pr-9 py-2.5 rounded-full bg-white border border-[#E9D5FF] text-sm font-semibold text-[#1E1238] placeholder-[#9CA3AF] focus:outline-none focus:border-[#8B5CF6] shadow-xs transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#1E1238]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Filter Toggles (Organizados por hábitos de lectura de la usuaria) */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-0.5">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-[#7C3AED] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60 hover:bg-purple-50'
          }`}
        >
          Todos ({counts.all})
        </button>

        {/* Leyendo últimamente */}
        <button
          onClick={() => setActiveFilter('recent_reading')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'recent_reading'
              ? 'bg-[#047857] text-white shadow-xs'
              : 'bg-white text-[#047857] border border-[#A7F3D0] hover:bg-emerald-50'
          }`}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          Leyendo últimamente ({counts.recent})
        </button>

        {/* Llevo tiempo sin leer */}
        <button
          onClick={() => setActiveFilter('on_hold')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'on_hold'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'bg-white text-[#B45309] border border-[#FDE68A] hover:bg-amber-50'
          }`}
        >
          <Clock className="w-3 h-3" />
          Llevo tiempo sin leer ({counts.onHold})
        </button>

        {/* Favoritos */}
        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'favorites'
              ? 'bg-[#EC4899] text-white shadow-xs'
              : 'bg-white text-[#BE185D] border border-[#FBCFE8] hover:bg-pink-50'
          }`}
        >
          <Heart className="w-3 h-3" />
          Favoritos ({counts.favs})
        </button>

        {/* Terminados (solo si la usuaria lo marcó como terminado) */}
        {counts.completed > 0 && (
          <button
            onClick={() => setActiveFilter('completed')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'completed'
                ? 'bg-[#6D28D9] text-white shadow-xs'
                : 'bg-white text-[#6D28D9] border border-[#C4B5FD] hover:bg-purple-50'
            }`}
          >
            🏁 Terminados ({counts.completed})
          </button>
        )}

        {/* En pausa (solo si la usuaria lo pausó) */}
        {counts.paused > 0 && (
          <button
            onClick={() => setActiveFilter('paused')}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
              activeFilter === 'paused'
                ? 'bg-[#D97706] text-white shadow-xs'
                : 'bg-white text-[#D97706] border border-[#FDE68A] hover:bg-amber-50'
            }`}
          >
            ⏸️ En pausa ({counts.paused})
          </button>
        )}

        {/* Borrados / Papelera */}
        <button
          onClick={() => setActiveFilter('deleted')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 ${
            activeFilter === 'deleted'
              ? 'bg-rose-600 text-white shadow-xs'
              : counts.deleted > 0
              ? 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60 hover:bg-rose-50'
          }`}
        >
          <Trash2 className="w-3 h-3" />
          Borrados ({counts.deleted})
        </button>
      </div>

      {/* Sorting Selector */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-bold text-[#6B7280] flex items-center gap-1 text-[11px]">
          <ArrowUpDown className="w-3 h-3 text-[#7C3AED]" /> Ordenar:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-white border border-[#E9D5FF]/60 p-0.5 rounded-full shadow-2xs">
          {/* Más tiempo sin leer */}
          <button
            onClick={() => setSortBy('unread_longest')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all flex items-center gap-1 whitespace-nowrap ${
              sortBy === 'unread_longest'
                ? 'bg-[#D97706] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            <span>⏳ Más tiempo sin leer</span>
          </button>

          {/* Más recientes */}
          <button
            onClick={() => setSortBy('recent')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all flex items-center gap-1 whitespace-nowrap ${
              sortBy === 'recent'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            <span>⚡ Recientes</span>
          </button>

          {/* Fidelidad / Antigüedad */}
          <button
            onClick={() => setSortBy('duration')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all flex items-center gap-1 whitespace-nowrap ${
              sortBy === 'duration'
                ? 'bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            <span>👑 Mayor fidelidad</span>
          </button>

          {/* Progreso */}
          <button
            onClick={() => setSortBy('progress')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${
              sortBy === 'progress'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            Progreso
          </button>

          {/* A-Z */}
          <button
            onClick={() => setSortBy('title')}
            className={`px-2.5 py-1 rounded-full text-[10px] font-black transition-all whitespace-nowrap ${
              sortBy === 'title'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            A–Z
          </button>
        </div>
      </div>

      {/* Top Banner if in Trash filter */}
      {activeFilter === 'deleted' && (
        <div className="mx-1 p-3 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-between gap-2 shadow-2xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xl">🗑️</span>
            <div className="min-w-0">
              <h4 className="text-xs font-black text-rose-800">
                Papelera de Borrados ({counts.deleted})
              </h4>
              <p className="text-[10px] text-rose-600 truncate">
                Estos mangas no aparecen en tu biblioteca activa ni en tus estadísticas.
              </p>
            </div>
          </div>
          {onEmptyTrash && counts.deleted > 0 && (
            <button
              onClick={() => {
                if (
                  window.confirm(
                    '¿Vaciar la papelera? Se eliminarán definitivamente todos los mangas en esta sección.'
                  )
                ) {
                  onEmptyTrash();
                }
              }}
              className="py-1 px-2.5 rounded-full bg-rose-600 text-white text-[10px] font-bold shadow-2xs flex-shrink-0 hover:bg-rose-700 transition-colors"
            >
              Vaciar papelera
            </button>
          )}
        </div>
      )}

      {/* Manga Cards List */}
      {filteredMangas.length === 0 ? (
        <div className="glass-card p-10 text-center space-y-2.5 my-6">
          <span className="text-3xl block">{activeFilter === 'deleted' ? '🗑️' : '🔍'}</span>
          <h3 className="text-sm font-black text-[#1E1238]">
            {activeFilter === 'deleted'
              ? 'La papelera está vacía'
              : 'No se encontraron mangas'}
          </h3>
          <p className="text-xs text-[#6B7280]">
            {activeFilter === 'deleted'
              ? 'No tienes ningún manhwa en la papelera.'
              : 'Prueba a buscar con otro término o selecciona otro filtro.'}
          </p>
        </div>
      ) : groupByCategory && groupedData ? (
        <div className="space-y-6">
          {/* Grupo 1: Leyendo últimamente */}
          {groupedData.leyendoUltimamente.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                <h2 className="text-xs font-black uppercase text-[#047857] tracking-wider">
                  Leyendo últimamente ({groupedData.leyendoUltimamente.length})
                </h2>
              </div>
              <div className="space-y-2.5">
                {groupedData.leyendoUltimamente.map((m) => renderMangaCard(m))}
              </div>
            </div>
          )}

          {/* Grupo 2: Llevo tiempo sin leer */}
          {groupedData.tiempoSinLeer.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
                <h2 className="text-xs font-black uppercase text-[#B45309] tracking-wider">
                  Llevo tiempo sin leer ({groupedData.tiempoSinLeer.length})
                </h2>
              </div>
              <div className="space-y-2.5">
                {groupedData.tiempoSinLeer.map((m) => renderMangaCard(m))}
              </div>
            </div>
          )}

          {/* Grupo 3: Emisión Terminada */}
          {groupedData.emisionTerminada.length > 0 && (
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 px-1">
                <span className="w-2 h-2 rounded-full bg-[#8B5CF6]" />
                <h2 className="text-xs font-black uppercase text-[#6D28D9] tracking-wider">
                  Emisión finalizada ({groupedData.emisionTerminada.length})
                </h2>
              </div>
              <div className="space-y-2.5">
                {groupedData.emisionTerminada.map((m) => renderMangaCard(m))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredMangas.map((manga) => renderMangaCard(manga))}
        </div>
      )}

      {/* Manga Detail Modal */}
      <MangaDetailModal
        manga={selectedManga}
        onClose={() => setSelectedManga(null)}
        onToggleFavorite={onToggleFavorite}
        onUpdateStatus={onUpdateStatus}
        onDeletePermanently={onDeletePermanently}
        onUpdateChapter={onUpdateChapter}
      />
    </div>
  );
};
