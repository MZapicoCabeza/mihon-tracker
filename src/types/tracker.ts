export type MangaStatus = 'reading' | 'completed' | 'paused';

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
}

export interface ReadingStats {
  totalChaptersRead: number;
  estimatedHoursRead: number;
  totalMangaCompleted: number;
  totalMangaReading?: number;
  totalMangaInLibrary?: number;
  currentStreakDays: number;
  mostActiveDay: string;
  mostActiveDayAvg: number;
  favoriteReadingTime: string;
  weeklyActivity: { day: string; shortDay: string; chapters: number; date: string }[];
  monthlyActivity: { month: string; shortMonth: string; chapters: number }[];
  genreDistribution: { genre: string; count: number; percentage: number; color: string }[];
  lastSyncAt?: string | null;
}
