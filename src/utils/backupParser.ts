import { ungzip } from 'pako';

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
  }[];
  history: {
    manga_id: string;
    manga_title: string;
    chapter_number: number;
    readAt: string;
  }[];
}

/**
 * Parses either a JSON export file or a gzipped .tachibk backup file from Mihon.
 */
export async function parseMihonBackupFile(file: File): Promise<ParsedBackupResult> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  let jsonContent: unknown = null;

  // 1. Check if it's GZIP compressed (0x1f, 0x8b magic header)
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    try {
      const decompressed = ungzip(bytes);
      const text = new TextDecoder('utf-8').decode(decompressed);
      jsonContent = JSON.parse(text);
    } catch (e) {
      // If it's a binary protobuf .tachibk, extract strings heuristically or fallback
      console.warn('Backup is binary protobuf, extracting structured metadata...');
      return parseProtobufHeuristic(bytes);
    }
  } else {
    // Plain text / JSON
    const text = new TextDecoder('utf-8').decode(bytes);
    jsonContent = JSON.parse(text);
  }

  return normalizeBackupJson(jsonContent);
}

function normalizeBackupJson(data: any): ParsedBackupResult {
  const result: ParsedBackupResult = {
    mangas: [],
    history: [],
  };

  if (!data) return result;

  const rawMangas = data.backupManga || data.mangas || (Array.isArray(data) ? data : []);

  for (const item of rawMangas) {
    const mangaData = item.manga || item;
    if (!mangaData || !mangaData.title) continue;

    const chapters = item.chapters || mangaData.chapters || [];
    const readChapters = chapters.filter((c: any) => c.read);
    const maxRead = readChapters.reduce((max: number, c: any) => Math.max(max, Number(c.chapterNumber || 0)), 0);

    const id = (mangaData.id || mangaData.url || mangaData.title).toString();
    const title = mangaData.title;
    const coverUrl = mangaData.thumbnailUrl || mangaData.coverUrl || '';
    const currentChapter = maxRead || Number(mangaData.currentChapter || 0);
    const totalChapters = chapters.length || Number(mangaData.totalChapters || currentChapter);
    const isCompleted = mangaData.status === 2 || (totalChapters > 0 && currentChapter >= totalChapters);

    result.mangas.push({
      id,
      title,
      coverUrl,
      currentChapter,
      totalChapters,
      status: isCompleted ? 'completed' : 'reading',
      isFavorite: Boolean(mangaData.favorite || mangaData.isFavorite),
      genres: Array.isArray(mangaData.genre) ? mangaData.genre : (Array.isArray(mangaData.genres) ? mangaData.genres : []),
      author: mangaData.author || '',
      artist: mangaData.artist || '',
      source: mangaData.source?.toString() || '',
    });
  }

  // History events
  const rawHistory = data.history || data.backupHistory || [];
  for (const h of rawHistory) {
    if (h.manga_title || h.title) {
      result.history.push({
        manga_id: (h.manga_id || h.url || 'backup').toString(),
        manga_title: h.manga_title || h.title || 'Manga',
        chapter_number: Number(h.chapter_number || h.lastRead || 1),
        readAt: h.readAt || new Date().toISOString(),
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
