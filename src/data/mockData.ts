import { MangaItem, ReadingHistoryEvent, ReadingStats } from '../types/tracker';

/**
 * Empty baseline state representing a freshly installed or unsynced tracker.
 * No fabricated numbers: all stats start at zero until real chapters are tracked.
 */
export const EMPTY_STATS: ReadingStats = {
  totalChaptersRead: 0,
  estimatedHoursRead: 0,
  totalMangaCompleted: 0,
  totalMangaReading: 0,
  totalMangaInLibrary: 0,
  currentStreakDays: 0,
  mostActiveDay: 'Sin actividad aún',
  mostActiveDayAvg: 0,
  favoriteReadingTime: 'Sin datos aún',
  weeklyActivity: [
    { day: 'Lunes', shortDay: 'Lun', chapters: 0, date: '' },
    { day: 'Martes', shortDay: 'Mar', chapters: 0, date: '' },
    { day: 'Miércoles', shortDay: 'Mié', chapters: 0, date: '' },
    { day: 'Jueves', shortDay: 'Jue', chapters: 0, date: '' },
    { day: 'Viernes', shortDay: 'Vie', chapters: 0, date: '' },
    { day: 'Sábado', shortDay: 'Sáb', chapters: 0, date: '' },
    { day: 'Domingo', shortDay: 'Dom', chapters: 0, date: '' },
  ],
  monthlyActivity: [
    { month: 'Mayo', shortMonth: 'May', chapters: 0 },
    { month: 'Junio', shortMonth: 'Jun', chapters: 0 },
    { month: 'Julio', shortMonth: 'Jul', chapters: 0 },
    { month: 'Agosto', shortMonth: 'Ago', chapters: 0 },
    { month: 'Septiembre', shortMonth: 'Sep', chapters: 0 },
    { month: 'Octubre', shortMonth: 'Oct', chapters: 0 },
  ],
  genreDistribution: [],
  heatmapData: {},
  dailyMangaCalendar: {},
  lastSyncAt: null,
};

/**
 * Optional demo sample data solely for local preview/development when explicitly toggled.
 * Never used as production source of truth.
 */
export const DEMO_SAMPLE_MANGAS: MangaItem[] = [
  {
    id: 'demo-1',
    title: 'One Piece (Demo)',
    coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&auto=format&fit=crop&q=80',
    currentChapter: 1115,
    totalChapters: 1120,
    status: 'reading',
    isFavorite: true,
    genres: ['Shonen', 'Acción', 'Aventura'],
    lastReadAt: new Date().toISOString(),
    author: 'Eiichiro Oda',
    rating: 9.8,
  },
];
