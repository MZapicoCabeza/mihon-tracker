import React, { useState } from 'react';
import { Flame, Clock, Sparkles, ChevronRight, Zap, BookOpen, Trophy, Radio, Share2 } from 'lucide-react';
import { WeeklyChart } from '../charts/WeeklyChart';
import { MangaItem, ReadingHistoryEvent, ReadingStats } from '../../types/tracker';
import { formatRelativeTimeSpanish } from '../../utils/dateUtils';

interface DashboardTabProps {
  stats: ReadingStats;
  recentEvents: ReadingHistoryEvent[];
  mangas: MangaItem[];
  onSelectManga: (mangaId: string) => void;
  onOpenWebhookModal: () => void;
  onOpenDownloadModal: () => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  stats,
  recentEvents,
  mangas,
  onSelectManga,
  onOpenWebhookModal,
  onOpenDownloadModal,
}) => {
  const [selectedDayIndex, setSelectedDayIndex] = useState(3); // Thursday / Jueves by default
  const [timeView, setTimeView] = useState<'daily' | 'weekly' | 'monthly'>('weekly');

  const daysOfWeek = [
    { day: 'LUN', date: 15 },
    { day: 'MAR', date: 16 },
    { day: 'MIÉ', date: 17 },
    { day: 'JUE', date: 18 },
    { day: 'VIE', date: 19 },
    { day: 'SÁB', date: 20 },
    { day: 'DOM', date: 21 },
  ];

  const totalWeekly = stats.weeklyActivity.reduce((acc, curr) => acc + curr.chapters, 0);

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Sage Green Header Section (Inspired by Image 1) */}
      <div className="-mx-4 -mt-3 bg-[#A8D5BA] border-b-[2px] border-[#2D2926] p-4 pt-5 rounded-b-[2.2rem] shadow-sm">
        {/* Top bar with Title & Action */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#FAF7F2] border-[1.5px] border-[#2D2926] flex items-center justify-center font-bold text-xs">
              ⚡
            </div>
            <div>
              <span className="text-[10px] font-extrabold tracking-wider text-[#35524A] uppercase">
                Mihon Tracker
              </span>
              <h1 className="text-xl font-black text-[#242220] tracking-tight leading-none">
                ACTIVIDAD
              </h1>
            </div>
          </div>

          <button
            onClick={onOpenWebhookModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#FAF7F2] border-[1.5px] border-[#2D2926] text-[11px] font-extrabold text-[#242220] hover:bg-white shadow-[0_2px_0px_#2D2926] transition-all"
          >
            <Radio className="w-3.5 h-3.5 text-[#52796F]" />
            <span>Sync</span>
          </button>
        </div>

        {/* Days of Week Horizontal Selector */}
        <div className="flex items-center justify-between pt-1">
          {daysOfWeek.map((item, idx) => {
            const isSelected = idx === selectedDayIndex;
            return (
              <button
                key={item.day}
                onClick={() => setSelectedDayIndex(idx)}
                className={`flex flex-col items-center justify-center py-2 px-2.5 rounded-full transition-all duration-200 ${
                  isSelected
                    ? 'bg-[#2D2926] text-[#FAF7F2] border-[1.5px] border-[#2D2926] shadow-sm'
                    : 'text-[#2D2926] hover:bg-white/40'
                }`}
              >
                <span className="text-[9px] font-extrabold tracking-wider">{item.day}</span>
                <span className="text-sm font-black mt-0.5">{item.date}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Big Metric Card with Capsule Progress Bar */}
      <div className="bg-white border-[1.8px] border-[#2D2926] rounded-3xl p-4 shadow-[0_4px_0px_#2D2926]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📖</span>
            <div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-[#242220]">
                  {stats.totalChaptersRead}
                </span>
                <span className="text-xs font-extrabold text-[#7A746E] uppercase">
                  Capítulos leídos
                </span>
              </div>
            </div>
          </div>
          <span className="text-[11px] font-extrabold text-[#242220] bg-[#F8C866] border-[1.5px] border-[#2D2926] px-2.5 py-1 rounded-full">
            META: 500
          </span>
        </div>

        {/* Capsule Progress Bar */}
        <div className="mt-3 w-full h-5 rounded-full bg-[#F0EBE1] border-[1.5px] border-[#2D2926] overflow-hidden p-0.5">
          <div
            className="h-full rounded-full bg-[#A8D5BA] border-[1px] border-[#2D2926] transition-all duration-500"
            style={{ width: `${Math.min(100, Math.round((stats.totalChaptersRead / 500) * 100))}%` }}
          />
        </div>
      </div>

      {/* 3 Metric Cards in a Row (Time, Streak, Completed) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Tiempo */}
        <div className="bg-white border-[1.8px] border-[#2D2926] rounded-2xl p-3 flex flex-col justify-between shadow-[0_3px_0px_#2D2926]">
          <div className="flex items-center justify-between text-[#5C5651]">
            <Clock className="w-4 h-4 text-[#52796F]" />
            <span className="text-[9px] font-extrabold uppercase text-[#8A847E]">Tiempo</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[#242220]">{stats.estimatedHoursRead}h</span>
            <p className="text-[10px] font-bold text-[#8A847E] truncate">Estimadas</p>
          </div>
        </div>

        {/* Racha */}
        <div className="bg-[#FFF5F2] border-[1.8px] border-[#2D2926] rounded-2xl p-3 flex flex-col justify-between shadow-[0_3px_0px_#2D2926]">
          <div className="flex items-center justify-between">
            <Flame className="w-4 h-4 fill-[#F6A596] text-[#E27D60]" />
            <span className="text-[9px] font-extrabold uppercase text-[#E27D60]">Racha</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[#242220]">{stats.currentStreakDays}d</span>
            <p className="text-[10px] font-bold text-[#D96D59] truncate">Fuego activo 🔥</p>
          </div>
        </div>

        {/* Mangas Completados */}
        <div className="bg-white border-[1.8px] border-[#2D2926] rounded-2xl p-3 flex flex-col justify-between shadow-[0_3px_0px_#2D2926]">
          <div className="flex items-center justify-between text-[#5C5651]">
            <Trophy className="w-4 h-4 text-[#F8C866]" />
            <span className="text-[9px] font-extrabold uppercase text-[#8A847E]">Terminados</span>
          </div>
          <div className="mt-2">
            <span className="text-xl font-black text-[#242220]">{stats.totalMangaCompleted}</span>
            <p className="text-[10px] font-bold text-[#8A847E] truncate">Mangas</p>
          </div>
        </div>
      </div>

      {/* Direct Mobile Download Banner (Warm Peach Pill) */}
      <div
        onClick={onOpenDownloadModal}
        className="cursor-pointer group flex items-center justify-between p-3.5 rounded-2xl bg-[#F6A596] border-[1.8px] border-[#2D2926] shadow-[0_4px_0px_#2D2926] hover:translate-y-[-1px] transition-all"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border-[1.5px] border-[#2D2926] flex items-center justify-center font-black text-base shadow-sm">
            📱
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-[#242220]">
                Descargar APK de Mihon
              </span>
              <span className="text-[10px] bg-white text-[#242220] font-black px-2 py-0.5 rounded-full border border-[#2D2926]">
                v0.21.2
              </span>
            </div>
            <p className="text-[11px] font-semibold text-[#3D2622] mt-0.5">
              Instalador para tu móvil Android (27.7 MB)
            </p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-white border-[1.5px] border-[#2D2926] flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
          <ChevronRight className="w-4 h-4 text-[#242220]" />
        </div>
      </div>

      {/* Activity Chart Section Card */}
      <div className="bg-white border-[1.8px] border-[#2D2926] rounded-3xl p-4 shadow-[0_4px_0px_#2D2926]">
        {/* Segmented Pill Selector (Daily / Weekly / Monthly) */}
        <div className="flex items-center justify-center gap-1.5 p-1 rounded-full bg-[#F5F0E8] border-[1.5px] border-[#2D2926] max-w-[260px] mx-auto mb-4">
          <button
            onClick={() => setTimeView('daily')}
            className={`flex-1 py-1 px-3 rounded-full text-[10px] font-extrabold uppercase transition-all ${
              timeView === 'daily'
                ? 'bg-[#2D2926] text-white shadow-sm'
                : 'text-[#6B6661] hover:text-[#242220]'
            }`}
          >
            Diario
          </button>
          <button
            onClick={() => setTimeView('weekly')}
            className={`flex-1 py-1 px-3 rounded-full text-[10px] font-extrabold uppercase transition-all ${
              timeView === 'weekly'
                ? 'bg-[#2D2926] text-white shadow-sm'
                : 'text-[#6B6661] hover:text-[#242220]'
            }`}
          >
            Semanal
          </button>
          <button
            onClick={() => setTimeView('monthly')}
            className={`flex-1 py-1 px-3 rounded-full text-[10px] font-extrabold uppercase transition-all ${
              timeView === 'monthly'
                ? 'bg-[#2D2926] text-white shadow-sm'
                : 'text-[#6B6661] hover:text-[#242220]'
            }`}
          >
            Mensual
          </button>
        </div>

        {/* Chart render */}
        <WeeklyChart data={stats.weeklyActivity} accentColor="green" />

        <div className="flex items-center justify-between pt-3 mt-2 border-t-[1.5px] border-[#F0EBE1] text-xs">
          <span className="font-extrabold text-[#7A746E]">Total de esta semana:</span>
          <span className="font-black text-[#242220] bg-[#FAF7F2] border border-[#2D2926] px-2.5 py-0.5 rounded-full">
            {totalWeekly} capítulos
          </span>
        </div>
      </div>

      {/* Recently Read Section */}
      <div className="space-y-2.5 pt-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-black text-[#242220] uppercase tracking-wider flex items-center gap-1.5">
            <span>Lecturas Recientes</span>
            <span className="w-2 h-2 rounded-full bg-[#52796F]" />
          </h2>
          <span className="text-[11px] font-extrabold text-[#7A746E]">Vía Mihon Webhook</span>
        </div>

        <div className="space-y-2.5">
          {recentEvents.map((event) => {
            const correspondingManga = mangas.find((m) => m.id === event.manga_id);
            return (
              <div
                key={event.id}
                onClick={() => onSelectManga(event.manga_id)}
                className="group flex items-center gap-3 p-2.5 rounded-2xl bg-white border-[1.8px] border-[#2D2926] hover:bg-[#FAF7F2] shadow-[0_3px_0px_#2D2926] transition-all cursor-pointer"
              >
                {/* Manga Cover */}
                <div className="relative w-12 h-16 rounded-xl overflow-hidden flex-shrink-0 border-[1.5px] border-[#2D2926] bg-[#F5F0E8]">
                  <img
                    src={event.cover_url || correspondingManga?.coverUrl}
                    alt={event.manga_title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    loading="lazy"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black text-[#242220] bg-[#C8B6E2] px-2 py-0.5 rounded-full border border-[#2D2926]">
                      Cap. {event.chapter_number}
                    </span>
                    {event.genres?.[0] && (
                      <span className="text-[10px] font-bold text-[#5C5651] bg-[#F5F0E8] px-2 py-0.5 rounded-full">
                        {event.genres[0]}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black text-[#242220] truncate mt-1">
                    {event.manga_title}
                  </h3>
                  <div className="flex items-center gap-1 text-[11px] font-bold text-[#8A847E] mt-0.5">
                    <Clock className="w-3 h-3 text-[#52796F]" />
                    <span>{formatRelativeTimeSpanish(event.timestamp)}</span>
                  </div>
                </div>

                {/* Arrow */}
                <div className="w-7 h-7 rounded-full bg-[#FAF7F2] border-[1.5px] border-[#2D2926] flex items-center justify-center text-[#242220] group-hover:translate-x-0.5 transition-transform">
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
