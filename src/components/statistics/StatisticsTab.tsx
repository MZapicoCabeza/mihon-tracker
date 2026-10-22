import React, { useState } from 'react';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Award,
  Calendar,
  BarChart2,
  PieChart as PieIcon,
  Trophy,
  Sparkles,
  Flame,
  TrendingUp,
  History,
  Layers,
  Zap,
  Bookmark,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { MonthlyChart } from '../charts/MonthlyChart';
import { WeeklyChart } from '../charts/WeeklyChart';
import { GenreDonutChart } from '../charts/GenreDonutChart';
import { ContributionHeatmap } from '../charts/ContributionHeatmap';
import { ReaderWrappedModal } from './ReaderWrappedModal';
import { MangaDetailModal } from '../library/MangaDetailModal';
import { MangaItem, MangaStatus, ReadingStats } from '../../types/tracker';

interface StatisticsTabProps {
  stats: ReadingStats;
  mangas?: MangaItem[];
  onToggleFavorite?: (id: string) => void;
  onUpdateStatus?: (id: string, status: MangaStatus) => void;
}

type SubSection = 'actividad' | 'historia' | 'mangas' | 'habitos';
type MetricUnit = 'chapters' | 'hours' | 'days' | 'series';

export const StatisticsTab: React.FC<StatisticsTabProps> = ({
  stats,
  mangas = [],
  onToggleFavorite = () => {},
  onUpdateStatus = () => {},
}) => {
  const [activeSection, setActiveSection] = useState<SubSection>('actividad');
  const [metricUnit, setMetricUnit] = useState<MetricUnit>('chapters');
  const [isWrappedOpen, setIsWrappedOpen] = useState(false);
  const [selectedManga, setSelectedManga] = useState<MangaItem | null>(null);

  // Derived calculations
  const totalAnnualChapters = stats.monthlyActivity.reduce((acc, curr) => acc + curr.chapters, 0);

  // Top longest read mangas
  const topLongestRead = [...mangas]
    .filter((m) => (m.readingMonths || 0) > 0)
    .sort((a, b) => (b.readingMonths || 0) - (a.readingMonths || 0))
    .slice(0, 6);

  // Helper unit converter
  const getMetricDisplay = (chapters: number) => {
    switch (metricUnit) {
      case 'hours':
        return `${Math.round((chapters * 10) / 60)}h`;
      case 'days':
        return `${Math.max(1, Math.round(chapters / 10))}d`;
      case 'series':
        return `${Math.max(1, Math.round(chapters / 25))} ser`;
      default:
        return `${chapters} caps`;
    }
  };

  return (
    <div className="space-y-4 pb-28 animate-fadeIn">
      {/* Top Header Section with Aesthetic from Reference */}
      <div className="pt-2 px-1">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#7C3AED]">
              Análisis & Registro
            </span>
            <h1 className="text-xl font-black text-[#1E1238] tracking-tight">
              MÉTRICAS & HISTORIA
            </h1>
          </div>

          {/* Wrapped Button */}
          <button
            onClick={() => setIsWrappedOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-[#A855F7] to-[#EC4899] text-white text-xs font-black shadow-md shadow-purple-500/25 hover:scale-105 active:scale-95 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tu Año</span>
          </button>
        </div>

        {/* 4 Category Pills (Actividad, Mi Historia, Mangas, Hábitos) */}
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-white border border-[#E9D5FF]/70 shadow-xs overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSection('actividad')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeSection === 'actividad'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            📊 Actividad
          </button>
          <button
            onClick={() => setActiveSection('historia')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeSection === 'historia'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            👑 Tu Historia
          </button>
          <button
            onClick={() => setActiveSection('mangas')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeSection === 'mangas'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            📚 Mangas
          </button>
          <button
            onClick={() => setActiveSection('habitos')}
            className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black whitespace-nowrap transition-all ${
              activeSection === 'habitos'
                ? 'bg-gradient-to-r from-[#8B5CF6] to-[#7C3AED] text-white shadow-xs'
                : 'text-[#6B7280] hover:text-[#1E1238]'
            }`}
          >
            ⚡ Hábitos
          </button>
        </div>
      </div>

      {/* ============================================================ */}
      {/* SECTION 1: ACTIVIDAD (Semanal, Calendario, Evolución Anual)   */}
      {/* ============================================================ */}
      {activeSection === 'actividad' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Unit Metric Switcher */}
          <div className="flex items-center justify-between px-1 text-xs">
            <span className="font-bold text-[#6B7280] text-[11px]">Unidad de medida:</span>
            <div className="flex items-center gap-1 bg-white border border-[#E9D5FF]/60 p-0.5 rounded-full text-[10px] font-bold">
              {(['chapters', 'hours', 'series', 'days'] as MetricUnit[]).map((unit) => (
                <button
                  key={unit}
                  onClick={() => setMetricUnit(unit)}
                  className={`px-2.5 py-1 rounded-full capitalize transition-all ${
                    metricUnit === unit ? 'bg-[#7C3AED] text-white shadow-xs' : 'text-[#6B7280]'
                  }`}
                >
                  {unit === 'chapters' ? 'Caps' : unit === 'hours' ? 'Horas' : unit === 'series' ? 'Series' : 'Días'}
                </button>
              ))}
            </div>
          </div>

          {/* Weekly Highlights Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider block">
                  Esta Semana
                </span>
                <h3 className="text-sm font-black text-[#1E1238]">ACTIVIDAD SEMANAL</h3>
              </div>
              {stats.weeklyComparison && (
                <span className="text-xs font-black text-[#10B981] bg-[#ECFDF5] border border-[#A7F3D0] px-2.5 py-0.5 rounded-full">
                  {stats.weeklyComparison.percentDiff >= 0 ? '+' : ''}{stats.weeklyComparison.percentDiff}% vs sem. ant.
                </span>
              )}
            </div>

            <WeeklyChart data={stats.weeklyActivity} />

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#F3E8FF] text-center">
              <div className="p-2 rounded-xl bg-[#FAF5FF]">
                <span className="text-[10px] text-[#6B7280] font-bold block">Total Semana</span>
                <span className="text-sm font-black text-[#7C3AED]">
                  {stats.weeklyComparison?.thisWeek || 88} caps
                </span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF5FF]">
                <span className="text-[10px] text-[#6B7280] font-bold block">Día Récord</span>
                <span className="text-sm font-black text-[#1E1238]">Martes (35)</span>
              </div>
              <div className="p-2 rounded-xl bg-[#FAF5FF]">
                <span className="text-[10px] text-[#6B7280] font-bold block">Media Diaria</span>
                <span className="text-sm font-black text-[#F59E0B]">
                  {stats.weeklyComparison?.dailyAverage || '12.6'}/día
                </span>
              </div>
            </div>
          </div>

          {/* GitHub-style Contribution Heatmap */}
          <ContributionHeatmap
            heatmapData={stats.heatmapData}
            monthlyComparison={stats.monthlyComparison}
          />

          {/* Annual Evolution Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider block">
                  Año 2026
                </span>
                <h3 className="text-sm font-black text-[#1E1238]">EVOLUCIÓN ANUAL</h3>
              </div>
              <span className="text-xs font-black text-[#7C3AED] bg-[#F3E8FF] px-2.5 py-0.5 rounded-full">
                {totalAnnualChapters} caps en total
              </span>
            </div>

            <MonthlyChart data={stats.monthlyActivity} />

            <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#F3E8FF]">
              <div className="p-3 rounded-2xl bg-[#F7F5FC]">
                <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Mes Más Activo</span>
                <span className="text-xs font-black text-[#1E1238]">
                  Enero 2026 ({stats.recordMonth?.chapters || 475} caps)
                </span>
              </div>
              <div className="p-3 rounded-2xl bg-[#F7F5FC]">
                <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Tendencia</span>
                <span className="text-xs font-black text-[#10B981]">
                  📈 +23% más que en 2025
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 2: TU HISTORIA COMO LECTORA (Hitos, Años, Récords)   */}
      {/* ============================================================ */}
      {activeSection === 'historia' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Hero Banner: Tu Historia Lectora */}
          <div className="rounded-3xl p-5 text-white bg-gradient-to-tr from-[#6D28D9] via-[#8B5CF6] to-[#EC4899] shadow-lg shadow-purple-500/20 space-y-4 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />

            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FDF4FF] bg-white/20 px-2.5 py-0.5 rounded-full inline-block">
                Desde hace más de 2 años…
              </span>
              <h2 className="text-xl font-black mt-2 text-white">TU HISTORIA LECTORA</h2>
              <p className="text-xs text-white/80 font-medium">
                Primer capítulo registrado el 12 de septiembre de 2024
              </p>
            </div>

            {/* 4 Core Life Stats */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 text-center">
              <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md">
                <span className="text-2xl font-black block leading-none">
                  {stats.yearsActiveLabel || '2 años'}
                </span>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight mt-1 block">
                  Antigüedad Lectora
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md">
                <span className="text-2xl font-black block leading-none">
                  {stats.totalChaptersRead}
                </span>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight mt-1 block">
                  Capítulos Totales
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md">
                <span className="text-2xl font-black block leading-none">
                  {stats.totalMangaInLibrary || mangas.length || 434}
                </span>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight mt-1 block">
                  Series Leídas
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-white/15 backdrop-blur-md">
                <span className="text-2xl font-black block leading-none">
                  {stats.distinctActiveDays || 532}
                </span>
                <span className="text-[10px] font-bold text-white/80 uppercase tracking-tight mt-1 block">
                  Días Activos
                </span>
              </div>
            </div>
          </div>

          {/* Timeline of Reading Life by Year */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-[#7C3AED]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1238]">LÍNEA TEMPORAL DE TU VIDA LECTORA</h3>
                <p className="text-[11px] font-medium text-[#6B7280]">Evolución año a año de tu biblioteca</p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {(stats.timelineByYear || [
                { year: '2024', chapters: 801, series: 56 },
                { year: '2025', chapters: 2277, series: 145 },
                { year: '2026', chapters: 2800, series: 182 },
              ]).map((item) => (
                <div
                  key={item.year}
                  className="p-3 rounded-2xl bg-[#FAF9FE] border border-[#E9D5FF]/60 flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-[#F3E8FF] flex items-center justify-center font-black text-sm text-[#7C3AED]">
                      {item.year}
                    </span>
                    <div>
                      <span className="text-xs font-black text-[#1E1238] block">
                        {item.chapters} capítulos leídos
                      </span>
                      <span className="text-[11px] text-[#6B7280] font-semibold">
                        {item.series} series activas
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-black text-[#7C3AED] bg-white px-2.5 py-1 rounded-xl shadow-2xs">
                    {Math.round((item.chapters * 10) / 60)}h leídas
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Reading Anniversaries & Milestones */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#F59E0B]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1238]">ANIVERSARIOS & HITOS LECTORES</h3>
                <p className="text-[11px] font-medium text-[#6B7280]">Momentos especiales de tu biblioteca</p>
              </div>
            </div>

            <div className="space-y-2 pt-1 text-xs">
              <div className="p-3 rounded-2xl bg-[#FEF3C7]/40 border border-[#FDE68A] flex items-center gap-2.5">
                <span className="text-xl">🎂</span>
                <div>
                  <span className="font-black text-[#92400E] block">
                    23 Meses con *A la amante de mi esposo*
                  </span>
                  <span className="text-[11px] text-[#B45309]">
                    Empezaste a leerla en octubre de 2024 y ya has alcanzado el cap. 118.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#EDE9FE]/50 border border-[#DDD6FE] flex items-center gap-2.5">
                <span className="text-xl">🏆</span>
                <div>
                  <span className="font-black text-[#5B21B6] block">
                    Hito Superado: Más de 5.000 Capítulos
                  </span>
                  <span className="text-[11px] text-[#6D28D9]">
                    Has acumulado un total de 5.878 capítulos leídos en tu historia.
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FCE7F3]/40 border border-[#FBCFE8] flex items-center gap-2.5">
                <span className="text-xl">⛵</span>
                <div>
                  <span className="font-black text-[#9D174D] block">
                    17 Meses leyendo *ONE PIECE*
                  </span>
                  <span className="text-[11px] text-[#BE185D]">
                    Has alcanzado el capítulo 1.004 de 1.084 disponibles.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Historical Records */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-[#EC4899]" />
              <h3 className="text-sm font-black text-[#1E1238]">RÉCORDS HISTÓRICOS</h3>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-purple-100">
                <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Récord en 1 Día</span>
                <span className="text-base font-black text-[#7C3AED]">
                  {stats.recordDay?.chapters || 107} caps
                </span>
                <span className="text-[9px] text-[#9CA3AF] block mt-0.5">
                  19 nov 2025
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-purple-100">
                <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Récord en 1 Mes</span>
                <span className="text-base font-black text-[#EC4899]">
                  {stats.recordMonth?.chapters || 475} caps
                </span>
                <span className="text-[9px] text-[#9CA3AF] block mt-0.5">
                  Enero 2026
                </span>
              </div>

              <div className="p-3 rounded-2xl bg-[#FAF5FF] border border-purple-100">
                <span className="text-[10px] text-[#6B7280] font-bold block uppercase">Mayor Racha</span>
                <span className="text-base font-black text-[#F59E0B]">
                  {stats.longestStreakDays || 17} días
                </span>
                <span className="text-[9px] text-[#9CA3AF] block mt-0.5">
                  Consecutivos
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 3: TUS MANGAS (Biblioteca en números, rankings, etc) */}
      {/* ============================================================ */}
      {activeSection === 'mangas' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Library Overview Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black text-[#7C3AED] uppercase tracking-wider block">
                  Colección
                </span>
                <h3 className="text-sm font-black text-[#1E1238]">TU BIBLIOTECA EN NÚMEROS</h3>
              </div>
              <span className="text-xs font-black text-[#7C3AED] bg-[#F3E8FF] px-2.5 py-0.5 rounded-full">
                {stats.libraryOverview?.libraryCompletionRate || 69}% completada
              </span>
            </div>

            {/* 4 Status Boxes */}
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="p-2.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0]">
                <span className="text-lg font-black text-[#047857] block">
                  {stats.libraryOverview?.reading || 296}
                </span>
                <span className="text-[10px] font-bold text-[#065F46] uppercase">En Curso</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#EDE9FE] border border-[#C4B5FD]">
                <span className="text-lg font-black text-[#6D28D9] block">
                  {stats.libraryOverview?.completed || 138}
                </span>
                <span className="text-[10px] font-bold text-[#5B21B6] uppercase">Terminadas</span>
              </div>

              <div className="p-2.5 rounded-2xl bg-[#FEF3C7] border border-[#FDE68A]">
                <span className="text-lg font-black text-[#B45309] block">
                  {stats.libraryOverview?.paused || 0}
                </span>
                <span className="text-[10px] font-bold text-[#92400E] uppercase">En Pausa</span>
              </div>
            </div>

            {/* Progress Bar of whole collection */}
            <div className="pt-2 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-[#6B7280]">
                <span>Capítulos leídos vs disponibles:</span>
                <span className="font-black text-[#1E1238]">
                  {Math.round(stats.libraryOverview?.totalReadChapters || 25765)} / {Math.round(stats.libraryOverview?.totalAvailableChapters || 37205)} caps
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#EDE9FE] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#8B5CF6] via-[#EC4899] to-[#F59E0B]"
                  style={{ width: `${stats.libraryOverview?.libraryCompletionRate || 69}%` }}
                />
              </div>
            </div>
          </div>

          {/* Ranking: Mangas con Más Tiempo de Lectura */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-[#F59E0B]" />
                <div>
                  <h3 className="text-sm font-black text-[#1E1238]">MAYOR FIDELIDAD DE LECTURA</h3>
                  <p className="text-[11px] font-medium text-[#6B7280]">Obras que más tiempo llevas leyendo</p>
                </div>
              </div>
              <span className="text-[10px] font-black text-[#7C3AED] bg-[#F3E8FF] px-2 py-0.5 rounded-full">
                Podio
              </span>
            </div>

            <div className="space-y-2 pt-1">
              {topLongestRead.map((manga, idx) => (
                <div
                  key={manga.id}
                  onClick={() => setSelectedManga(manga)}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF9FE] border border-[#E9D5FF]/60 hover:border-[#8B5CF6] transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shadow-xs flex-shrink-0 ${
                        idx === 0
                          ? 'bg-[#FEF08A] text-[#854D0E]'
                          : idx === 1
                          ? 'bg-[#E2E8F0] text-[#334155]'
                          : idx === 2
                          ? 'bg-[#FED7AA] text-[#9A3412]'
                          : 'bg-white text-[#6B7280]'
                      }`}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-[#1E1238] truncate group-hover:text-[#7C3AED]">
                        {manga.title}
                      </h4>
                      <p className="text-[10px] font-medium text-[#6B7280] truncate">
                        {manga.startedAt ? `Desde ${new Date(manga.startedAt).toLocaleDateString('es-ES', { month: 'short', year: 'numeric' })}` : ''} • Cap. {manga.currentChapter}/{manga.totalChapters}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs font-black text-[#7C3AED] bg-white px-2.5 py-1 rounded-xl shadow-2xs flex-shrink-0 ml-2">
                    ⏱️ {manga.readingMonths} meses
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Maratones: Series devoradas en poco tiempo */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#EC4899]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1238]">GRANDES MARATONES</h3>
                <p className="text-[11px] font-medium text-[#6B7280]">Series donde leíste más de 15 capítulos en un solo día</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {(stats.habits?.marathons || []).map((m, idx) => (
                <div
                  key={`${m.manga_title}-${idx}`}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#FAF5FF] border border-[#F3E8FF]"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-black text-[#1E1238] truncate block">
                      {m.manga_title}
                    </span>
                    <span className="text-[10px] text-[#6B7280] font-medium">
                      📅 {m.read_date}
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#EC4899] bg-white px-2.5 py-1 rounded-xl shadow-2xs flex-shrink-0">
                    🔥 {m.chapters} caps/día
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Retaken Series: Series retomadas tras meses */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Bookmark className="w-4 h-4 text-[#10B981]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1238]">SERIES RETOMADAS</h3>
                <p className="text-[11px] font-medium text-[#6B7280]">Obras que volviste a leer tras meses de pausa</p>
              </div>
            </div>

            <div className="space-y-2 pt-1">
              {(stats.habits?.retakenSeries || []).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-[#F0FDF4] border border-[#DCFCE7]"
                >
                  <div className="min-w-0 pr-2">
                    <span className="text-xs font-black text-[#1E1238] truncate block">
                      {s.title}
                    </span>
                    <span className="text-[10px] text-[#059669] font-medium">
                      ⏱️ {s.reading_months} meses de acompañamiento
                    </span>
                  </div>
                  <span className="text-xs font-black text-[#047857] bg-white px-2.5 py-1 rounded-xl shadow-2xs flex-shrink-0">
                    Retomada ✨
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* SECTION 4: HÁBITOS (Mapa de calor 365d, Horas, Ritmo)        */}
      {/* ============================================================ */}
      {activeSection === 'habitos' && (
        <div className="space-y-4 animate-fadeIn">
          {/* Full Heatmap */}
          <ContributionHeatmap
            heatmapData={stats.heatmapData}
            monthlyComparison={stats.monthlyComparison}
          />

          {/* Reading Schedule & Sessions Card */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#7C3AED]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1238]">RITMO & PATRONES DE LECTURA</h3>
                <p className="text-[11px] font-medium text-[#6B7280]">Cómo y cuándo lees tus mangas</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <div className="p-3.5 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60 space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase block">
                  Horario Favorito
                </span>
                <span className="text-sm font-black text-[#7C3AED] block">
                  {stats.favoriteReadingTime}
                </span>
                <span className="text-[10px] text-[#9CA3AF] block">
                  Mayor concentración de eventos
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60 space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase block">
                  Día de la Semana
                </span>
                <span className="text-sm font-black text-[#EC4899] block">
                  {stats.mostActiveDay}
                </span>
                <span className="text-[10px] text-[#9CA3AF] block">
                  Tu día más productivo
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60 space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase block">
                  Sesiones de Lectura
                </span>
                <span className="text-sm font-black text-[#F59E0B] block">
                  {stats.habits?.totalSessions || 780} sesiones
                </span>
                <span className="text-[10px] text-[#9CA3AF] block">
                  Intervalos continuos de lectura
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F7F5FC] border border-[#E9D5FF]/60 space-y-1">
                <span className="text-[10px] font-bold text-[#6B7280] uppercase block">
                  Ritmo por Sesión
                </span>
                <span className="text-sm font-black text-[#10B981] block">
                  ~{stats.habits?.avgChaptersPerSession || '7.5'} caps/sesión
                </span>
                <span className="text-[10px] text-[#9CA3AF] block">
                  Velocidad de avance estimada
                </span>
              </div>
            </div>
          </div>

          {/* Genre Distribution Donut */}
          <div className="glass-card p-5 space-y-3">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-[#7C3AED]" />
              <div>
                <h3 className="text-sm font-black text-[#1E1238]">DISTRIBUCIÓN POR GÉNEROS</h3>
                <p className="text-[11px] font-medium text-[#6B7280]">Tus temáticas predilectas</p>
              </div>
            </div>

            <div className="pt-2">
              <GenreDonutChart data={stats.genreDistribution} />
            </div>

            <div className="grid grid-cols-2 gap-2 pt-3 border-t border-[#F3E8FF]">
              {stats.genreDistribution.map((item) => (
                <div
                  key={item.genre}
                  className="flex items-center justify-between p-2 rounded-xl bg-[#FAF9FE] border border-[#E9D5FF]/60"
                >
                  <span className="text-xs font-black text-[#1E1238] truncate">{item.genre}</span>
                  <span className="text-xs font-black text-[#7C3AED] ml-1">
                    {item.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Manga Detail Modal */}
      <MangaDetailModal
        manga={selectedManga}
        onClose={() => setSelectedManga(null)}
        onToggleFavorite={onToggleFavorite}
        onUpdateStatus={onUpdateStatus}
      />

      {/* Reader Wrapped Modal */}
      {isWrappedOpen && (
        <ReaderWrappedModal
          stats={stats}
          mangas={mangas}
          onClose={() => setIsWrappedOpen(false)}
        />
      )}
    </div>
  );
};
