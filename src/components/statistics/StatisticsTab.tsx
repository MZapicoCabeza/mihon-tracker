import React from 'react';
import { BookOpen, Clock, CheckCircle2, Award, Calendar, BarChart2, PieChart as PieIcon } from 'lucide-react';
import { MonthlyChart } from '../charts/MonthlyChart';
import { GenreDonutChart } from '../charts/GenreDonutChart';
import { ReadingStats } from '../../types/tracker';

interface StatisticsTabProps {
  stats: ReadingStats;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ stats }) => {
  const totalAnnualChapters = stats.monthlyActivity.reduce((acc, curr) => acc + curr.chapters, 0);

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header Card (Lavender Section from Image 1) */}
      <div className="-mx-4 -mt-3 bg-[#C8B6E2] border-b-[2px] border-[#2D2926] p-4 pt-5 rounded-b-[2.2rem] shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold tracking-wider text-[#3D264A] uppercase">
              Métricas & Récords
            </span>
            <h1 className="text-xl font-black text-[#242220] tracking-tight leading-none">
              ESTADÍSTICAS
            </h1>
          </div>

          <span className="text-xs font-black text-[#242220] bg-white border-[1.5px] border-[#2D2926] px-3 py-1 rounded-full shadow-[0_2px_0px_#2D2926]">
            Año 2026
          </span>
        </div>
      </div>

      {/* Global Stats Widget (3 key metrics) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Chapters */}
        <div className="bg-white border-[1.8px] border-[#2D2926] rounded-2xl p-3 flex flex-col items-center text-center shadow-[0_3px_0px_#2D2926]">
          <div className="w-8 h-8 rounded-full bg-[#A8D5BA] border-[1.5px] border-[#2D2926] flex items-center justify-center mb-1.5 shadow-sm">
            <BookOpen className="w-4 h-4 text-[#242220]" />
          </div>
          <span className="text-2xl font-black text-[#242220]">{stats.totalChaptersRead}</span>
          <span className="text-[9px] font-black text-[#7A746E] uppercase tracking-tight mt-0.5">
            Capítulos
          </span>
        </div>

        {/* Estimated Hours */}
        <div className="bg-white border-[1.8px] border-[#2D2926] rounded-2xl p-3 flex flex-col items-center text-center shadow-[0_3px_0px_#2D2926]">
          <div className="w-8 h-8 rounded-full bg-[#B5E2FA] border-[1.5px] border-[#2D2926] flex items-center justify-center mb-1.5 shadow-sm">
            <Clock className="w-4 h-4 text-[#242220]" />
          </div>
          <span className="text-2xl font-black text-[#242220]">{stats.estimatedHoursRead}h</span>
          <span className="text-[9px] font-black text-[#7A746E] uppercase tracking-tight mt-0.5">
            Horas (~10m)
          </span>
        </div>

        {/* Mangas Completed */}
        <div className="bg-white border-[1.8px] border-[#2D2926] rounded-2xl p-3 flex flex-col items-center text-center shadow-[0_3px_0px_#2D2926]">
          <div className="w-8 h-8 rounded-full bg-[#F8C866] border-[1.5px] border-[#2D2926] flex items-center justify-center mb-1.5 shadow-sm">
            <CheckCircle2 className="w-4 h-4 text-[#242220]" />
          </div>
          <span className="text-2xl font-black text-[#242220]">{stats.totalMangaCompleted}</span>
          <span className="text-[9px] font-black text-[#7A746E] uppercase tracking-tight mt-0.5">
            Completados
          </span>
        </div>
      </div>

      {/* Monthly Chapters Chart Widget */}
      <div className="bg-white border-[1.8px] border-[#2D2926] rounded-3xl p-4 shadow-[0_4px_0px_#2D2926]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-[#242220]" />
            <div>
              <h2 className="text-sm font-black text-[#242220] uppercase">Lectura Mensual</h2>
              <p className="text-[11px] font-bold text-[#8A847E]">12 meses del año</p>
            </div>
          </div>
          <span className="text-xs font-black text-[#242220] bg-[#FAF7F2] border border-[#2D2926] px-2.5 py-0.5 rounded-full">
            {totalAnnualChapters} caps en total
          </span>
        </div>

        <MonthlyChart data={stats.monthlyActivity} />
      </div>

      {/* Records & Insights Card (Pastel boxes) */}
      <div className="bg-white border-[1.8px] border-[#2D2926] rounded-3xl p-4 shadow-[0_4px_0px_#2D2926] space-y-3">
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-[#E27D60]" />
          <h2 className="text-sm font-black text-[#242220] uppercase">Récords & Hábitos Clave</h2>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Most Active Day */}
          <div className="p-3 rounded-2xl bg-[#FFF5F2] border-[1.5px] border-[#2D2926]">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-[#D96D59] mb-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Día Más Activo</span>
            </div>
            <div className="text-base font-black text-[#242220]">{stats.mostActiveDay}</div>
            <span className="text-[10px] font-bold text-[#7A746E]">
              Media de {stats.mostActiveDayAvg} capítulos
            </span>
          </div>

          {/* Favorite Reading Time */}
          <div className="p-3 rounded-2xl bg-[#F0F7F4] border-[1.5px] border-[#2D2926]">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase text-[#52796F] mb-1">
              <Clock className="w-3.5 h-3.5" />
              <span>Horario Favorito</span>
            </div>
            <div className="text-base font-black text-[#242220]">{stats.favoriteReadingTime}</div>
            <span className="text-[10px] font-bold text-[#7A746E]">Sesión nocturna 🌙</span>
          </div>
        </div>
      </div>

      {/* Genre Distribution (Donut Chart) */}
      <div className="bg-white border-[1.8px] border-[#2D2926] rounded-3xl p-4 shadow-[0_4px_0px_#2D2926]">
        <div className="flex items-center gap-2 mb-2">
          <PieIcon className="w-4 h-4 text-[#242220]" />
          <div>
            <h2 className="text-sm font-black text-[#242220] uppercase">Distribución por Géneros</h2>
            <p className="text-[11px] font-bold text-[#8A847E]">Porcentaje de capítulos leídos</p>
          </div>
        </div>

        {stats.genreDistribution.length === 0 ? (
          <div className="py-8 text-center text-xs text-[#7A746E]">
            <p className="font-black text-[#242220]">Sin datos de géneros aún</p>
            <p className="mt-1 text-[11px]">Lee capítulos en Mihon para desbloquear el gráfico de géneros.</p>
          </div>
        ) : (
          <>
            <div className="mt-2">
              <GenreDonutChart data={stats.genreDistribution} />
            </div>

            {/* Legend Chips in Soft Pastels */}
            <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t-[1.5px] border-[#F0EBE1]">
              {stats.genreDistribution.map((item, idx) => {
                const pastelColors = ['#97CAA8', '#F6A596', '#C8B6E2', '#F8C866', '#B5E2FA'];
                const chipBg = pastelColors[idx % pastelColors.length];
                return (
                  <div
                    key={item.genre}
                    className="flex items-center justify-between p-2 rounded-xl border-[1.5px] border-[#2D2926] bg-[#FAF7F2]"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-full border border-[#2D2926] flex-shrink-0"
                        style={{ backgroundColor: chipBg }}
                      />
                      <span className="text-xs font-black text-[#242220] truncate">{item.genre}</span>
                    </div>
                    <span className="text-xs font-black font-mono text-[#242220] ml-1">
                      {item.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
