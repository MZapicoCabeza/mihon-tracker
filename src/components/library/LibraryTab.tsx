import React, { useState, useMemo } from 'react';
import { Search, Heart, CheckCircle2, PauseCircle, PlayCircle, Layers, X, Sparkles } from 'lucide-react';
import { MangaItem, MangaStatus } from '../../types/tracker';
import { formatRelativeTimeSpanish } from '../../utils/dateUtils';

interface LibraryTabProps {
  mangas: MangaItem[];
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: MangaStatus) => void;
  selectedMangaId?: string | null;
}

type FilterOption = 'all' | 'reading' | 'completed' | 'paused' | 'favorites';

export const LibraryTab: React.FC<LibraryTabProps> = ({
  mangas,
  onToggleFavorite,
  onUpdateStatus,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterOption>('all');
  const [groupByCategory, setGroupByCategory] = useState(false);

  // Filter logic
  const filteredMangas = useMemo(() => {
    return mangas.filter((manga) => {
      const matchesSearch =
        manga.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        manga.genres.some((g) => g.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (manga.author && manga.author.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (activeFilter === 'all') return true;
      if (activeFilter === 'favorites') return manga.isFavorite;
      return manga.status === activeFilter;
    });
  }, [mangas, searchTerm, activeFilter]);

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
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-800/40">
            <PlayCircle className="w-2.5 h-2.5" /> Leyendo
          </span>
        );
      case 'completed':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800/40">
            <CheckCircle2 className="w-2.5 h-2.5" /> Completado
          </span>
        );
      case 'paused':
        return (
          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded-full border border-amber-800/40">
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
        className="group relative flex gap-3.5 p-3 rounded-2xl bg-[#140f26] border border-purple-900/30 hover:border-purple-600/50 shadow-[0_4px_20px_rgba(0,0,0,0.3)] hover:shadow-[0_4px_24px_rgba(168,85,247,0.18)] transition-all duration-300"
      >
        {/* Cover Image */}
        <div className="relative w-20 h-28 rounded-xl overflow-hidden flex-shrink-0 bg-purple-950/40 border border-purple-800/30">
          <img
            src={manga.coverUrl}
            alt={manga.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

          {/* Favorite heart button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(manga.id);
            }}
            className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 backdrop-blur-md text-white/70 hover:text-rose-400 transition-colors"
          >
            <Heart
              className={`w-3.5 h-3.5 ${
                manga.isFavorite ? 'fill-rose-500 text-rose-500' : 'text-gray-300'
              }`}
            />
          </button>
        </div>

        {/* Card Content */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center justify-between gap-2">
              {getStatusBadge(manga.status)}
              <span className="text-[11px] font-mono font-bold text-purple-300">
                {percentage}%
              </span>
            </div>

            <h3 className="text-sm font-bold text-white truncate mt-1 group-hover:text-purple-300 transition-colors">
              {manga.title}
            </h3>

            {manga.author && (
              <p className="text-[11px] text-gray-400 truncate">{manga.author}</p>
            )}

            {/* Genres */}
            <div className="flex flex-wrap gap-1 mt-1.5">
              {manga.genres.slice(0, 3).map((genre) => (
                <span
                  key={genre}
                  className="text-[9px] font-medium text-purple-300/80 bg-purple-950/50 px-1.5 py-0.5 rounded border border-purple-800/20"
                >
                  {genre}
                </span>
              ))}
            </div>
          </div>

          {/* Progress Section */}
          <div className="mt-2 space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-gray-400">Progreso:</span>
              <span className="font-semibold text-gray-200">
                <span className="text-purple-300 font-bold">{manga.currentChapter}</span> / {manga.totalChapters} caps
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2 rounded-full bg-purple-950/80 overflow-hidden p-0.5 border border-purple-900/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 via-fuchsia-500 to-purple-400 transition-all duration-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"
                style={{ width: `${percentage}%` }}
              />
            </div>

            <div className="text-[10px] text-gray-500 pt-0.5">
              Última lectura: {formatRelativeTimeSpanish(manga.lastReadAt)}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 pb-24 animate-fadeIn">
      {/* Title */}
      <div className="flex items-center justify-between pt-1">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Biblioteca</h1>
          <p className="text-xs text-gray-400">
            {filteredMangas.length} mangas en seguimiento
          </p>
        </div>

        {/* Grouping Toggle */}
        <button
          onClick={() => setGroupByCategory(!groupByCategory)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            groupByCategory
              ? 'bg-purple-600/30 border-purple-500 text-purple-200 shadow-[0_0_12px_rgba(168,85,247,0.3)]'
              : 'bg-[#15102a] border-purple-900/40 text-gray-400 hover:text-gray-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Agrupar</span>
        </button>
      </div>

      {/* Top Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-purple-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por título, género o autor..."
          className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-[#15102a] border border-purple-900/40 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all shadow-inner"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Filter Toggles */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'all'
              ? 'bg-purple-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.4)]'
              : 'bg-[#16112c] text-gray-400 hover:text-gray-200 border border-purple-900/30'
          }`}
        >
          Todos ({mangas.length})
        </button>

        <button
          onClick={() => setActiveFilter('reading')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'reading'
              ? 'bg-emerald-600 text-white shadow-[0_0_12px_rgba(16,185,129,0.4)]'
              : 'bg-[#16112c] text-gray-400 hover:text-gray-200 border border-purple-900/30'
          }`}
        >
          Leyendo ({mangas.filter((m) => m.status === 'reading').length})
        </button>

        <button
          onClick={() => setActiveFilter('favorites')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'favorites'
              ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
              : 'bg-[#16112c] text-gray-400 hover:text-gray-200 border border-purple-900/30'
          }`}
        >
          Favoritos ({mangas.filter((m) => m.isFavorite).length})
        </button>

        <button
          onClick={() => setActiveFilter('completed')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'completed'
              ? 'bg-blue-600 text-white shadow-[0_0_12px_rgba(59,130,246,0.4)]'
              : 'bg-[#16112c] text-gray-400 hover:text-gray-200 border border-purple-900/30'
          }`}
        >
          Completados ({mangas.filter((m) => m.status === 'completed').length})
        </button>

        <button
          onClick={() => setActiveFilter('paused')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            activeFilter === 'paused'
              ? 'bg-amber-600 text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
              : 'bg-[#16112c] text-gray-400 hover:text-gray-200 border border-purple-900/30'
          }`}
        >
          En pausa ({mangas.filter((m) => m.status === 'paused').length})
        </button>
      </div>

      {/* Manga Cards List / Grouped View */}
      {filteredMangas.length === 0 ? (
        <div className="text-center py-12 rounded-2xl bg-[#140f26] border border-purple-900/20 p-6">
          <p className="text-sm text-gray-400">No se encontraron mangas con ese criterio.</p>
        </div>
      ) : groupByCategory && groupedData ? (
        <div className="space-y-6">
          {groupedData.favoritos.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 fill-rose-500" /> Favoritos ({groupedData.favoritos.length})
              </h2>
              <div className="space-y-3">{groupedData.favoritos.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.leyendo.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <PlayCircle className="w-3.5 h-3.5" /> Leyendo ({groupedData.leyendo.length})
              </h2>
              <div className="space-y-3">{groupedData.leyendo.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.enPausa.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <PauseCircle className="w-3.5 h-3.5" /> En Pausa ({groupedData.enPausa.length})
              </h2>
              <div className="space-y-3">{groupedData.enPausa.map(renderMangaCard)}</div>
            </div>
          )}

          {groupedData.completados.length > 0 && (
            <div className="space-y-2.5">
              <h2 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Completados ({groupedData.completados.length})
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
