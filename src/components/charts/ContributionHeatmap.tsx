import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  Clock,
  Layers,
  Sparkles,
  BookOpen,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react';
import { DailyCalendarDay } from '../../types/tracker';
import { getCoverSrc } from '../../utils/coverUtils';

interface ContributionHeatmapProps {
  heatmapData?: Record<string, number>;
  dailyMangaCalendar?: Record<string, DailyCalendarDay>;
  monthlyComparison?: {
    thisMonth: number;
    prevMonth: number;
    percentDiff: number;
    dailyAverage: string;
  };
  onSelectManga?: (id: string) => void;
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  heatmapData = {},
  dailyMangaCalendar = {},
  monthlyComparison,
  onSelectManga,
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [calendarStyle, setCalendarStyle] = useState<'covers' | 'classic'>('covers');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = current month, -1 = last month...
  const [selectedDayDetail, setSelectedDayDetail] = useState<{
    dateStr: string;
    dayData: DailyCalendarDay | null;
    count: number;
  } | null>(null);

  // Month navigation
  const targetDate = new Date();
  targetDate.setMonth(targetDate.getMonth() + selectedMonthOffset);
  const currentYear = targetDate.getFullYear();
  const currentMonth = targetDate.getMonth(); // 0-indexed

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const dayLabels = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

