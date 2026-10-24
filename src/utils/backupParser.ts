import { ungzip } from 'pako';
import protobuf from 'protobufjs';

const PROTO_DEF = `
syntax = "proto3";
package tachiyomi;

message Backup {
  repeated BackupManga backupManga = 1;
}

message BackupManga {
  int64 source = 1;
  string url = 2;
  string title = 3;
  optional string artist = 4;
  optional string author = 5;
  optional string description = 6;
  repeated string genre = 7;
  int32 status = 8;
  optional string thumbnailUrl = 9;
  int64 dateAdded = 13;
  repeated BackupChapter chapters = 16;
  bool favorite = 100;
  repeated BackupHistory history = 104;
}

message BackupChapter {
  string url = 1;
  string name = 2;
  optional string scanlator = 3;
  bool read = 4;
  bool bookmark = 5;
  int64 lastPageRead = 6;
  float chapterNumber = 9;
}

message BackupHistory {
  string url = 1;
  int64 lastRead = 2;
  int64 readDuration = 3;
}
`;

const NSFW_KEYWORDS = new Set([
  '18+',
  '+18',
  'adult',
  'adulthood',
  'mature',
  'smut',
  'hentai',
  'ecchi',
  'erotica',
  'erotico',
  'erótico',
  'gore',
  'porn',
  'nsfw',
  'r-18',
  'r18',
  'doujinshi',
  'sex',
  'sexual',
  'bloody',
]);

export function isNsfw(genres: string[] = [], title: string = '', description: string = ''): boolean {
  const allTerms = [
    ...(Array.isArray(genres) ? genres : []),
    ...title.toLowerCase().split(/[\s,.-]+/),
  ];

  for (const term of allTerms) {
    const clean = String(term).trim().toLowerCase();
    if (NSFW_KEYWORDS.has(clean)) {
      return true;
    }
  }

  const combined = (title + ' ' + (Array.isArray(genres) ? genres.join(' ') : '') + ' ' + description).toLowerCase();
  if (combined.includes('+18') || combined.includes('18+') || combined.includes('r-18') || combined.includes('nsfw')) {
    return true;
  }

  return false;
}

export function calculateReadingMonths(startedAt?: string | null, lastReadAt: string | Date = new Date()): number {
  if (!startedAt) return 0;
  const start = new Date(startedAt);
  const end = new Date(lastReadAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
}

export interface ParsedBackupResult {
  mangas: {
    id: string;
    title: string;
    coverUrl?: string;
    currentChapter: number;
    totalChapters: number;
    status: 'reading' | 'completed' | 'paused';
    isFavorite: boolean;
    genres: string[];
    author?: string;
    artist?: string;
    source?: string;
    started_at?: string;
    last_read_at?: string;
    reading_months?: number;
  }[];
  history: {
    manga_id: string;
    manga_title: string;
    chapter_number: number;
    readAt: string;
  }[];
  filteredNsfwCount?: number;
}

/**
 * Parses either a JSON export file or a gzipped .tachibk backup file from Mihon.
 */
export async function parseMihonBackupFile(file: File): Promise<ParsedBackupResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let jsonContent: unknown = null;

  // 1. Check if it's GZIP compressed (0x1f, 0x8b magic header)
  let payloadBytes = bytes;
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      payloadBytes = ungzip(bytes);
    } catch (e) {
      console.warn('GZIP decompression error:', e);
    }
  }

  // 2. Try JSON parse
  try {
    const text = new TextDecoder('utf-8').decode(payloadBytes);
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      jsonContent = JSON.parse(text);
      return normalizeBackupJson(jsonContent);
    }
  } catch (e) {
    // Not valid JSON, proceed with protobuf decoding
  }

  // 3. Protobuf decoding
  try {
    const root = protobuf.parse(PROTO_DEF).root;
    const BackupType = root.lookupType('tachiyomi.Backup');
    const decoded = BackupType.decode(payloadBytes);
    const obj = BackupType.toObject(decoded, {
      longs: Number,
      enums: String,
      bytes: String,
      defaults: true,
      arrays: true,
    });
    return normalizeBackupJson(obj);
  } catch (err) {
    console.warn('Protobuf decode fallback to heuristic scanner:', err);
    return parseProtobufHeuristic(payloadBytes);
  }
}

