export type MangaStatus = 'reading' | 'completed' | 'paused' | 'deleted';

export interface MangaItem {
  id: string;
  title: string;
  coverUrl: string;
  currentChapter: number;
  totalChapters: number;
  status: MangaStatus;
  isFavorite: boolean;
  genres: string[];
  lastReadAt: string;
  startedAt?: string;
  readingMonths?: number;
  chaptersRemaining?: number;
  estimatedMinutesRemaining?: number;
  formattedTimeRemaining?: string;
  daysSinceLastRead?: number;
  readingRecency?: 'recent' | 'long_time';
  publicationStatus?: 'completed' | 'ongoing';
  canonicalKey?: string;
  author?: string;
  artist?: string;
  source?: string;
  rating?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReadingHistoryEvent {
  id: string;
  manga_id: string;
  manga_title: string;
  chapter_number: number;
  chapter_id?: string;
  cover_url: string;
  timestamp: string;
  received_at?: string;
  genres: string[];
  source?: string;
  event_hash?: string;
}

export interface ReadingStats {
  totalChaptersRead: number;
  estimatedHoursRead: number;
  totalMangaCompleted: number;
  totalMangaReading?: number;
  totalMangaInLibrary?: number;
  currentStreakDays: number;
  longestStreakDays?: number;
  distinctActiveDays?: number;
  earliestReadDate?: string;
  latestReadDate?: string;
  yearsActiveLabel?: string;
  mostActiveDay: string;
  mostActiveDayAvg: number;
  favoriteReadingTime: string;
  weeklyActivity: { day: string; shortDay: string; chapters: number; date: string }[];
  monthlyActivity: { month: string; shortMonth: string; chapters: number }[];
  genreDistribution: { genre: string; count: number; percentage: number; color: string }[];
  readingPace?: {
    averageSeconds: number;
    averageMinutes: number;
    mangaAverageMinutes?: number;
    formattedPace: string;
    totalSamples: number;
  };
  timeToCatchUp?: {
    pendingChapters: number;
    estimatedMinutes: number;
    formatted: string;
  };
  weeklyComparison?: {
    thisWeek: number;
    prevWeek: number;
    percentDiff: number;
    dailyAverage: string;
  };
  monthlyComparison?: {
    thisMonth: number;
    prevMonth: number;
    percentDiff: number;
    dailyAverage: string;
  };
  recordDay?: {
    date: string;
    chapters: number;
  };
  recordMonth?: {
    month: string;
    chapters: number;
  };
  timelineByYear?: {
    year: string;
    chapters: number;
    series: number;
  }[];
  heatmapData?: Record<string, number>;
  habits?: {
    totalSessions: number;
    avgChaptersPerSession: string;
    marathons: { manga_id: string; manga_title: string; read_date: string; chapters: number }[];
    retakenSeries: { id: string; title: string; cover_url: string; reading_months: number; chapters: number; first_read: string; last_read: string }[];
  };
  libraryOverview?: {
    reading: number;
    completed: number;
    paused: number;
    totalMangas: number;
    totalReadChapters: number;
    totalAvailableChapters: number;
    libraryCompletionRate: number;
  };
  lastSyncAt?: string | null;
}
