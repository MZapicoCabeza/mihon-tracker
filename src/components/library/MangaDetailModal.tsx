import React from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  Calendar,
  Clock,
  BookOpen,
  Heart,
  Sparkles,
  CheckCircle2,
  PauseCircle,
  PlayCircle,
  Trash2,
  RotateCcw,
} from 'lucide-react';
import { MangaItem, MangaStatus } from '../../types/tracker';
import { formatRelativeTimeSpanish } from '../../utils/dateUtils';
import { getCoverSrc } from '../../utils/coverUtils';

interface MangaDetailModalProps {
  manga: MangaItem | null;
  onClose: () => void;
  onToggleFavorite: (id: string) => void;
  onUpdateStatus: (id: string, status: MangaStatus) => void;
  onDeletePermanently?: (id: string) => void;
}

export const MangaDetailModal: React.FC<MangaDetailModalProps> = ({
  manga,
  onClose,
  onToggleFavorite,
  onUpdateStatus,
  onDeletePermanently,
}) => {
  if (!manga) return null;

  const percentage = Math.min(
    100,
    Math.round((manga.currentChapter / (manga.totalChapters || 1)) * 100)
  );

  const formattedStarted = manga.startedAt
    ? new Date(manga.startedAt).toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : 'No registrado';

  const years = Math.floor((manga.readingMonths || 0) / 12);
  const remainingMonths = (manga.readingMonths || 0) % 12;
  let durationText = `${manga.readingMonths || 0} meses`;
  if (years > 0) {
    durationText = remainingMonths > 0 ? `${years} años y ${remainingMonths} meses` : `${years} años`;
  }

  const modalContent = (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-[#1E1238]/60 backdrop-blur-md animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-purple-100 max-h-[90vh] overflow-y-auto no-scrollbar space-y-5"
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-[#F3EFFC] text-[#6B7280] hover:text-[#1E1238] transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Header with Cover */}
        <div className="flex gap-4 items-start">
          <div className="w-24 h-36 rounded-2xl overflow-hidden flex-shrink-0 shadow-md border border-purple-100 bg-gradient-to-br from-[#EDE9FE] to-[#F3EFFC] relative">
            {getCoverSrc(manga.coverUrl) ? (
              <img
                src={getCoverSrc(manga.coverUrl)}
                alt={manga.title}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const fallback = parent.querySelector('.cover-modal-fallback');
                    if (fallback) fallback.classList.remove('hidden');
                  }
                }}
              />
            ) : null}

            <div
              className={`cover-modal-fallback absolute inset-0 flex flex-col items-center justify-center p-2 text-center bg-gradient-to-br from-[#ECE7FC] to-[#F5F3FF] text-[#6B21A8] ${
                getCoverSrc(manga.coverUrl) ? 'hidden' : ''
              }`}
            >
              <span className="text-3xl mb-1">📖</span>
              <span className="text-[10px] font-black leading-tight line-clamp-3 text-[#581C87]">
                {manga.title}
              </span>
            </div>

            <button
              onClick={() => onToggleFavorite(manga.id)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white/90 shadow-sm"
            >
              <Heart
                className={`w-4 h-4 ${
                  manga.isFavorite ? 'fill-[#EC4899] text-[#EC4899]' : 'text-gray-400'
                }`}
              />
            </button>
          </div>

          <div className="flex-1 min-w-0 pr-6">
            <span className="text-[10px] font-black text-[#7C3AED] bg-[#F3E8FF] px-2.5 py-0.5 rounded-full uppercase tracking-wider inline-block mb-1.5">
              Ficha del Manga
            </span>
            <h2 className="text-base font-black text-[#1E1238] leading-snug line-clamp-2">
              {manga.title}
            </h2>
            {manga.author && (
              <p className="text-xs font-semibold text-[#6B7280] truncate mt-1">
                {manga.author}
              </p>
            )}

            {/* Status pills: Hábitos vs Emisión */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-[10px] font-black font-mono text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
                {percentage}%
              </span>

              {/* Hábito de lectura de la usuaria */}
              {manga.daysSinceLastRead !== undefined && manga.daysSinceLastRead <= 45 ? (
                <span className="text-[10px] font-black text-[#047857] bg-[#ECFDF5] px-2 py-0.5 rounded-full border border-[#A7F3D0]">
                  🟢 Leyendo últimamente
                </span>
              ) : (
                <span className="text-[10px] font-black text-[#B45309] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                  ⏸️ Llevo tiempo sin leer
                </span>
              )}

              {/* Estado de lectura del usuario */}
              {manga.status === 'completed' ? (
                <span className="text-[10px] font-bold text-[#6D28D9] bg-[#EDE9FE] px-2 py-0.5 rounded-full border border-[#C4B5FD]">
                  🏁 Terminado
                </span>
              ) : manga.status === 'paused' ? (
                <span className="text-[10px] font-bold text-[#D97706] bg-[#FEF3C7] px-2 py-0.5 rounded-full border border-[#FDE68A]">
                  ⏸️ En pausa
                </span>
              ) : manga.status === 'deleted' ? (
                <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                  🗑️ En papelera
                </span>
              ) : (
                <span className="text-[10px] font-bold text-[#2563EB] bg-[#EFF6FF] px-2 py-0.5 rounded-full border border-[#BFDBFE]">
                  📖 Leyendo (Activo)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Reading Duration Highlight Box */}
        {(manga.readingMonths || 0) > 0 && (
          <div className="bg-gradient-to-r from-[#F5F3FF] to-[#FDF4FF] border border-[#E9D5FF] rounded-2xl p-3.5 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-white shadow-xs flex items-center justify-center text-lg">
                ⏱️
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-[#7C3AED] uppercase tracking-wider block">
                  Antigüedad de Lectura
                </span>
                <span className="text-sm font-black text-[#1E1238]">
                  Llevas {durationText}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-black text-[#EC4899] bg-white px-2 py-1 rounded-xl shadow-xs">
              Fidelidad
            </span>
          </div>
        )}

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="p-3 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280] uppercase">
              <Calendar className="w-3.5 h-3.5 text-[#7C3AED]" />
              <span>Iniciado</span>
            </div>
            <div className="text-xs font-black text-[#1E1238] mt-1 truncate">
              {formattedStarted}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280] uppercase">
              <Clock className="w-3.5 h-3.5 text-[#EC4899]" />
              <span>Última Lectura</span>
            </div>
            <div className="text-xs font-black text-[#1E1238] mt-1 truncate">
              {formatRelativeTimeSpanish(manga.lastReadAt)}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280] uppercase">
              <BookOpen className="w-3.5 h-3.5 text-[#F59E0B]" />
              <span>Progreso Actual</span>
            </div>
            <div className="text-xs font-black text-[#1E1238] mt-1">
              Cap. {manga.currentChapter} de {manga.totalChapters}
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60">
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B7280] uppercase">
              <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
              <span>Restantes</span>
            </div>
            <div className="text-xs font-black text-[#1E1238] mt-1">
              {Math.max(0, manga.totalChapters - manga.currentChapter)} caps por leer
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
            <span>Avance general:</span>
            <span className="font-black text-[#7C3AED]">{percentage}% completado</span>
          </div>
          <div className="w-full h-3 rounded-full bg-[#EDE9FE] overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] to-[#EC4899] transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        {/* Genres */}
        <div>
          <span className="text-[10px] font-extrabold text-[#6B7280] uppercase tracking-wider block mb-2">
            Géneros & Etiquetas
          </span>
          <div className="flex flex-wrap gap-1.5">
            {manga.genres.map((g) => (
              <span
                key={g}
                className="text-[11px] font-bold text-[#6D28D9] bg-[#F3E8FF] px-3 py-1 rounded-full"
              >
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Status Actions */}
        {manga.status === 'deleted' ? (
          <div className="pt-2 border-t border-rose-100 flex flex-col gap-2">
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-rose-700">
              <span className="text-base">🗑️</span>
              <span className="text-[11px] font-bold">
                Este manhwa está en la papelera de borrados.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  onUpdateStatus(manga.id, 'reading');
                  onClose();
                }}
                className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-[#047857] text-white shadow-xs hover:bg-[#065f46]"
              >
                <RotateCcw className="w-4 h-4" /> Restaurar a biblioteca
              </button>
              {onDeletePermanently && (
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        `¿Estás segura de eliminar permanentemente "${manga.title}" de la base de datos? Esta acción es irreversible.`
                      )
                    ) {
                      onDeletePermanently(manga.id);
                      onClose();
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all bg-rose-100 text-rose-700 hover:bg-rose-600 hover:text-white"
                >
                  <Trash2 className="w-4 h-4" /> Eliminar definitivo
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="pt-2 border-t border-[#F3E8FF] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => onUpdateStatus(manga.id, 'reading')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  manga.status === 'reading'
                    ? 'bg-[#7C3AED] text-white shadow-xs'
                    : 'bg-[#F3EFFC] text-[#6B7280] hover:text-[#1E1238]'
                }`}
              >
                <PlayCircle className="w-4 h-4" /> Leyendo
              </button>
              <button
                onClick={() => onUpdateStatus(manga.id, 'completed')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  manga.status === 'completed'
                    ? 'bg-[#10B981] text-white shadow-xs'
                    : 'bg-[#F3EFFC] text-[#6B7280] hover:text-[#1E1238]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" /> Terminado
              </button>
              <button
                onClick={() => onUpdateStatus(manga.id, 'paused')}
                className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                  manga.status === 'paused'
                    ? 'bg-[#F59E0B] text-white shadow-xs'
                    : 'bg-[#F3EFFC] text-[#6B7280] hover:text-[#1E1238]'
                }`}
              >
                <PauseCircle className="w-4 h-4" /> Pausa
              </button>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => {
                  if (
                    window.confirm(
                      `¿Mover "${manga.title}" a la papelera de borrados? No aparecerá en tu biblioteca activa, pero podrás restaurarlo cuando quieras.`
                    )
                  ) {
                    onUpdateStatus(manga.id, 'deleted');
                    onClose();
                  }
                }}
                className="text-[11px] font-bold text-rose-500 hover:text-rose-700 hover:bg-rose-50 px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" /> Mover a borrados
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modalContent, document.body) : modalContent;
};
