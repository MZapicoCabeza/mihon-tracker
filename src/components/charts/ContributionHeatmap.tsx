import React, { useState } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

interface ContributionHeatmapProps {
  heatmapData?: Record<string, number>;
  monthlyComparison?: {
    thisMonth: number;
    prevMonth: number;
    percentDiff: number;
    dailyAverage: string;
  };
}

export const ContributionHeatmap: React.FC<ContributionHeatmapProps> = ({
  heatmapData = {},
  monthlyComparison,
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [selectedMonthOffset, setSelectedMonthOffset] = useState<number>(0); // 0 = current month, -1 = last month...
  const [activeHoverDate, setActiveHoverDate] = useState<{ date: string; count: number } | null>(null);

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

  // Color generator based on chapters
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center text-[#7C3AED]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-black text-[#1E1238]">CALENDARIO DE LECTURA</h3>
            <p className="text-[11px] font-medium text-[#6B7280]">Mapa de actividad por días</p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center p-0.5 rounded-full bg-[#F3EFFC] border border-[#E9D5FF]/60 text-[10px] font-bold">
          <button
            onClick={() => setViewMode('monthly')}
            className={`px-2.5 py-1 rounded-full transition-all ${
              viewMode === 'monthly' ? 'bg-white text-[#7C3AED] shadow-xs' : 'text-[#6B7280]'
            }`}
          >
            Mes
          </button>
          <button
            onClick={() => setViewMode('yearly')}
            className={`px-2.5 py-1 rounded-full transition-all ${
              viewMode === 'yearly' ? 'bg-white text-[#7C3AED] shadow-xs' : 'text-[#6B7280]'
            }`}
          >
            Año (365d)
          </button>
        </div>
      </div>

      {viewMode === 'monthly' ? (
        <>
          {/* Month selector & Insights */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={() => setSelectedMonthOffset((prev) => prev - 1)}
              className="p-1 rounded-full hover:bg-[#F3EFFC] text-[#6B7280] transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="text-center">
              <span className="text-sm font-black text-[#1E1238]">
                {monthNames[currentMonth]} {currentYear}
              </span>
              <div className="flex items-center justify-center gap-2 text-[10px] text-[#6B7280] font-semibold mt-0.5">
                <span>{monthTotal} caps</span>
                <span>•</span>
                <span>{activeDaysInMonth} días leídos</span>
                <span>•</span>
                <span>Media {dailyAvg}/día</span>
              </div>
            </div>
            <button
              onClick={() => setSelectedMonthOffset((prev) => Math.min(0, prev + 1))}
              disabled={selectedMonthOffset >= 0}
              className={`p-1 rounded-full transition-colors ${
                selectedMonthOffset >= 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-[#F3EFFC] text-[#6B7280]'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Monthly Calendar Grid */}
          <div className="pt-2">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 text-center text-[10px] font-bold text-[#9CA3AF] mb-1">
              {dayLabels.map((lbl, idx) => (
                <div key={idx}>{lbl}</div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading padding slots */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-9 rounded-xl opacity-0" />
              ))}

              {monthDays.map((item) => (
                <div
                  key={item.dateStr}
                  onMouseEnter={() => setActiveHoverDate({ date: item.dateStr, count: item.count })}
                  onMouseLeave={() => setActiveHoverDate(null)}
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
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Yearly 52-week horizontal heatmap */
        <div className="pt-2 overflow-x-auto no-scrollbar">
          <div className="flex gap-1 pb-2 min-w-[560px]">
            {yearlyWeeks.map((week, wIdx) => (
              <div key={wIdx} className="flex flex-col gap-1">
                {week.map((day) => (
                  <div
                    key={day.dateStr}
                    title={`${day.dateStr}: ${day.count} capítulos`}
                    onMouseEnter={() => setActiveHoverDate({ date: day.dateStr, count: day.count })}
                    onMouseLeave={() => setActiveHoverDate(null)}
                    className={`w-2.5 h-2.5 rounded-sm transition-all hover:scale-125 ${
                      day.count === 0
                        ? 'bg-[#EDE9FE]/50'
                        : day.count <= 3
                        ? 'bg-[#C4B5FD]'
                        : day.count <= 8
                        ? 'bg-[#8B5CF6]'
                        : 'bg-[#6D28D9]'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[#9CA3AF] text-center pt-1 font-medium">
            365 días de lectura continua • Desplaza horizontalmente para ver todo el año
          </p>
        </div>
      )}

      {/* Hover Info / Tooltip Banner */}
      {activeHoverDate && (
        <div className="bg-[#FAF5FF] border border-[#E9D5FF] rounded-2xl p-2 text-center text-xs font-bold text-[#6D28D9] animate-fadeIn">
          📅 {activeHoverDate.date}: <span className="font-black">{activeHoverDate.count}</span> capítulos leídos
        </div>
      )}

      {/* Legend & Month Comparison Banner */}
      <div className="flex items-center justify-between pt-2 border-t border-[#F3E8FF] text-[10px] text-[#6B7280]">
        <div className="flex items-center gap-1.5">
          <span>Menos</span>
          <span className="w-2.5 h-2.5 rounded-sm bg-[#F3E8FF]" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#C4B5FD]" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CF6]" />
          <span className="w-2.5 h-2.5 rounded-sm bg-[#6D28D9]" />
          <span>Más</span>
        </div>

        {monthlyComparison && selectedMonthOffset === 0 && (
          <span className="font-extrabold text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
            {monthlyComparison.percentDiff >= 0 ? '+' : ''}{monthlyComparison.percentDiff}% vs mes anterior
          </span>
        )}
      </div>
    </div>
  );
};
