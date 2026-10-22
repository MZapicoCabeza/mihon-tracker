import React, { useState, useMemo } from 'react';
import { Search, Heart, CheckCircle2, PauseCircle, PlayCircle, Layers, X, Clock, ArrowUpDown } from 'lucide-react';
import { MangaItem, MangaStatus } from '../../types/tracker';
import { MangaDetailModal } from './MangaDetailModal';
import { formatRelativeTimeSpanish } from '../../utils/dateUtils';

interface LibraryTabProps {
  mangas: MangaItem[];
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: MangaStatus) => void;
  selectedMangaId?: string | null;
}

type FilterOption = 'all' | 'reading' | 'completed' | 'paused' | 'favorites';
type SortOption = 'recent' | 'duration' | 'progress' | 'title';

export const LibraryTab: React.FC<LibraryTabProps> = ({
  mangas,
  onToggleFavorite,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [sortBy, setSortBy] = useState<SortOption>('duration'); // Default to longest read!
  const [groupByCategory, setGroupByCategory] = useState(false);
  const [selectedManga, setSelectedManga] = useState<MangaItem | null>(null);

  // Filter & sort logic
  const filteredMangas = useMemo(() => {
    const list = mangas.filter((manga) => {
      const matchesSearch =
        manga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manga.genres.some((g) => g.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (manga.author && manga.author.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'favorites') return manga.isFavorite;
      return manga.status === activeFilter;
    });

    return list.sort((a, b) => {
      if (sortBy === 'duration') {
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

  // Grouping logic
  const groupedData = useMemo(() => {
    if (!groupByCategory) return null;
    return {
      favoritos: filteredMangas.filter((m) => m.isFavorite),
      leyendo: filteredMangas.filter((m) => m.status === 'reading'),
      enPausa: filteredMangas.filter((m) => m.status === 'paused'),
      completados: filteredMangas.filter((m) => m.status === 'completed'),
    };
  }, [filteredMangas, groupByCategory]);

  const getStatusBadge = (status: MangaStatus) => {
    switch (status) {
      case 'reading':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#047857] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
            <PlayCircle className="w-2.5 h-2.5" /> Leyendo
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#6D28D9] bg-[#EDE9FE] px-2.5 py-0.5 rounded-full border border-[#C4B5FD]">
            <CheckCircle2 className="w-2.5 h-2.5" /> Completado
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#B45309] bg-[#FEF3C7] px-2.5 py-0.5 rounded-full border border-[#FDE68A]">
            <PauseCircle className="w-2.5 h-2.5" /> En Pausa
          </span>
        );
    }
  };

  const renderMangaCard = (manga: MangaItem) => {
    const percentage = Math.min(
      100,
      Math.round((manga.currentChapter / (manga.totalChapters || 1)) * 100)
    );

    return (
      <div
        key={manga.id}
        onClick={() => setSelectedManga(manga)}
        className="glass-card p-3.5 flex gap-3.5 hover:shadow-md hover:border-[#C4B5FD] transition-all cursor-pointer group"
      >
        {/* Cover Image */}
        <div className="relative w-20 h-28 rounded-2xl overflow-hidden flex-shrink-0 bg-[#F3EFFC] border border-purple-100 shadow-2xs">
          {manga.coverUrl ? (
            <img
              src={manga.coverUrl}
              alt={manga.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-2xl">📖</div>
          )}

          {/* Favorite heart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(manga.id);
            }}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 shadow-xs hover:scale-110 transition-transform"
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
            <div className="flex items-center justify-between gap-2">
              {getStatusBadge(manga.status)}
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
              <span className="font-semibold text-[#6B7280]">Progreso:</span>
              <span className="font-black text-[#1E1238]">
                {manga.currentChapter} / {manga.totalChapters} caps
              </span>
            </div>

            {/* Visual Capsule Progress Bar */}
            <div className="w-full h-2.5 rounded-full bg-[#EDE9FE] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            {/* Duration & Last read */}
            <div className="flex items-center justify-between text-[10px] font-medium text-[#6B7280] pt-0.5 gap-1">
              <span className="truncate">Última: {formatRelativeTimeSpanish(manga.lastReadAt)}</span>
              {manga.readingMonths !== undefined && manga.readingMonths > 0 ? (
                <span
                  title={manga.startedAt ? `Iniciado en ${new Date(manga.startedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}` : ''}
                  className="flex-shrink-0 text-[#92400E] font-black bg-[#FEF3C7] border border-[#FDE68A] px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
                >
                  <span>⏱️</span>
                  <span>{manga.readingMonths} {manga.readingMonths === 1 ? 'mes' : 'meses'}</span>
                </span>
              ) : null}
            </div>
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
            <h1 className="text-xl font-black text-[#1E1238] tracking-tight">
              BIBLIOTECA
            </h1>
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
            placeholder="Buscar manga, autor o género..."
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

      {/* Filter Toggles */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar px-1 pb-0.5">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-[#7C3AED] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60'
          }`}
        >
          Todos ({mangas.length})
        </button>

        <button
          onClick={() => setActiveFilter('reading')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'reading'
              ? 'bg-[#047857] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60'
          }`}
        >
          Leyendo ({mangas.filter((m) => m.status === 'reading').length})
        </button>

        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'favorites'
              ? 'bg-[#EC4899] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60'
          }`}
        >
          Favoritos ({mangas.filter((m) => m.isFavorite).length})
        </button>

        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'completed'
              ? 'bg-[#6D28D9] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60'
          }`}
        >
          Completados ({mangas.filter((m) => m.status === 'completed').length})
        </button>

        <button
          onClick={() => setActiveFilter('paused')}
          className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
            activeFilter === 'paused'
              ? 'bg-[#D97706] text-white shadow-xs'
              : 'bg-white text-[#6B7280] border border-[#E9D5FF]/60'
          }`}
        >
          En pausa ({mangas.filter((m) => m.status === 'paused').length})
        </button>
      </div>

      {/* Sorting Selector */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-bold text-[#6B7280] flex items-center gap-1 text-[11px]">
          <ArrowUpDown className="w-3 h-3 text-[#7C3AED]" /> Ordenar:
        </span>
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar bg-white border border-[#E9D5FF]/60 p-0.5 rounded-full">
          <button
            onClick={() => setSortBy('duration')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 ${
              sortBy === 'duration'
                ? 'bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            <span>⏱️</span> Más tiempo
          </button>
          <button
            onClick={() => setSortBy('recent')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              sortBy === 'recent'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            Recientes
          </button>
          <button
            onClick={() => setSortBy('progress')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              sortBy === 'progress'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            Progreso
          </button>
          <button
            onClick={() => setSortBy('title')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
              sortBy === 'title'
                ? 'bg-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280]'
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Manga Cards List / Grouped View */}
      {filteredMangas.length === 0 ? (
        <div className="glass-card p-8 text-center space-y-2">
          <span className="text-3xl">📚</span>
          <p className="text-sm font-black text-[#1E1238]">
            {mangas.length === 0 ? 'Biblioteca vacía' : 'Sin resultados'}
          </p>
          <p className="text-xs text-[#6B7280] max-w-xs mx-auto">
            {mangas.length === 0
              ? 'Aún no has sincronizado tu biblioteca. Importa un respaldo o sincroniza desde Mihon.'
              : 'No se encontraron mangas con los filtros o término de búsqueda actual.'}
          </p>
        </div>
      ) : groupByCategory && groupedData ? (
        <div className="space-y-6">
          {groupedData.favoritos.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#1E1238] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-[#EC4899] text-[#EC4899]" /> Favoritos ({groupedData.favoritos.length})
              </h2>
              <div className="space-y-3">{groupedData.favoritos.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.leyendo.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#1E1238] uppercase tracking-wider flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-[#047857]" /> Leyendo ({groupedData.leyendo.length})
              </h2>
              <div className="space-y-3">{groupedData.leyendo.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.enPausa.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#1E1238] uppercase tracking-wider flex items-center gap-1.5">
                <PauseCircle className="w-3.5 h-3.5 text-[#D97706]" /> En Pausa ({groupedData.enPausa.length})
              </h2>
              <div className="space-y-3">{groupedData.enPausa.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.completados.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#1E1238] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#6D28D9]" /> Completados ({groupedData.completados.length})
              </h2>
              <div className="space-y-3">{groupedData.completados.map(renderMangaCard)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">{filteredMangas.map(renderMangaCard)}</div>
      )}

      {/* Manga Detail Modal */}
      <MangaDetailModal
        manga={selectedManga}
        onClose={() => setSelectedManga(null)}
        onToggleFavorite={onToggleFavorite}
        onUpdateStatus={onUpdateStatus}
      />
    </div>
  );
};
