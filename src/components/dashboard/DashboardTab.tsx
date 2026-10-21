import React from 'react';
import { Flame, Clock, Sparkles, ChevronRight, Zap } from 'lucide-react';
import { WeeklyChart } from '../charts/WeeklyChart';
import { MangaItem, ReadingHistoryEvent, ReadingStats } from '../../types/tracker';
import { formatRelativeTimeSpanish, getCurrentDateFormattedSpanish, getGreetingSpanish } from '../../utils/dateUtils';

interface DashboardTabProps {
  stats: ReadingStats;
  recentEvents: ReadingHistoryEvent[];
  mangas: MangaItem[];
  onSelectManga: (mangaId: string) => void;
  onOpenWebhookModal: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  recentEvents,
  mangas,
  onSelectManga,
  onOpenWebhookModal,
}) => {
  const formattedDate = getCurrentDateFormattedSpanish();
  const greeting = getGreetingSpanish();

  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Top Header Card */}
      <div className="flex items-start justify-between pt-1">
        <div>
          <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            {formattedDate}
          </span>
          <h1 className="text-2xl font-extrabold text-white tracking-tight mt-0.5">
            {greeting}
          </h1>
        </div>

        {/* Live Mihon Sync Pill */}
        <button
          onClick={onOpenWebhookModal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-950/60 border border-purple-500/30 text-xs font-semibold text-purple-200 hover:bg-purple-900/60 hover:border-purple-400 transition-all shadow-[0_0_12px_rgba(168,85,247,0.2)]"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Mihon Fork Activo</span>
        </button>
      </div>

      {/* Streak & Quick Metric Widget */}
      <div className="grid grid-cols-2 gap-3">
        {/* Streak Card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1e1435] to-[#120d24] border border-orange-500/30 p-4 shadow-[0_8px_25px_rgba(249,115,22,0.12)]">
          <div className="absolute -top-3 -right-3 w-16 h-16 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-[0_0_12px_rgba(249,115,22,0.3)]">
              <Flame className="w-5 h-5 fill-orange-400 text-orange-500 animate-pulse" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Racha Actual</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">{stats.currentStreakDays}</span>
                <span className="text-xs font-bold text-orange-400">días</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">
            ¡Leíste hoy! Sigue así para no perder tu fuego 🔥
          </p>
        </div>

        {/* Reading Time Today */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1a1235] to-[#110c22] border border-purple-500/30 p-4 shadow-[0_8px_25px_rgba(168,85,247,0.12)]">
          <div className="absolute -top-3 -right-3 w-16 h-16 bg-purple-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              <Zap className="w-5 h-5 text-purple-300" />
            </div>
            <div>
              <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider">Capítulos Hoy</span>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black text-white">
                  {stats.weeklyActivity[stats.weeklyActivity.length - 1]?.chapters || 0}
                </span>
                <span className="text-xs font-bold text-purple-400">caps</span>
              </div>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 font-medium">
            ~{(stats.weeklyActivity[stats.weeklyActivity.length - 1]?.chapters || 0) * 10} mins de lectura invertidos
          </p>
        </div>
      </div>

      {/* Weekly Activity Chart Card */}
      <div className="rounded-2xl bg-[#141026] border border-purple-900/40 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <span>Actividad Semanal</span>
              <span className="text-[10px] font-semibold bg-purple-900/50 text-purple-300 px-2 py-0.5 rounded-full border border-purple-700/50">
                Últimos 7 días
              </span>
            </h2>
            <p className="text-xs text-gray-400">De lunes a domingo</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400">Total semana:</span>
            <span className="ml-1.5 text-sm font-bold text-purple-300">
              {stats.weeklyActivity.reduce((acc, curr) => acc + curr.chapters, 0)} caps
            </span>
          </div>
        </div>

        {/* Chart render */}
        <WeeklyChart data={stats.weeklyActivity} />
      </div>

      {/* Recently Read Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-400" />
            <h2 className="text-base font-bold text-white">Lecturas Recientes</h2>
          </div>
          <span className="text-xs text-purple-400/80">Sincronizado vía Mihon</span>
        </div>

        {/* Vertically scrolling list */}
        <div className="space-y-2.5">
          {recentEvents.map((event) => {
            const correspondingManga = mangas.find((m) => m.id === event.manga_id);
            return (
              <div
                key={event.id}
                onClick={() => onSelectManga(event.manga_id)}
                className="group flex items-center gap-3 p-2.5 rounded-xl bg-[#15102a]/80 hover:bg-[#1f173d] border border-purple-900/30 hover:border-purple-600/50 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-[0_4px_16px_rgba(168,85,247,0.15)]"
              >
                {/* Manga Cover */}
                <div className="relative w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-purple-950/40 border border-purple-800/30">
                  <img
                    src={event.cover_url || correspondingManga?.coverUrl}
                    alt={event.manga_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold text-purple-400 bg-purple-950/80 px-1.5 py-0.2 rounded border border-purple-800/40">
                      Cap. {event.chapter_number}
                    </span>
                    {event.genres?.[0] && (
                      <span className="text-[10px] text-gray-400 bg-gray-800/40 px-1.5 py-0.2 rounded">
                        {event.genres[0]}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white truncate mt-1 group-hover:text-purple-300 transition-colors">
                    {event.manga_title}
                  </h3>
                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-500" />
                    <span>{formatRelativeTimeSpanish(event.timestamp)}</span>
                  </div>
                </div>

                {/* Arrow Icon */}
                <div className="text-gray-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
