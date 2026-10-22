import React, { useState, useMemo } from 'react';
import { Search, Heart, CheckCircle2, PauseCircle, PlayCircle, Layers, X, Clock, ArrowUpDown } from 'lucide-react';
import { MangaItem, MangaStatus } from '../../types/tracker';
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
  const [sortBy, setSortBy] = useState<SortOption>('recent');
  const [groupByCategory, setGroupByCategory] = useState(false);

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
          <span className="flex items-center gap-1 text-[10px] font-black text-[#242220] bg-[#A8D5BA] px-2.5 py-0.5 rounded-full border border-[#2D2926]">
            <PlayCircle className="w-2.5 h-2.5 stroke-[2.5]" /> Leyendo
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#242220] bg-[#C8B6E2] px-2.5 py-0.5 rounded-full border border-[#2D2926]">
            <CheckCircle2 className="w-2.5 h-2.5 stroke-[2.5]" /> Completado
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[10px] font-black text-[#242220] bg-[#F8C866] px-2.5 py-0.5 rounded-full border border-[#2D2926]">
            <PauseCircle className="w-2.5 h-2.5 stroke-[2.5]" /> En Pausa
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
        className="group relative flex gap-3.5 p-3 rounded-2xl bg-white border-[1.8px] border-[#2D2926] shadow-[0_3px_0px_#2D2926] hover:translate-y-[-1px] transition-all duration-200"
      >
        {/* Cover Image */}
        <div className="relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 border-[1.5px] border-[#2D2926] bg-[#F5F0E8]">
          <img
            src={manga.coverUrl}
            alt={manga.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />

          {/* Favorite heart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(manga.id);
            }}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 border border-[#2D2926] shadow-sm hover:scale-110 transition-transform"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                manga.isFavorite ? 'fill-[#E27D60] text-[#E27D60]' : 'text-[#8A847E]'
              }`}
            />
          </button>
        </div>

        {/* Card Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              {getStatusBadge(manga.status)}
              <span className="text-[11px] font-black font-mono text-[#242220] bg-[#FAF7F2] border border-[#2D2926] px-2 py-0.2 rounded-full">
                {percentage}%
              </span>
            </div>

            <h3 className="text-sm font-black text-[#242220] truncate mt-1.5">
              {manga.title}
            </h3>

            {manga.author && (
              <p className="text-[11px] font-bold text-[#8A847E] truncate">{manga.author}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {manga.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="text-[9px] font-extrabold text-[#5C5651] bg-[#F5F0E8] px-2 py-0.5 rounded-full"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-extrabold text-[#7A746E]">Progreso:</span>
              <span className="font-black text-[#242220]">
                {manga.currentChapter} / {manga.totalChapters} caps
              </span>
            </div>

            {/* Visual Capsule Progress Bar */}
            <div className="w-full h-3 rounded-full bg-[#F0EBE1] border-[1.5px] border-[#2D2926] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full bg-[#A8D5BA] border-[1px] border-[#2D2926] transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] font-bold text-[#8A847E] pt-0.5 gap-1">
              <span className="truncate">Última lectura: {formatRelativeTimeSpanish(manga.lastReadAt)}</span>
              {manga.readingMonths !== undefined && manga.readingMonths > 0 ? (
                <span
                  title={manga.startedAt ? `Iniciado en ${new Date(manga.startedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}` : ''}
                  className="flex-shrink-0 text-[#3D2622] font-black bg-[#FAF0D7] border border-[#2D2926]/40 px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs"
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
      <div className="-mx-4 -mt-3 bg-[#F6A596] border-b-[2px] border-[#2D2926] p-4 pt-5 rounded-b-[2.2rem] shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold tracking-wider text-[#3D2622] uppercase">
              Tu Colección
            </span>
            <h1 className="text-xl font-black text-[#242220] tracking-tight leading-none">
              BIBLIOTECA
            </h1>
          </div>

          <button
            onClick={() => setGroupByCategory(!groupByCategory)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border-[1.5px] border-[#2D2926] transition-all shadow-[0_2px_0px_#2D2926] ${
              groupByCategory ? 'bg-[#2D2926] text-white' : 'bg-[#FAF7F2] text-[#242220]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{groupByCategory ? 'Agrupado' : 'Agrupar'}</span>
          </button>
        </div>
      </div>

      {/* Top Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#8A847E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar manga, autor o género..."
          className="w-full pl-10 pr-9 py-2.5 rounded-full bg-white border-[1.8px] border-[#2D2926] text-sm font-bold text-[#242220] placeholder-[#8A847E] focus:outline-none shadow-[0_3px_0px_#2D2926]"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8A847E] hover:text-[#242220]"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Toggles */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border-[1.5px] border-[#2D2926] transition-all ${
            activeFilter === 'all'
              ? 'bg-[#2D2926] text-white shadow-[0_2px_0px_#2D2926]'
              : 'bg-white text-[#242220]'
          }`}
        >
          Todos ({mangas.length})
        </button>

        <button
          onClick={() => setActiveFilter('reading')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border-[1.5px] border-[#2D2926] transition-all ${
            activeFilter === 'reading'
              ? 'bg-[#A8D5BA] text-[#242220] shadow-[0_2px_0px_#2D2926]'
              : 'bg-white text-[#242220]'
          }`}
        >
          Leyendo ({mangas.filter((m) => m.status === 'reading').length})
        </button>

        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border-[1.5px] border-[#2D2926] transition-all ${
            activeFilter === 'favorites'
              ? 'bg-[#F6A596] text-[#242220] shadow-[0_2px_0px_#2D2926]'
              : 'bg-white text-[#242220]'
          }`}
        >
          Favoritos ({mangas.filter((m) => m.isFavorite).length})
        </button>

        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border-[1.5px] border-[#2D2926] transition-all ${
            activeFilter === 'completed'
              ? 'bg-[#C8B6E2] text-[#242220] shadow-[0_2px_0px_#2D2926]'
              : 'bg-white text-[#242220]'
          }`}
        >
          Completados ({mangas.filter((m) => m.status === 'completed').length})
        </button>

        <button
          onClick={() => setActiveFilter('paused')}
          className={`px-3 py-1.5 rounded-full text-xs font-extrabold whitespace-nowrap border-[1.5px] border-[#2D2926] transition-all ${
            activeFilter === 'paused'
              ? 'bg-[#F8C866] text-[#242220] shadow-[0_2px_0px_#2D2926]'
              : 'bg-white text-[#242220]'
          }`}
        >
          En pausa ({mangas.filter((m) => m.status === 'paused').length})
        </button>
      </div>

      {/* Sorting Selector */}
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="font-extrabold text-[#7A746E] flex items-center gap-1 text-[11px]">
          <ArrowUpDown className="w-3 h-3" /> Ordenar:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setSortBy('recent')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
              sortBy === 'recent'
                ? 'bg-[#2D2926] text-white'
                : 'bg-[#FAF7F2] text-[#6B6661] border border-[#2D2926]/20'
            }`}
          >
            Recientes
          </button>
          <button
            onClick={() => setSortBy('duration')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all flex items-center gap-1 ${
              sortBy === 'duration'
                ? 'bg-[#E27D60] text-white shadow-xs'
                : 'bg-[#FAF7F2] text-[#6B6661] border border-[#2D2926]/20'
            }`}
          >
            <span>⏱️</span> Más tiempo leyendo
          </button>
          <button
            onClick={() => setSortBy('progress')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
              sortBy === 'progress'
                ? 'bg-[#2D2926] text-white'
                : 'bg-[#FAF7F2] text-[#6B6661] border border-[#2D2926]/20'
            }`}
          >
            Progreso
          </button>
          <button
            onClick={() => setSortBy('title')}
            className={`px-2.5 py-0.5 rounded-full text-[10px] font-black transition-all ${
              sortBy === 'title'
                ? 'bg-[#2D2926] text-white'
                : 'bg-[#FAF7F2] text-[#6B6661] border border-[#2D2926]/20'
            }`}
          >
            A-Z
          </button>
        </div>
      </div>

      {/* Manga Cards List / Grouped View */}
      {filteredMangas.length === 0 ? (
        <div className="text-center py-12 rounded-3xl bg-white border-[1.8px] border-[#2D2926] p-6 shadow-[0_4px_0px_#2D2926]">
          <span className="text-3xl">📚</span>
          <p className="text-sm font-black text-[#242220] mt-2">
            {mangas.length === 0 ? 'Biblioteca vacía' : 'Sin resultados'}
          </p>
          <p className="text-xs text-[#7A746E] mt-1 max-w-xs mx-auto">
            {mangas.length === 0
              ? 'Aún no has sincronizado tu biblioteca. Importa un respaldo o sincroniza desde Mihon.'
              : 'No se encontraron mangas con los filtros o término de búsqueda actual.'}
          </p>
        </div>
      ) : groupByCategory && groupedData ? (
        <div className="space-y-6">
          {groupedData.favoritos.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#242220] uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-[#E27D60] text-[#E27D60]" /> Favoritos ({groupedData.favoritos.length})
              </h2>
              <div className="space-y-3">{groupedData.favoritos.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.leyendo.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#242220] uppercase tracking-wider flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5 text-[#52796F]" /> Leyendo ({groupedData.leyendo.length})
              </h2>
              <div className="space-y-3">{groupedData.leyendo.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.enPausa.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#242220] uppercase tracking-wider flex items-center gap-1.5">
                <PauseCircle className="w-3.5 h-3.5 text-[#F8C866]" /> En Pausa ({groupedData.enPausa.length})
              </h2>
              <div className="space-y-3">{groupedData.enPausa.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.completados.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-xs font-black text-[#242220] uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#C8B6E2]" /> Completados ({groupedData.completados.length})
              </h2>
              <div className="space-y-3">{groupedData.completados.map(renderMangaCard)}</div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">{filteredMangas.map(renderMangaCard)}</div>
      )}
    </div>
  );
};
