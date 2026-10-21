import React from 'react';
import { BookOpen, Clock, CheckCircle2, Award, Calendar, Zap, PieChart as PieIcon, BarChart2 } from 'lucide-react';
import { MonthlyChart } from '../charts/MonthlyChart';
import { GenreDonutChart } from '../charts/GenreDonutChart';
import { ReadingStats } from '../../types/tracker';

interface StatisticsTabProps {
  stats: ReadingStats;
}

export const StatisticsTab: React.FC<StatisticsTabProps> = ({ stats }) => {
  return (
    <div className="space-y-5 pb-24 animate-fadeIn">
      {/* Title */}
      <div className="pt-1">
        <h1 className="text-2xl font-extrabold text-white tracking-tight">Estadísticas</h1>
        <p className="text-xs text-gray-400">Análisis detallado de tus hábitos de lectura</p>
      </div>

      {/* Global Stats Widget (3 key metrics) */}
      <div className="grid grid-cols-3 gap-2.5">
        {/* Total Chapters */}
        <div className="rounded-2xl bg-[#140f26] border border-purple-900/40 p-3 flex flex-col items-center text-center shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="p-2 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 mb-2">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="text-xl font-black text-white">{stats.totalChaptersRead}</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight mt-0.5">
            Capítulos Leídos
          </span>
        </div>

        {/* Estimated Hours */}
        <div className="rounded-2xl bg-[#140f26] border border-purple-900/40 p-3 flex flex-col items-center text-center shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mb-2">
            <Clock className="w-4 h-4" />
          </div>
          <span className="text-xl font-black text-white">{stats.estimatedHoursRead}h</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight mt-0.5">
            Horas (~10m/cap)
          </span>
        </div>

        {/* Mangas Completed */}
        <div className="rounded-2xl bg-[#140f26] border border-purple-900/40 p-3 flex flex-col items-center text-center shadow-[0_4px_16px_rgba(0,0,0,0.3)]">
          <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 mb-2">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <span className="text-xl font-black text-white">{stats.totalMangaCompleted}</span>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-tight mt-0.5">
            Completados
          </span>
        </div>
      </div>

      {/* Monthly Chapters Chart Widget */}
      <div className="rounded-2xl bg-[#141026] border border-purple-900/40 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-purple-400" />
            <div>
              <h2 className="text-base font-bold text-white">Lectura Mensual (2026)</h2>
              <p className="text-xs text-gray-400">Total de capítulos leídos en los 12 meses</p>
            </div>
          </div>
          <span className="text-xs font-bold text-purple-300 bg-purple-950/60 px-2 py-1 rounded-lg border border-purple-800/40">
            {stats.monthlyActivity.reduce((acc, curr) => acc + curr.chapters, 0)} caps en el año
          </span>
        </div>

        <MonthlyChart data={stats.monthlyActivity} />
      </div>

      {/* Records & Insights Card */}
      <div className="rounded-2xl bg-gradient-to-br from-[#191131] to-[#110c22] border border-purple-800/40 p-4 shadow-[0_8px_25px_rgba(168,85,247,0.1)]">
        <div className="flex items-center gap-2 mb-3">
          <Award className="w-4 h-4 text-purple-400" />
          <h2 className="text-base font-bold text-white">Récords & Hábitos Clave</h2>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Most Active Day */}
          <div className="p-3 rounded-xl bg-[#15102a]/80 border border-purple-900/30">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Calendar className="w-3.5 h-3.5 text-purple-400" />
              <span>Día Más Activo</span>
            </div>
            <div className="text-base font-extrabold text-white">{stats.mostActiveDay}</div>
            <span className="text-[11px] text-purple-300 font-semibold">
              Media de {stats.mostActiveDayAvg} capítulos
            </span>
          </div>

          {/* Favorite Reading Time */}
          <div className="p-3 rounded-xl bg-[#15102a]/80 border border-purple-900/30">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-1">
              <Clock className="w-3.5 h-3.5 text-purple-400" />
              <span>Horario Preferido</span>
            </div>
            <div className="text-base font-extrabold text-white">{stats.favoriteReadingTime}</div>
            <span className="text-[11px] text-purple-300 font-semibold">Sesiones nocturnas</span>
          </div>
        </div>
      </div>

      {/* Genre Distribution (Donut Chart) */}
      <div className="rounded-2xl bg-[#141026] border border-purple-900/40 p-4 shadow-[0_8px_30px_rgba(0,0,0,0.4)]">
        <div className="flex items-center gap-2 mb-3">
          <PieIcon className="w-4 h-4 text-purple-400" />
          <div>
            <h2 className="text-base font-bold text-white">Distribución por Géneros</h2>
            <p className="text-xs text-gray-400">Porcentaje de capítulos leídos por categoría</p>
          </div>
        </div>

        <div className="mt-2">
          <GenreDonutChart data={stats.genreDistribution} />
        </div>

        {/* Legend Pills */}
        <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-purple-900/30">
          {stats.genreDistribution.map((item) => (
            <div
              key={item.genre}
              className="flex items-center justify-between p-2 rounded-xl bg-[#17122e]/60 border border-purple-900/20"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs font-semibold text-gray-200 truncate">{item.genre}</span>
              </div>
              <span className="text-xs font-mono font-bold text-purple-300 ml-1">
                {item.percentage}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
