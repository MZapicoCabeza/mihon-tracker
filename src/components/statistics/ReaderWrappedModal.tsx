import React from 'react';
import { X, Sparkles, Trophy, Flame, Heart, BookOpen, Clock, Share2 } from 'lucide-react';
import { MangaItem, ReadingStats } from '../../types/tracker';

interface ReaderWrappedModalProps {
  stats: ReadingStats;
  mangas: MangaItem[];
  onClose: () => void;
}

export const ReaderWrappedModal: React.FC<ReaderWrappedModalProps> = ({
  stats,
  mangas,
  onClose,
}) => {
  const topGenre = stats.genreDistribution?.[0]?.genre || 'Romance';
  const topManga = mangas[0] || { title: 'A la amante de mi esposo', currentChapter: 118 };
  const longestReadManga = [...mangas].sort((a, b) => (b.readingMonths || 0) - (a.readingMonths || 0))[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-sm rounded-[2.5rem] p-7 text-white shadow-2xl overflow-hidden bg-gradient-to-b from-[#2E0854] via-[#4C1D95] to-[#1E1238] border border-white/15 space-y-6">
        {/* Glow ambient background elements */}
        <div className="absolute -top-16 -right-16 w-44 h-44 rounded-full bg-[#EC4899]/30 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 rounded-full bg-[#8B5CF6]/40 blur-3xl pointer-events-none" />

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Wrapped Badge */}
        <div className="text-center pt-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md border border-white/20 text-[11px] font-black uppercase tracking-widest text-[#FDF4FF]">
            <Sparkles className="w-3.5 h-3.5 text-[#F472B6]" /> Tu Año en Lectura
          </span>
          <h2 className="text-2xl font-black tracking-tight mt-2 text-white">
            TU HISTORIA LECTORA
          </h2>
          <p className="text-xs text-white/70 font-medium">Resumen especial personalizado</p>
        </div>

        {/* Persona Archetype Badge */}
        <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 text-center space-y-1">
          <span className="text-xs font-bold text-[#F472B6] uppercase tracking-wider block">
            Tu Arquetipo de Lectora
          </span>
          <div className="text-lg font-black text-white flex items-center justify-center gap-1.5">
            <span>✨</span>
            <span>Maratoniana de {topGenre}</span>
            <span>✨</span>
          </div>
          <p className="text-[11px] text-white/70">
            Prefieres lecturas apasionantes en la madrugada y maratones de series en emisión.
          </p>
        </div>

        {/* 4 Big Highlights */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <BookOpen className="w-4 h-4 text-[#FDE047] mx-auto mb-1" />
            <div className="text-xl font-black">{stats.totalChaptersRead}</div>
            <div className="text-[10px] text-white/70 font-semibold uppercase">Capítulos</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <Clock className="w-4 h-4 text-[#67E8F9] mx-auto mb-1" />
            <div className="text-xl font-black">{stats.estimatedHoursRead}h</div>
            <div className="text-[10px] text-white/70 font-semibold uppercase">Horas Leyendo</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <Flame className="w-4 h-4 text-[#FB923C] mx-auto mb-1" />
            <div className="text-xl font-black">{stats.longestStreakDays || 17}d</div>
            <div className="text-[10px] text-white/70 font-semibold uppercase">Mayor Racha</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
            <Trophy className="w-4 h-4 text-[#F472B6] mx-auto mb-1" />
            <div className="text-xl font-black">{stats.recordDay?.chapters || 107}</div>
            <div className="text-[10px] text-white/70 font-semibold uppercase">Récord en 1 Día</div>
          </div>
        </div>

        {/* Favorite & Longest read manhwa */}
        <div className="p-4 rounded-3xl bg-white/10 backdrop-blur-md border border-white/15 space-y-2">
          <span className="text-[10px] font-extrabold text-[#FDE047] uppercase tracking-wider block">
            👑 Tu Manhwa de Oro (Mayor Fidelidad)
          </span>
          <div className="flex items-center gap-3">
            <div className="w-12 h-16 rounded-xl overflow-hidden bg-white/20 flex-shrink-0">
              {longestReadManga?.coverUrl ? (
                <img src={longestReadManga.coverUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xl">📖</div>
              )}
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-black truncate">{longestReadManga?.title || topManga.title}</h4>
              <p className="text-xs text-white/80 font-semibold">
                ⏱️ {longestReadManga?.readingMonths || 23} meses leyendo
              </p>
              <p className="text-[10px] text-white/60">
                Cap. {longestReadManga?.currentChapter || topManga.currentChapter} alcanzado
              </p>
            </div>
          </div>
        </div>

        {/* Close / Share Button */}
        <button
          onClick={onClose}
          className="w-full py-3.5 rounded-full bg-gradient-to-r from-[#EC4899] to-[#8B5CF6] text-white font-black text-sm shadow-lg shadow-purple-500/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          ¡Seguir Leyendo! ✨
        </button>
      </div>
    </div>
  );
};
