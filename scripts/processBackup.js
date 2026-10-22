import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
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
  'borderline',
  'bloody',
]);

export function isNsfw(genres = [], title = '', description = '') {
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

  // Also check substring patterns like "+18" or "18+"
  const combined = (title + ' ' + (Array.isArray(genres) ? genres.join(' ') : '')).toLowerCase();
  if (combined.includes('+18') || combined.includes('18+') || combined.includes('r-18') || combined.includes('nsfw')) {
    return true;
  }

  return false;
}

export function calculateReadingMonths(startedAt, lastReadAt = new Date()) {
  if (!startedAt) return 0;
  const start = new Date(startedAt);
  const end = new Date(lastReadAt);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return 0;

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  const totalMonths = yearDiff * 12 + monthDiff;
  return Math.max(0, totalMonths);
}

export function parseTachibkBuffer(buffer) {
  let bytes = buffer;

  // 1. Decompress if GZIP (magic bytes 0x1f, 0x8b)
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    bytes = zlib.gunzipSync(bytes);
  }

  // 2. Try JSON first (in case it was exported as plain JSON)
  try {
    const text = new TextDecoder('utf-8').decode(bytes);
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      const json = JSON.parse(text);
      return processRawBackupData(json);
    }
  } catch (e) {
    // Not JSON, proceed with protobuf
  }

  // 3. Protobuf decode
  const root = protobuf.parse(PROTO_DEF).root;
  const BackupType = root.lookupType('tachiyomi.Backup');
  const decoded = BackupType.decode(bytes);
  const data = BackupType.toObject(decoded, {
    longs: Number,
    enums: String,
    bytes: String,
    defaults: true,
    arrays: true,
  });

  return processRawBackupData(data);
}

function processRawBackupData(data) {
  const rawMangas = data.backupManga || data.mangas || (Array.isArray(data) ? data : []);
  const cleanMangas = [];
  const filteredNsfw = [];
  const allHistoryEvents = [];

  for (const item of rawMangas) {
    const mangaData = item.manga || item;
    if (!mangaData || !mangaData.title) continue;

    const title = mangaData.title.trim();
    const genres = Array.isArray(mangaData.genre) ? mangaData.genre : (Array.isArray(mangaData.genres) ? mangaData.genres : []);

    // FILTER OUT +18 / NSFW MANGA
    if (isNsfw(genres, title, mangaData.description || '')) {
      filteredNsfw.push({ title, genres });
      continue;
    }

    const chapters = item.chapters || mangaData.chapters || [];
    const historyList = item.history || mangaData.history || [];

    // Calculate dates
    let earliestTimestamp = null;
    let latestTimestamp = null;

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

    const readChapters = chapters.filter((c) => c.read);
    const maxRead = readChapters.reduce((max, c) => Math.max(max, Number(c.chapterNumber || 0)), 0);
    const totalChapters = chapters.length || Number(mangaData.totalChapters || maxRead);

    const startedDate = earliestTimestamp ? new Date(earliestTimestamp).toISOString() : new Date().toISOString();
    const lastReadDate = latestTimestamp ? new Date(latestTimestamp).toISOString() : startedDate;
    const readingMonths = calculateReadingMonths(startedDate, lastReadDate);

    const mangaRecord = {
      id: (mangaData.id || mangaData.url || title).toString(),
      title,
      cover_url: mangaData.thumbnailUrl || mangaData.coverUrl || '',
      current_chapter: maxRead,
      total_chapters: totalChapters,
      status: mangaData.status === 2 || (totalChapters > 0 && maxRead >= totalChapters) ? 'completed' : 'reading',
      is_favorite: Boolean(mangaData.favorite || mangaData.isFavorite) ? 1 : 0,
      genres,
      author: mangaData.author || '',
      artist: mangaData.artist || '',
      source: String(mangaData.source || ''),
      started_at: startedDate,
      last_read_at: lastReadDate,
      reading_months: readingMonths,
    };

    cleanMangas.push(mangaRecord);

    // Extract history events with real timestamps
    for (const h of historyList) {
      if (h.lastRead && Number(h.lastRead) > 0) {
        // Find matching chapter number
        const matchingChapter = chapters.find((c) => c.url === h.url);
        const chapterNum = matchingChapter ? Number(matchingChapter.chapterNumber) : 1;

        allHistoryEvents.push({
          manga_id: mangaRecord.id,
          manga_title: title,
          chapter_number: chapterNum,
          timestamp: new Date(Number(h.lastRead)).toISOString(),
          source: 'backup-import',
        });
      }
    }
  }

  return {
    mangas: cleanMangas,
    history: allHistoryEvents,
    filteredNsfw,
  };
}