function normalizeBackupJson(data: any): ParsedBackupResult {
  const result: ParsedBackupResult = {
    mangas: [],
    history: [],
    filteredNsfwCount: 0,
  };

  if (!data) return result;

  const rawMangas = data.backupManga || data.mangas || (Array.isArray(data) ? data : []);

  for (const item of rawMangas) {
    const mangaData = item.manga || item;
    if (!mangaData || !mangaData.title) continue;

    const title = String(mangaData.title).trim();
    const genres: string[] = Array.isArray(mangaData.genre)
      ? mangaData.genre
      : (Array.isArray(mangaData.genres) ? mangaData.genres : []);

    // FILTER OUT +18 / NSFW MANGA
    if (isNsfw(genres, title, mangaData.description || '')) {
      result.filteredNsfwCount = (result.filteredNsfwCount || 0) + 1;
      continue;
    }

    const chapters = item.chapters || mangaData.chapters || [];
    const historyList = item.history || mangaData.history || [];

    // Calculate dates
    let earliestTimestamp: number | null = null;
    let latestTimestamp: number | null = null;

    if (mangaData.dateAdded && Number(mangaData.dateAdded) > 0) {
      earliestTimestamp = Number(mangaData.dateAdded);
    }

    for (const h of historyList) {
      const readAt = Number(h.lastRead);
      if (readAt > 0) {
        if (!earliestTimestamp || readAt < earliestTimestamp) {
          earliestTimestamp = readAt;
        }
        if (!latestTimestamp || readAt > latestTimestamp) {
          latestTimestamp = readAt;
        }
      }
    }

    const readChapters = chapters.filter((c: any) => c.read);
    const maxRead = readChapters.reduce((max: number, c: any) => Math.max(max, Number(c.chapterNumber || 0)), 0);

    const id = (mangaData.id || mangaData.url || mangaData.title).toString();
    const coverUrl = mangaData.thumbnailUrl || mangaData.coverUrl || '';
    const currentChapter = maxRead || Number(mangaData.currentChapter || 0);
    const totalChapters = chapters.length || Number(mangaData.totalChapters || currentChapter);

    const startedDate = earliestTimestamp ? new Date(earliestTimestamp).toISOString() : new Date().toISOString();
    const lastReadDate = latestTimestamp ? new Date(latestTimestamp).toISOString() : startedDate;
    const readingMonths = calculateReadingMonths(startedDate, lastReadDate);

    const mangaItem = {
      id,
      title,
      coverUrl,
      currentChapter,
      totalChapters,
      status: 'reading' as const,
      isFavorite: Boolean(mangaData.favorite || mangaData.isFavorite),
      genres,
      author: mangaData.author || '',
      artist: mangaData.artist || '',
      source: mangaData.source?.toString() || '',
      started_at: startedDate,
      last_read_at: lastReadDate,
      reading_months: readingMonths,
    };

    result.mangas.push(mangaItem);

    // Extract history events
    for (const h of historyList) {
      if (h.lastRead && Number(h.lastRead) > 0) {
        const matchingChapter = chapters.find((c: any) => c.url === h.url);
        const chapterNum = matchingChapter ? Number(matchingChapter.chapterNumber) : 1;

        result.history.push({
          manga_id: id,
          manga_title: title,
          chapter_number: chapterNum,
          readAt: new Date(Number(h.lastRead)).toISOString(),
        });
      }
    }
  }

  // Also process standalone history if present
  const rawHistory = data.history || data.backupHistory || [];
  for (const h of rawHistory) {
    if (h.manga_title || h.title) {
      result.history.push({
        manga_id: (h.manga_id || h.url || 'backup').toString(),
        manga_title: h.manga_title || h.title || 'Manga',
        chapter_number: Number(h.chapter_number || h.lastRead || 1),
        readAt: h.readAt || (h.lastRead ? new Date(Number(h.lastRead)).toISOString() : new Date().toISOString()),
      });
    }
  }

  return result;
}

/**
 * Basic heuristic scanner for binary protobuf .tachibk files to recover titles
 */
function parseProtobufHeuristic(bytes: Uint8Array): ParsedBackupResult {
  const result: ParsedBackupResult = {
    mangas: [],
    history: [],
  };

  // Convert to text with replacement characters to find readable strings
  const text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  // Match common patterns in Tachiyomi/Mihon protobuf (URLs, titles)
  const lines = text.split(/[\x00-\x1F\x7F-\x9F]+/);
  const potentialTitles = new Set<string>();

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.length >= 3 && trimmed.length <= 80 && /^[\p{L}\p{N}\s:!?-]+$/u.test(trimmed)) {
      if (!['http', 'https', 'content', 'schema', 'backup'].some(prefix => trimmed.toLowerCase().startsWith(prefix))) {
        potentialTitles.add(trimmed);
      }
    }
  }

  let idx = 1;
  for (const title of potentialTitles) {
    result.mangas.push({
      id: `manga-bk-${idx++}`,
      title,
      currentChapter: 1,
      totalChapters: 1,
      status: 'reading',
      isFavorite: false,
      genres: ['Manga'],
    });
  }

  return result;
}