  // Days in month
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(currentYear, currentMonth, 1).getDay() + 6) % 7; // Monday = 0

  // Calculate monthly stats
  let monthTotal = 0;
  let activeDaysInMonth = 0;
  let maxDayInMonth = 0;

  const monthDays = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const count = heatmapData[dateStr] || 0;
    monthTotal += count;
    if (count > 0) activeDaysInMonth++;
    if (count > maxDayInMonth) maxDayInMonth = count;
    monthDays.push({ day: d, dateStr, count });
  }

  const dailyAvg = (monthTotal / (daysInMonth || 30)).toFixed(1);

  // Helper date formatter in Spanish
  const formatFullDateSpanish = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const date = new Date(y, m - 1, d);
      const formatted = date.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      return formatted.charAt(0).toUpperCase() + formatted.slice(1);
    } catch (e) {
      return dateStr;
    }
  };

  // Color generator for classic heatmap view
  const getCellColor = (count: number) => {
    if (count === 0) return 'bg-[#F3E8FF]/40 text-[#9CA3AF]';
    if (count <= 3) return 'bg-[#DDD6FE] text-[#6D28D9] font-bold';
    if (count <= 8) return 'bg-[#A855F7] text-white font-bold shadow-xs';
    return 'bg-gradient-to-tr from-[#7C3AED] to-[#EC4899] text-white font-black shadow-sm';
  };

  // Generate 52 weeks for Yearly mode
  const generateYearlyWeeks = () => {
    const weeks = [];
    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - 364);

    let current = new Date(startDate);
    let currentWeek: { dateStr: string; count: number }[] = [];

    while (current <= today) {
      const dateStr = current.toISOString().slice(0, 10);
      const count = heatmapData[dateStr] || 0;
      currentWeek.push({ dateStr, count });

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
      current.setDate(current.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    return weeks;
  };

  const yearlyWeeks = viewMode === 'yearly' ? generateYearlyWeeks() : [];

  return (
    <div className="glass-card p-5 space-y-4">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED] shadow-2xs">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1E1238]">CALENDARIO DE LECTURA</h3>
            <p className="text-[11px] font-medium text-[#6B7280]">
              {calendarStyle === 'covers' && viewMode === 'monthly'
                ? 'Portadas de manhwas leídos por día'
                : 'Mapa de actividad por días'}
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {viewMode === 'monthly' && (
            <button
              onClick={() => setCalendarStyle(calendarStyle === 'covers' ? 'classic' : 'covers')}
              className={`p-1.5 rounded-full border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                calendarStyle === 'covers'
                  ? 'bg-[#F3E8FF] border-[#DDD6FE] text-[#7C3AED]'
                  : 'bg-white border-[#E9D5FF] text-[#6B7280]'
              }`}
              title={calendarStyle === 'covers' ? 'Ver vista clásica de colores' : 'Ver portadas de manhwas'}
            >
              <span>{calendarStyle === 'covers' ? '🖼️' : '🟩'}</span>
            </button>
          )}

          <div className="flex items-center p-0.5 rounded-full bg-[#F3EFFC] border border-[#E9D5FF]/60 text-[10px] font-bold">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                viewMode === 'monthly' ? 'bg-white text-[#7C3AED] shadow-xs' : 'text-[#6B7280]'
              }`}
            >
              Mes
            </button>
            <button
              onClick={() => setViewMode('yearly')}
              className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${
                viewMode === 'yearly' ? 'bg-white text-[#7C3AED] shadow-xs' : 'text-[#6B7280]'
              }`}
            >
              Año (365d)
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* Month selector & Insights */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
              className="p-1 rounded-full hover:bg-[#F3EFFC] text-[#6B7280] transition-colors cursor-pointer"
              aria-label="Mes anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            <div className="text-center">
              <span className="text-sm font-black text-[#1E1238]">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <div className="flex items-center justify-center gap-2 text-[10px] text-[#6B7280] font-semibold mt-0.5">
                <span className="text-[#7C3AED] font-bold">{monthTotal} caps</span>
                <span>•</span>
                <span>{activeDaysInMonth} días activos</span>
                <span>•</span>
                <span>Media {dailyAvg}/día</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedMonthOffset((prev) => Math.min(0, prev + 1))}
              disabled={selectedMonthOffset >= 0}
              className={`p-1 rounded-full transition-colors cursor-pointer ${
                selectedMonthOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#F3EFFC] text-[#6B7280]'
              }`}
              aria-label="Mes siguiente"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="pt-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-[#9CA3AF] mb-1.5">
              {dayLabels.map((lbl, idx) => (
                <div key={idx}>{lbl}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading padding slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div
                  key={`empty-${idx}`}
                  className={`${calendarStyle === 'covers' ? 'h-16 sm:h-20' : 'h-9'} rounded-2xl opacity-0`}
                />
              ))}

              {monthDays.map((item) => {
                const dayData = dailyMangaCalendar[item.dateStr] || null;
                const heroManga = dayData?.heroManga || null;
                const extraCount = (dayData?.mangas?.length || 1) - 1;

                // --- VISTA 1: PORTADA DESTACADA CON EFECTO PILA (+N) ---
                if (calendarStyle === 'covers') {
                  if (item.count === 0) {
                    return (
                      <div
                        key={item.dateStr}
                        className="h-16 sm:h-20 rounded-2xl bg-[#F7F5FC]/90 border border-[#E9D5FF]/40 flex flex-col items-center justify-center text-[#9CA3AF]"
                      >
                        <span className="text-xs font-semibold">{item.day}</span>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => setSelectedDayDetail({ dateStr: item.dateStr, dayData, count: item.count })}
                      className="h-16 sm:h-20 rounded-2xl relative overflow-hidden shadow-xs hover:shadow-md hover:scale-105 active:scale-95 transition-all cursor-pointer group border border-purple-200/60"
                      title={`${item.dateStr}: ${item.count} caps (${heroManga?.title || 'Lectura'})`}
                    >
                      {/* Hero Cover Image or Gradient fallback */}
                      {heroManga?.coverUrl ? (
                        <img
                          src={getCoverSrc(heroManga.coverUrl)}
                          alt={heroManga.title}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                          loading="lazy"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-tr from-[#7C3AED] via-[#C084FC] to-[#EC4899]" />
                      )}

                      {/* Ambient Contrast Gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/40" />

                      {/* Day Number (Top Left) */}
                      <span className="absolute top-1 left-1.5 text-[11px] font-black text-white drop-shadow-md z-10 leading-none">
                        {item.day}
                      </span>

                      {/* Stack Badge if Multiple Mangas (+N) (Top Right) */}
                      {extraCount > 0 && (
                        <span
                          className="absolute top-1 right-1 px-1.5 py-0.5 rounded-full bg-black/80 border border-white/25 text-[8px] font-black text-white shadow-xs backdrop-blur-2xs z-10 flex items-center gap-0.5"
                          title={`${extraCount + 1} obras leídas este día`}
                        >
                          <Layers className="w-2.5 h-2.5 text-[#C084FC]" />
                          <span>+{extraCount}</span>
                        </span>
                      )}

                      {/* Chapters Count Pill (Bottom Center) */}
                      <div className="absolute bottom-1 inset-x-1 z-10">
                        <span className="block text-center text-[8px] font-black text-white bg-black/55 backdrop-blur-2xs rounded-lg py-0.5 px-1 truncate shadow-xs">
                          {item.count} {item.count === 1 ? 'cap' : 'caps'}
                        </span>
                      </div>
                    </div>
                  );
                }

                // --- VISTA 2: CUADRÍCULA CLÁSICA HEATMAP ---
                return (
                  <div
                    key={item.dateStr}
                    onClick={() => {
                      if (item.count > 0) {
                        setSelectedDayDetail({ dateStr: item.dateStr, dayData, count: item.count });
                      }
                    }}
                    className={`h-9 rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer hover:scale-105 ${getCellColor(
                      item.count
                    )}`}
                  >
                    <span className="text-[11px] leading-none">{item.day}</span>
                    {item.count > 0 && (
                      <span className="text-[8px] font-black opacity-90 leading-none mt-0.5">
                        {item.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        /* Yearly 52-week horizontal heatmap */
        <div className="pt-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1 pb-2 min-w-[560px]">
            {yearlyWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((day) => {
                  const dayData = dailyMangaCalendar[day.dateStr] || null;
                  return (
                    <div
                      key={day.dateStr}
                      title={`${day.dateStr}: ${day.count} capítulos`}
                      onClick={() => {
                        if (day.count > 0) {
                          setSelectedDayDetail({ dateStr: day.dateStr, dayData, count: day.count });
                        }
                      }}
                      className={`w-2.5 h-2.5 rounded-sm transition-all hover:scale-125 cursor-pointer ${
                        day.count === 0
                          ? 'bg-[#EDE9FE]/50'
                          : day.count <= 3
                          ? 'bg-[#C4B5FD]'
                          : day.count <= 8
                          ? 'bg-[#8B5CF6]'
                          : 'bg-[#6D28D9]'
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#9CA3AF] text-center pt-1 font-medium">
            365 días de lectura continua • Pulsa cualquier día para ver las portadas
          </p>
        </div>
      )}

      {/* Legend & Month Comparison Banner */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F3E8FF] text-[10px] text-[#6B7280]">
        <div className="flex items-center gap-1.5">
          <span>{calendarStyle === 'covers' ? 'Portadas destacadas' : 'Menos'}</span>
          {calendarStyle === 'classic' && (
            <>
              <span className="w-2.5 h-2.5 rounded-sm bg-[#F3E8FF]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-[#C4B5FD]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CF6]" />
              <span className="w-2.5 h-2.5 rounded-sm bg-[#6D28D9]" />
              <span>Más</span>
            </>
          )}
        </div>

        {monthlyComparison && selectedMonthOffset === 0 && (
          <span className="font-extrabold text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
            {monthlyComparison.percentDiff >= 0 ? '+' : ''}{monthlyComparison.percentDiff}% vs mes anterior
          </span>
        )}
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM SHEET / PANEL DESLIZABLE INTERACTIVO AL TOCAR UN DÍA              */}
      {/* ========================================================================= */}
      {selectedDayDetail && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4 animate-fadeIn"
          onClick={() => setSelectedDayDetail(null)}
        >
          <div
            className="w-full max-w-md bg-white rounded-t-[2.5rem] sm:rounded-3xl p-5 shadow-2xl border-t sm:border border-purple-100 max-h-[82vh] overflow-y-auto no-scrollbar space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile drag handle bar */}
            <div className="w-12 h-1.5 rounded-full bg-[#E9D5FF] mx-auto -mt-2 mb-1 sm:hidden" />

            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-[#F3E8FF]">
              <div>
                <span className="text-[10px] font-black uppercase text-[#7C3AED] tracking-wider block">
                  Lecturas del Día
                </span>
                <h3 className="text-base font-black text-[#1E1238]">
                  {formatFullDateSpanish(selectedDayDetail.dateStr)}
                </h3>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280] mt-0.5">
                  <span className="text-[#047857] font-bold">
                    🔥 {selectedDayDetail.count} {selectedDayDetail.count === 1 ? 'capítulo' : 'capítulos'}
                  </span>
                  <span>•</span>
                  <span>
                    {selectedDayDetail.dayData?.mangas?.length || 1}{' '}
                    {(selectedDayDetail.dayData?.mangas?.length || 1) === 1 ? 'obra' : 'obras'}
                  </span>
                  <span>•</span>
                  <span>~{Math.round(selectedDayDetail.count * 3.8)} min</span>
                </div>
              </div>

              <button
                onClick={() => setSelectedDayDetail(null)}
                className="p-2 rounded-full bg-[#F3EFFC] text-[#6B7280] hover:text-[#1E1238] transition-colors cursor-pointer"
                aria-label="Cerrar detalle del día"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Manga cards list for this day */}
            <div className="space-y-2.5 pt-1">
              {selectedDayDetail.dayData?.mangas && selectedDayDetail.dayData.mangas.length > 0 ? (
                selectedDayDetail.dayData.mangas.map((manga) => (
                  <div
                    key={manga.id || manga.title}
                    onClick={() => {
                      if (onSelectManga && manga.id) {
                        onSelectManga(manga.id);
                        setSelectedDayDetail(null);
                      }
                    }}
                    className="flex items-center gap-3 p-3 rounded-2xl bg-[#FAF9FE] border border-purple-100/80 hover:border-purple-300 hover:bg-[#F5F3FF] transition-all cursor-pointer shadow-2xs group"
                  >
                    {/* Cover Thumbnail */}
                    <div className="w-14 h-20 rounded-xl overflow-hidden shadow-sm flex-shrink-0 bg-[#EDE9FE] relative">
                      {manga.coverUrl ? (
                        <img
                          src={getCoverSrc(manga.coverUrl)}
                          alt={manga.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-lg">📖</div>
                      )}
                    </div>

                    {/* Manga Info */}
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-black text-[#1E1238] truncate group-hover:text-[#7C3AED] transition-colors">
                        {manga.title}
                      </h4>
                      <p className="text-xs font-bold text-[#7C3AED] mt-0.5">
                        {manga.minChapter === manga.maxChapter
                          ? `Capítulo ${manga.minChapter}`
                          : `Capítulos ${manga.minChapter} al ${manga.maxChapter}`}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-[#6B7280] font-semibold mt-1.5">
                        <span className="bg-white border border-[#E9D5FF] px-2 py-0.5 rounded-full font-bold text-[#1E1238] shadow-2xs">
                          {manga.chaptersRead} {manga.chaptersRead === 1 ? 'cap' : 'caps'}
                        </span>
                        <span>⏱️ ~{Math.round(manga.chaptersRead * 3.8)} min</span>
                      </div>
                    </div>

                    <ChevronRightIcon className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#7C3AED] transition-colors flex-shrink-0" />
                  </div>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-[#6B7280] bg-[#FAF9FE] rounded-2xl border border-purple-100">
                  <BookOpen className="w-6 h-6 text-[#7C3AED] mx-auto mb-2" />
                  <p className="font-bold text-[#1E1238]">
                    {selectedDayDetail.count} capítulos registrados en este día
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
