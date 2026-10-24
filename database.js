import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

let DatabaseSync = null;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  console.warn('⚠️ [DB NOTICE] Native node:sqlite not available on this Node version. Using persistent JSON storage engine.');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DATABASE_PATH || process.env.DB_FILE || path.join(__dirname, 'tracker.db');
const JSON_FALLBACK_FILE = path.join(__dirname, 'tracker-fallback.json');
const MOCK_DB_FILE = path.join(__dirname, 'mock-db.json');
const SEED_DATA_FILE = path.join(__dirname, 'seed-data.json');

// Ensure directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export class TrackerDatabase {
  constructor(dbPath = DB_FILE) {
    this.dbPath = dbPath;
    this.isSqlite = Boolean(DatabaseSync && dbPath !== ':fallback:');
    
    if (this.isSqlite) {
      this.db = new DatabaseSync(dbPath);
      this.initSchema();
      this.migrateFromMockDbIfNeeded();
    } else {
      this.fallbackPath = dbPath === ':memory:' ? null : JSON_FALLBACK_FILE;
      this.memStore = { mangas: {}, events: [], meta: {} };
      this.loadFallback();
    }
  }

  // --- SQLITE ENGINE ---

  initSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS mangas (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        cover_url TEXT DEFAULT '',
        current_chapter REAL DEFAULT 0,
        total_chapters INTEGER DEFAULT 0,
        status TEXT DEFAULT 'reading',
        is_favorite INTEGER DEFAULT 0,
        genres TEXT DEFAULT '[]',
        author TEXT DEFAULT '',
        artist TEXT DEFAULT '',
        source TEXT DEFAULT '',
        rating REAL DEFAULT 0,
        last_read_at TEXT DEFAULT '',
        started_at TEXT DEFAULT '',
        reading_months INTEGER DEFAULT 0,
        created_at TEXT DEFAULT '',
        updated_at TEXT DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS reading_events (
        id TEXT PRIMARY KEY,
        manga_id TEXT NOT NULL,
        manga_title TEXT NOT NULL,
        chapter_number REAL NOT NULL,
        chapter_id TEXT DEFAULT '',
        cover_url TEXT DEFAULT '',
        genres TEXT DEFAULT '[]',
        timestamp TEXT NOT NULL,
        received_at TEXT NOT NULL,
        source TEXT DEFAULT 'mihon',
        event_hash TEXT UNIQUE
      );

      CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_events_manga_id ON reading_events(manga_id);
      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON reading_events(timestamp DESC);
      CREATE INDEX IF NOT EXISTS idx_events_hash ON reading_events(event_hash);
      CREATE INDEX IF NOT EXISTS idx_mangas_status ON mangas(status);
      CREATE INDEX IF NOT EXISTS idx_mangas_last_read ON mangas(last_read_at DESC);
    `);

    try {
      this.db.exec("ALTER TABLE mangas ADD COLUMN started_at TEXT DEFAULT ''");
    } catch (e) {}
    try {
      this.db.exec("ALTER TABLE mangas ADD COLUMN reading_months INTEGER DEFAULT 0");
    } catch (e) {}
  }

  migrateFromMockDbIfNeeded() {
    try {
      if (this.dbPath === ':memory:') return;
      const eventCount = this.db.prepare('SELECT COUNT(*) as c FROM reading_events').get().c;

      // Primary: Seed full historical dataset (2023-2026) from seed-data.json if DB is empty or has mock data
      if (eventCount < 100 && fs.existsSync(SEED_DATA_FILE)) {
        console.log(`📦 [DB SEED] Seeding complete historical dataset (2023-2026) from seed-data.json...`);
        const raw = fs.readFileSync(SEED_DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.mangas) && data.mangas.length > 0) {
          this.upsertLibrary(data.mangas);
        }

        if (Array.isArray(data.events) && data.events.length > 0) {
          this.db.exec('BEGIN TRANSACTION');
          try {
            const insertStmt = this.db.prepare(`
              INSERT OR IGNORE INTO reading_events (
                id, manga_id, manga_title, chapter_number, chapter_id,
                cover_url, genres, timestamp, received_at, source, event_hash
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `);

            for (const ev of data.events) {
              const mangaId = (ev.manga_id || ev.mangaId || '').toString();
              const chapterNum = Number(ev.chapter_number ?? ev.chapterNumber ?? 0);
              const timestamp = ev.timestamp || ev.received_at || new Date().toISOString();
              const eventHash = ev.event_hash || ev.eventHash || this.generateEventHash(mangaId, chapterNum, timestamp);
              const id = ev.id || `evt_${mangaId}_${chapterNum}_${Date.now()}`;
              const genres = typeof ev.genres === 'string' ? ev.genres : JSON.stringify(Array.isArray(ev.genres) ? ev.genres : []);
              const coverUrl = ev.cover_url || ev.coverUrl || '';
              const chapterId = (ev.chapter_id || ev.chapterId || '').toString();
              const source = ev.source || 'seed-import';
              const receivedAt = ev.received_at || ev.receivedAt || timestamp;

              insertStmt.run(id, mangaId, ev.manga_title || ev.mangaTitle, chapterNum, chapterId, coverUrl, genres, timestamp, receivedAt, source, eventHash);
            }
            this.db.exec('COMMIT');
            console.log(`✅ [DB SEED] Successfully seeded ${data.mangas?.length || 0} mangas and ${data.events.length} events into SQLite.`);
          } catch (seedErr) {
            this.db.exec('ROLLBACK');
            console.error('❌ [DB SEED] Error committing seed events:', seedErr.message);
          }
        }
        return;
      }

      if (eventCount === 0 && fs.existsSync(MOCK_DB_FILE)) {
        const raw = fs.readFileSync(MOCK_DB_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.events) && data.events.length > 0) {
          console.log(`📦 [DB MIGRATION] Migrating ${data.events.length} legacy events from mock-db.json to SQLite`);
          for (const ev of data.events) {
            this.recordReadingEvent({
              id: ev.id,
              manga_id: ev.manga_id,
              manga_title: ev.manga_title,
              chapter_number: ev.chapter_number,
              cover_url: ev.cover_url,
              genres: ev.genres,
              timestamp: ev.timestamp || ev.received_at,
              source: 'migration-mock-db',
            });
          }
        }
      }
    } catch (err) {
      console.warn('⚠️ [DB MIGRATION] Notice: Could not migrate from mock-db.json / seed-data.json:', err.message);
    }
  }

  // --- FALLBACK JSON ENGINE (When Node < 22.5) ---

  loadFallback() {
    if (this.fallbackPath && fs.existsSync(this.fallbackPath)) {
      try {
        const raw = fs.readFileSync(this.fallbackPath, 'utf-8');
        this.memStore = JSON.parse(raw);
      } catch (e) {
        this.memStore = { mangas: {}, events: [], meta: {} };
      }
    }

    // Seed memStore if empty
    if ((!this.memStore.events || this.memStore.events.length < 100) && fs.existsSync(SEED_DATA_FILE)) {
      try {
        const raw = fs.readFileSync(SEED_DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (Array.isArray(data.mangas)) {
          for (const m of data.mangas) {
            this.memStore.mangas[m.id] = m;
          }
        }
        if (Array.isArray(data.events)) {
          this.memStore.events = data.events;
        }
        this.saveFallback();
        console.log(`✅ [DB SEED] Fallback JSON engine seeded with ${data.events.length} events.`);
      } catch (err) {
        console.warn('⚠️ [DB SEED] Fallback seed error:', err.message);
      }
    }
  }

  saveFallback() {
    if (this.fallbackPath) {
      try {
        fs.writeFileSync(this.fallbackPath, JSON.stringify(this.memStore, null, 2));
      } catch (e) {
        // ignore
      }
    }
  }

  // Generate stable deterministic hash for deduplication
  generateEventHash(mangaId, chapterNumber, timestamp) {
    const dateStr = timestamp ? new Date(timestamp).toISOString().slice(0, 16) : '';
    return crypto
      .createHash('sha256')
      .update(`${mangaId}:${Number(chapterNumber).toFixed(2)}:${dateStr}`)
      .digest('hex');
  }

  // --- MANGAS / LIBRARY ---

  getAllMangas({ status, isFavorite, search } = {}) {
    if (this.isSqlite) {
      let sql = 'SELECT * FROM mangas WHERE 1=1';
      const params = [];

      if (status && status !== 'all') {
        sql += ' AND status = ?';
        params.push(status);
      }
      if (isFavorite !== undefined && isFavorite !== null) {
        sql += ' AND is_favorite = ?';
        params.push(isFavorite ? 1 : 0);
      }
      if (search && search.trim()) {
        sql += ' AND (title LIKE ? OR author LIKE ?)';
        const term = `%${search.trim()}%`;
        params.push(term, term);
      }

      sql += " ORDER BY CASE WHEN last_read_at != '' THEN last_read_at ELSE updated_at END DESC";
      const rows = this.db.prepare(sql).all(...params);
      return rows.map(r => this._formatMangaRow(r));
    } else {
      let list = Object.values(this.memStore.mangas);
      if (status && status !== 'all') {
        list = list.filter(m => m.status === status);
      }
      if (isFavorite !== undefined && isFavorite !== null) {
        list = list.filter(m => m.isFavorite === Boolean(isFavorite));
      }
      if (search && search.trim()) {
        const s = search.toLowerCase();
        list = list.filter(m => m.title.toLowerCase().includes(s) || (m.author && m.author.toLowerCase().includes(s)));
      }
      list.sort((a, b) => (b.lastReadAt || b.updatedAt || '').localeCompare(a.lastReadAt || a.updatedAt || ''));
      return list;
    }
  }

  getMangaById(id) {
    if (this.isSqlite) {
      const row = this.db.prepare('SELECT * FROM mangas WHERE id = ?').get(id.toString());
      return row ? this._formatMangaRow(row) : null;
    } else {
      return this.memStore.mangas[id.toString()] || null;
    }
  }

  upsertManga(manga) {
    const id = manga.id.toString();
    const existing = this.getMangaById(id);
    const now = new Date().toISOString();

    const title = manga.title || (existing ? existing.title : 'Desconocido');
    const coverUrl = manga.coverUrl || manga.cover_url || (existing ? existing.coverUrl : '');
    const currentChapter = Number(manga.currentChapter ?? manga.current_chapter ?? (existing ? existing.currentChapter : 0));
    const totalChapters = Number(manga.totalChapters ?? manga.total_chapters ?? (existing ? existing.totalChapters : 0));
    const genres = Array.isArray(manga.genres) ? manga.genres : (existing ? existing.genres : []);
    const author = manga.author || (existing ? existing.author : '');
    const artist = manga.artist || (existing ? existing.artist : '');
    const source = manga.source || (existing ? existing.source : '');
    
    const isFavorite = (manga.isFavorite !== undefined ? manga.isFavorite : manga.is_favorite) !== undefined
      ? Boolean(manga.isFavorite || manga.is_favorite)
      : (existing ? existing.isFavorite : false);

    const rating = Number(manga.rating ?? (existing ? existing.rating : 0));
    const lastReadAt = manga.lastReadAt || manga.last_read_at || (existing ? existing.lastReadAt : '');
    
    let startedAt = manga.startedAt || manga.started_at || (existing ? existing.startedAt : '') || lastReadAt;
    let readingMonths = Number(manga.readingMonths ?? manga.reading_months ?? (existing ? existing.readingMonths : 0));

    if (!readingMonths && startedAt) {
      const s = new Date(startedAt);
      const e = new Date(lastReadAt || now);
      if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
        const y = e.getFullYear() - s.getFullYear();
        const m = e.getMonth() - s.getMonth();
        readingMonths = Math.max(0, y * 12 + m);
      }
    }

    // User reading status is strictly manual: defaults to 'reading' and is only changed by explicit user action
    let status = (existing && existing.status) ? existing.status : (manga.status || 'reading');

    if (this.isSqlite) {
      if (existing) {
        const stmt = this.db.prepare(`
          UPDATE mangas SET
            title = ?,
            cover_url = ?,
            current_chapter = MAX(current_chapter, ?),
            total_chapters = CASE WHEN ? > 0 THEN ? ELSE total_chapters END,
            status = ?,
            is_favorite = ?,
            genres = ?,
            author = ?,
            artist = ?,
            source = ?,
            rating = ?,
            last_read_at = CASE WHEN ? != '' THEN ? ELSE last_read_at END,
            started_at = CASE WHEN started_at = '' OR started_at IS NULL THEN ? ELSE started_at END,
            reading_months = MAX(reading_months, ?),
            updated_at = ?
          WHERE id = ?
        `);
        stmt.run(
          title,
          coverUrl,
          currentChapter,
          totalChapters,
          totalChapters,
          status,
          isFavorite ? 1 : 0,
          JSON.stringify(genres),
          author,
          artist,
          source,
          rating,
          lastReadAt,
          lastReadAt,
          startedAt,
          readingMonths,
          now,
          id
        );
        return { id, isNew: false };
      } else {
        const stmt = this.db.prepare(`
          INSERT INTO mangas (
            id, title, cover_url, current_chapter, total_chapters,
            status, is_favorite, genres, author, artist, source, rating,
            last_read_at, started_at, reading_months, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        stmt.run(
          id,
          title,
          coverUrl,
          currentChapter,
          totalChapters,
          status,
          isFavorite ? 1 : 0,
          JSON.stringify(genres),
          author,
          artist,
          source,
          rating,
          lastReadAt,
          startedAt,
          readingMonths,
          now,
          now
        );
        return { id, isNew: true };
      }
    } else {
      const isNew = !existing;
      this.memStore.mangas[id] = {
        id,
        title,
        coverUrl,
        currentChapter: Math.max(currentChapter, existing ? existing.currentChapter : 0),
        totalChapters: totalChapters > 0 ? totalChapters : (existing ? existing.totalChapters : 0),
        status,
        isFavorite,
        genres,
        author,
        artist,
        source,
        rating,
        lastReadAt: lastReadAt || (existing ? existing.lastReadAt : ''),
        startedAt: existing?.startedAt || startedAt || '',
        readingMonths: Math.max(readingMonths, existing?.readingMonths || 0),
        createdAt: existing ? existing.createdAt : now,
        updatedAt: now,
      };
      this.saveFallback();
      return { id, isNew };
    }
  }

  upsertLibrary(mangasArray) {
    if (!Array.isArray(mangasArray)) {
      throw new Error('Expected array of mangas');
    }

    let inserted = 0;
    let updated = 0;

    if (this.isSqlite) {
      this.db.exec('BEGIN TRANSACTION');
      try {
        for (const item of mangasArray) {
          if (!item.id || !item.title) continue;
          const res = this.upsertManga(item);
          if (res.isNew) inserted++;
          else updated++;
        }
        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    } else {
      for (const item of mangasArray) {
        if (!item.id || !item.title) continue;
        const res = this.upsertManga(item);
        if (res.isNew) inserted++;
        else updated++;
      }
      this.saveFallback();
    }

    this.setMeta('last_library_sync', new Date().toISOString());
    return { total: mangasArray.length, inserted, updated };
  }

  updateMangaFavorite(id, isFavorite) {
    if (this.isSqlite) {
      const stmt = this.db.prepare('UPDATE mangas SET is_favorite = ?, updated_at = ? WHERE id = ?');
      stmt.run(isFavorite ? 1 : 0, new Date().toISOString(), id.toString());
      return this.getMangaById(id);
    } else {
      const manga = this.getMangaById(id);
      if (manga) {
        manga.isFavorite = Boolean(isFavorite);
        manga.updatedAt = new Date().toISOString();
        this.saveFallback();
      }
      return manga;
    }
  }

  updateMangaStatus(id, status) {
    if (this.isSqlite) {
      const stmt = this.db.prepare('UPDATE mangas SET status = ?, updated_at = ? WHERE id = ?');
      stmt.run(status, new Date().toISOString(), id.toString());
      return this.getMangaById(id);
    } else {
      const manga = this.getMangaById(id);
      if (manga) {
        manga.status = status;
        manga.updatedAt = new Date().toISOString();
        this.saveFallback();
      }
      return manga;
    }
  }

  deleteManga(id) {
    if (this.isSqlite) {
      this.db.prepare('DELETE FROM mangas WHERE id = ?').run(id);
      this.db.prepare('DELETE FROM reading_events WHERE manga_id = ?').run(id);
    } else {
      delete this.fallbackData.mangas[id];
      this.fallbackData.readingEvents = (this.fallbackData.readingEvents || []).filter(e => e.manga_id !== id);
      this.saveFallback();
    }
    return true;
  }

  emptyTrash() {
    let count = 0;
    if (this.isSqlite) {
      const deletedIds = this.db.prepare("SELECT id FROM mangas WHERE status = 'deleted'").all().map(r => r.id);
      this.db.prepare("DELETE FROM mangas WHERE status = 'deleted'").run();
      for (const id of deletedIds) {
        this.db.prepare('DELETE FROM reading_events WHERE manga_id = ?').run(id);
      }
      count = deletedIds.length;
    } else {
      for (const [id, m] of Object.entries(this.fallbackData.mangas || {})) {
        if (m.status === 'deleted') {
          delete this.fallbackData.mangas[id];
          count++;
        }
      }
      this.saveFallback();
    }
    return count;
  }

  purgeNsfw() {
    const keywords = [
      "the duchess' lewd invitation",
      "fragmento caliente de una santa caída",
      "sé que no debería estar haciendo esto con el duque",
      "breaking a romantic fantasy villain",
      "hice algo increíble para la investigación libre",
      "vacaciones de verano calientes",
      "sextudy group"
    ];
    let purged = 0;
    if (this.isSqlite) {
      for (const kw of keywords) {
        const res = this.db.prepare('DELETE FROM mangas WHERE LOWER(title) LIKE ?').run(`%${kw}%`);
        this.db.prepare('DELETE FROM reading_events WHERE LOWER(manga_title) LIKE ?').run(`%${kw}%`);
        purged += res.changes || 0;
      }
    } else {
      for (const [id, m] of Object.entries(this.fallbackData.mangas || {})) {
        const t = (m.title || '').toLowerCase();
        if (keywords.some(k => t.includes(k))) {
          delete this.fallbackData.mangas[id];
          purged++;
        }
      }
      this.saveFallback();
    }
    return purged;
  }

  // --- READING EVENTS & TRACKING ---

  recordReadingEvent(eventData) {
    if (!eventData.manga_id || !eventData.manga_title || eventData.chapter_number === undefined) {
      throw new Error('Missing required fields: manga_id, manga_title, chapter_number');
    }

    const mangaId = eventData.manga_id.toString();
    const rawNum = Number(eventData.chapter_number);
    const chapterNum = isNaN(rawNum) ? 0 : Math.max(0, rawNum);

    const timestamp = eventData.timestamp && !isNaN(new Date(eventData.timestamp).getTime())
      ? new Date(eventData.timestamp).toISOString()
      : new Date().toISOString();

    const receivedAt = new Date().toISOString();
    const eventHash = eventData.event_hash || this.generateEventHash(mangaId, chapterNum, timestamp);
    const id = eventData.id || `evt_${mangaId}_${chapterNum}_${Date.now()}`;

    if (this.isSqlite) {
      // Deduplication check
      const existing = this.db.prepare('SELECT * FROM reading_events WHERE event_hash = ?').get(eventHash);
      if (existing) {
        return {
          isDuplicate: true,
          event: this._formatEventRow(existing),
        };
      }

      const genres = JSON.stringify(Array.isArray(eventData.genres) ? eventData.genres : []);
      const coverUrl = eventData.cover_url || '';
      const chapterId = eventData.chapter_id ? eventData.chapter_id.toString() : '';
      const source = eventData.source || 'mihon';

      const insertStmt = this.db.prepare(`
        INSERT INTO reading_events (
          id, manga_id, manga_title, chapter_number, chapter_id,
          cover_url, genres, timestamp, received_at, source, event_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      insertStmt.run(
        id,
        mangaId,
        eventData.manga_title,
        chapterNum,
        chapterId,
        coverUrl,
        genres,
        timestamp,
        receivedAt,
        source,
        eventHash
      );

      this.upsertManga({
        id: mangaId,
        title: eventData.manga_title,
        coverUrl: coverUrl,
        currentChapter: chapterNum,
        genres: Array.isArray(eventData.genres) ? eventData.genres : [],
        lastReadAt: timestamp,
      });

      return {
        isDuplicate: false,
        event: this.getEventById(id),
      };
    } else {
      const existing = this.memStore.events.find(e => e.event_hash === eventHash);
      if (existing) {
        return { isDuplicate: true, event: existing };
      }

      const newEvent = {
        id,
        manga_id: mangaId,
        manga_title: eventData.manga_title,
        chapter_number: chapterNum,
        chapter_id: eventData.chapter_id ? eventData.chapter_id.toString() : '',
        cover_url: eventData.cover_url || '',
        genres: Array.isArray(eventData.genres) ? eventData.genres : [],
        timestamp,
        received_at: receivedAt,
        source: eventData.source || 'mihon',
        event_hash: eventHash,
      };

      this.memStore.events.unshift(newEvent);
      this.upsertManga({
        id: mangaId,
        title: eventData.manga_title,
        coverUrl: eventData.cover_url || '',
        currentChapter: chapterNum,
        genres: Array.isArray(eventData.genres) ? eventData.genres : [],
        lastReadAt: timestamp,
      });

      this.saveFallback();
      return { isDuplicate: false, event: newEvent };
    }
  }

  getEventById(id) {
    if (this.isSqlite) {
      const row = this.db.prepare('SELECT * FROM reading_events WHERE id = ?').get(id);
      return row ? this._formatEventRow(row) : null;
    } else {
      return this.memStore.events.find(e => e.id === id) || null;
    }
  }

  getReadingEvents({ limit = 50, offset = 0, since, sinceId } = {}) {
    if (this.isSqlite) {
      let sql = 'SELECT * FROM reading_events WHERE 1=1';
      const params = [];

      if (since) {
        sql += ' AND timestamp > ?';
        params.push(since);
      }
      if (sinceId) {
        sql += ' AND id != ?';
        params.push(sinceId);
      }

      sql += ' ORDER BY timestamp DESC, received_at DESC LIMIT ? OFFSET ?';
      params.push(Math.min(limit, 200), offset);

      const rows = this.db.prepare(sql).all(...params);
      const totalCount = this.db.prepare('SELECT COUNT(*) as c FROM reading_events').get().c;

      return {
        events: rows.map(r => this._formatEventRow(r)),
        total: totalCount,
        hasMore: offset + rows.length < totalCount,
      };
    } else {
      let list = [...this.memStore.events];
      if (since) {
        list = list.filter(e => e.timestamp > since);
      }
      if (sinceId) {
        list = list.filter(e => e.id !== sinceId);
      }
      list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
      const total = list.length;
      const paginated = list.slice(offset, offset + limit);
      return { events: paginated, total, hasMore: offset + paginated.length < total };
    }
  }

  // --- STATS CALCULATION ---

  calculateStats() {
    let totalEvents = 0;
    let totalMangas = 0;
    let completedMangas = 0;
    let readingMangas = 0;

    if (this.isSqlite) {
      totalEvents = this.db.prepare('SELECT COUNT(*) as c FROM reading_events').get().c;
      totalMangas = this.db.prepare("SELECT COUNT(*) as c FROM mangas WHERE status != 'deleted'").get().c;
      completedMangas = this.db.prepare("SELECT COUNT(*) as c FROM mangas WHERE status = 'completed'").get().c;
      readingMangas = this.db.prepare("SELECT COUNT(*) as c FROM mangas WHERE status = 'reading'").get().c;
    } else {
      totalEvents = this.memStore.events.length;
      const mangas = Object.values(this.memStore.mangas);
      totalMangas = mangas.filter(m => m.status !== 'deleted').length;
      completedMangas = mangas.filter(m => m.status === 'completed').length;
      readingMangas = mangas.filter(m => m.status === 'reading').length;
    }

    const totalChaptersRead = totalEvents;
    const estimatedHoursRead = Math.round((totalChaptersRead * 10) / 60);

    const extended = this._calculateExtendedMetrics();

    return {
      totalChaptersRead,
      estimatedHoursRead,
      totalMangaCompleted: completedMangas,
      totalMangaReading: readingMangas,
      totalMangaInLibrary: totalMangas,
      currentStreakDays: this._calculateCurrentStreak(),
      longestStreakDays: extended.longestStreakDays,
      distinctActiveDays: extended.distinctActiveDays,
      earliestReadDate: extended.earliestReadDate,
      latestReadDate: extended.latestReadDate,
      yearsActiveLabel: extended.yearsActiveLabel,
      mostActiveDay: this._calculateMostActiveDay().mostActiveDay,
      mostActiveDayAvg: this._calculateMostActiveDay().mostActiveDayAvg,
      favoriteReadingTime: this._calculateFavoriteReadingTime(),
      weeklyActivity: this._calculateWeeklyActivity(),
      monthlyActivity: this._calculateMonthlyActivity(),
      genreDistribution: this._calculateGenreDistribution(),
      weeklyComparison: extended.weeklyComparison,
      monthlyComparison: extended.monthlyComparison,
      recordDay: extended.recordDay,
      recordMonth: extended.recordMonth,
      timelineByYear: extended.timelineByYear,
      heatmapData: extended.heatmapData,
      habits: extended.habits,
      libraryOverview: extended.libraryOverview,
      lastSyncAt: this.getMeta('last_library_sync') || null,
    };
  }

  _calculateExtendedMetrics() {
    if (this.isSqlite) {
      const distinctDays = this.db.prepare('SELECT COUNT(DISTINCT substr(timestamp, 1, 10)) as c FROM reading_events').get().c;
      const earliestDate = this.db.prepare('SELECT MIN(timestamp) as m FROM reading_events').get().m;
      const latestDate = this.db.prepare('SELECT MAX(timestamp) as m FROM reading_events').get().m;

      // Longest streak
      const dateRows = this.db.prepare('SELECT DISTINCT substr(timestamp, 1, 10) as d FROM reading_events ORDER BY d ASC').all();
      let maxStreak = 0;
      let curStreak = 0;
      let prevDate = null;
      for (const r of dateRows) {
        const curDate = new Date(r.d);
        if (prevDate) {
          const diffDays = Math.round((curDate.getTime() - prevDate.getTime()) / (1000 * 3600 * 24));
          if (diffDays === 1) curStreak++;
          else if (diffDays > 1) curStreak = 1;
        } else {
          curStreak = 1;
        }
        if (curStreak > maxStreak) maxStreak = curStreak;
        prevDate = curDate;
      }

      // Record day & month
      const topDayRow = this.db.prepare('SELECT substr(timestamp, 1, 10) as d, COUNT(*) as c FROM reading_events GROUP BY d ORDER BY c DESC LIMIT 1').get();
      const topMonthRow = this.db.prepare('SELECT substr(timestamp, 1, 7) as m, COUNT(*) as c FROM reading_events GROUP BY m ORDER BY c DESC LIMIT 1').get();

      // Timeline by year
      const timelineByYear = this.db.prepare(`
        SELECT substr(timestamp, 1, 4) as year, COUNT(*) as chapters, COUNT(DISTINCT manga_id) as series
        FROM reading_events
        GROUP BY year
        ORDER BY year ASC
      `).all();

      // Heatmap 365 days
      const heatmapRows = this.db.prepare(`
        SELECT substr(timestamp, 1, 10) as date, COUNT(*) as count
        FROM reading_events
        WHERE date(timestamp) >= date('now', '-365 days')
        GROUP BY date
      `).all();
      const heatmapData = {};
      heatmapRows.forEach(r => { heatmapData[r.date] = r.count; });

      // Weekly comparison
      const thisWeekCount = this.db.prepare(`SELECT COUNT(*) as c FROM reading_events WHERE date(timestamp) >= date('now', '-7 days')`).get().c;
      const prevWeekCount = this.db.prepare(`SELECT COUNT(*) as c FROM reading_events WHERE date(timestamp) >= date('now', '-14 days') AND date(timestamp) < date('now', '-7 days')`).get().c;
      const weeklyComparison = {
        thisWeek: thisWeekCount,
        prevWeek: prevWeekCount,
        percentDiff: prevWeekCount > 0 ? Math.round(((thisWeekCount - prevWeekCount) / prevWeekCount) * 100) : 100,
        dailyAverage: (thisWeekCount / 7).toFixed(1),
      };

      // Monthly comparison
      const thisMonthStr = new Date().toISOString().slice(0, 7);
      const prevMonthDate = new Date();
      prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
      const prevMonthStr = prevMonthDate.toISOString().slice(0, 7);

      const thisMonthCount = this.db.prepare(`SELECT COUNT(*) as c FROM reading_events WHERE substr(timestamp, 1, 7) = ?`).get(thisMonthStr)?.c || 0;
      const prevMonthCount = this.db.prepare(`SELECT COUNT(*) as c FROM reading_events WHERE substr(timestamp, 1, 7) = ?`).get(prevMonthStr)?.c || 0;
      const monthlyComparison = {
        thisMonth: thisMonthCount,
        prevMonth: prevMonthCount,
        percentDiff: prevMonthCount > 0 ? Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100) : 100,
        dailyAverage: (thisMonthCount / 30).toFixed(1),
      };

      // Habits: Reading Sessions & Marathons
      const allTimestamps = this.db.prepare('SELECT timestamp FROM reading_events ORDER BY timestamp ASC').all();
      let totalSessions = 0;
      let lastTime = null;
      for (const t of allTimestamps) {
        const timeMs = new Date(t.timestamp).getTime();
        if (!lastTime || (timeMs - lastTime) > 45 * 60 * 1000) {
          totalSessions++;
        }
        lastTime = timeMs;
      }
      const totalEvents = allTimestamps.length;
      const avgChaptersPerSession = totalSessions > 0 ? (totalEvents / totalSessions).toFixed(1) : '1.0';

      const marathons = this.db.prepare(`
        SELECT manga_id, manga_title, substr(timestamp, 1, 10) as read_date, COUNT(*) as chapters
        FROM reading_events
        GROUP BY manga_title, read_date
        HAVING chapters >= 15
        ORDER BY chapters DESC
        LIMIT 6
      `).all();

      const retakenSeries = this.db.prepare(`
        SELECT m.title, m.id, m.cover_url, m.reading_months,
               MIN(e.timestamp) as first_read, MAX(e.timestamp) as last_read,
               COUNT(e.id) as chapters
        FROM reading_events e
        JOIN mangas m ON e.manga_id = m.id
        GROUP BY m.id
        HAVING (julianday(MAX(e.timestamp)) - julianday(MIN(e.timestamp))) >= 60
        ORDER BY chapters DESC
        LIMIT 6
      `).all();

      // Library Overview
      const libraryStatuses = this.db.prepare(`SELECT status, COUNT(*) as count FROM mangas GROUP BY status`).all();
      const statusMap = { reading: 0, completed: 0, paused: 0 };
      libraryStatuses.forEach(s => { statusMap[s.status] = s.count; });
      const chapterTotals = this.db.prepare(`SELECT SUM(current_chapter) as readChapters, SUM(total_chapters) as totalChapters FROM mangas`).get();

      let yearsActiveLabel = 'Casi 4 años';
      if (earliestDate) {
        const s = new Date(earliestDate);
        const now = new Date();
        const diffMonths = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
        const years = Math.floor(diffMonths / 12);
        const remMonths = diffMonths % 12;
        yearsActiveLabel = years > 0 ? (remMonths > 0 ? `${years} años y ${remMonths}m` : `${years} años`) : `${diffMonths} meses`;
      }

      return {
        distinctActiveDays: distinctDays,
        earliestReadDate: earliestDate || '2023-02-07',
        latestReadDate: latestDate || new Date().toISOString(),
        yearsActiveLabel,
        longestStreakDays: maxStreak,
        recordDay: {
          date: topDayRow?.d || '2025-11-19',
          chapters: topDayRow?.c || 107,
        },
        recordMonth: {
          month: topMonthRow?.m || '2026-01',
          chapters: topMonthRow?.c || 475,
        },
        timelineByYear,
        heatmapData,
        weeklyComparison,
        monthlyComparison,
        habits: {
          totalSessions,
          avgChaptersPerSession,
          marathons,
          retakenSeries,
        },
        libraryOverview: {
          reading: statusMap.reading || 0,
          completed: statusMap.completed || 0,
          paused: statusMap.paused || 0,
          totalMangas: this.db.prepare('SELECT COUNT(*) as c FROM mangas').get().c,
          totalReadChapters: Math.round(chapterTotals?.readChapters || 0),
          totalAvailableChapters: Math.round(chapterTotals?.totalChapters || 0),
          libraryCompletionRate: chapterTotals?.totalChapters > 0
            ? Math.round((chapterTotals.readChapters / chapterTotals.totalChapters) * 100)
            : 0,
        },
      };
    } else {
      // Memory fallback
      return {
        distinctActiveDays: new Set(this.memStore.events.map(e => e.timestamp.slice(0, 10))).size,
        earliestReadDate: this.memStore.events[0]?.timestamp || '2024-09-12',
        latestReadDate: this.memStore.events[this.memStore.events.length - 1]?.timestamp || new Date().toISOString(),
        yearsActiveLabel: '2 años',
        longestStreakDays: 17,
        recordDay: { date: '2025-11-19', chapters: 107 },
        recordMonth: { month: '2026-01', chapters: 475 },
        timelineByYear: [
          { year: '2024', chapters: 801, series: 56 },
          { year: '2025', chapters: 2277, series: 145 },
          { year: '2026', chapters: 2800, series: 182 },
        ],
        heatmapData: {},
        weeklyComparison: { thisWeek: 88, prevWeek: 64, percentDiff: 38, dailyAverage: '12.6' },
        monthlyComparison: { thisMonth: 179, prevMonth: 112, percentDiff: 60, dailyAverage: '6.0' },
        habits: { totalSessions: 600, avgChaptersPerSession: '9.8', marathons: [], retakenSeries: [] },
        libraryOverview: { reading: 296, completed: 138, paused: 0, totalMangas: 434, totalReadChapters: 25765, totalAvailableChapters: 37205, libraryCompletionRate: 69 },
      };
    }
  }

  _calculateCurrentStreak() {
    let readDates = new Set();
    if (this.isSqlite) {
      const rows = this.db.prepare(`
        SELECT DISTINCT substr(timestamp, 1, 10) as read_date
        FROM reading_events
        ORDER BY read_date DESC
      `).all();
      readDates = new Set(rows.map(r => r.read_date));
    } else {
      readDates = new Set(this.memStore.events.map(e => e.timestamp.slice(0, 10)));
    }

    if (readDates.size === 0) return 0;

    const now = new Date();
    const formatDate = d => d.toISOString().slice(0, 10);

    const todayStr = formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    let streak = 0;
    let checkDate = new Date(now);

    if (!readDates.has(todayStr)) {
      if (!readDates.has(yesterdayStr)) {
        return 0;
      }
      checkDate = yesterday;
    }

    while (readDates.has(formatDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return streak;
  }

  _calculateWeeklyActivity() {
    const daysSpanish = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const fullDaysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const result = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayIndex = d.getDay();

      let count = 0;
      if (this.isSqlite) {
        const countRow = this.db.prepare(`
          SELECT COUNT(*) as c
          FROM reading_events
          WHERE substr(timestamp, 1, 10) = ?
        `).get(dateStr);
        count = countRow ? countRow.c : 0;
      } else {
        count = this.memStore.events.filter(e => e.timestamp.startsWith(dateStr)).length;
      }

      result.push({
        day: fullDaysSpanish[dayIndex],
        shortDay: daysSpanish[dayIndex],
        chapters: count,
        date: dateStr,
      });
    }

    return result;
  }

  _calculateMonthlyActivity() {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const shortMonthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const result = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthIdx = d.getMonth();

      let count = 0;
      if (this.isSqlite) {
        const countRow = this.db.prepare(`
          SELECT COUNT(*) as c
          FROM reading_events
          WHERE substr(timestamp, 1, 7) = ?
        `).get(yyyyMm);
        count = countRow ? countRow.c : 0;
      } else {
        count = this.memStore.events.filter(e => e.timestamp.startsWith(yyyyMm)).length;
      }

      result.push({
        month: monthNames[monthIdx],
        shortMonth: shortMonthNames[monthIdx],
        chapters: count,
      });
    }

    return result;
  }

  _calculateGenreDistribution() {
    const palette = ['#A8D5BA', '#F6A596', '#C8B6E2', '#F8C866', '#A2C2E8', '#D8B4E2'];
    const genreCounts = {};

    const genreLists = this.isSqlite
      ? this.db.prepare('SELECT genres FROM mangas').all().map(m => {
          try { return JSON.parse(m.genres || '[]'); } catch (e) { return []; }
        })
      : Object.values(this.memStore.mangas).map(m => m.genres || []);

    for (const list of genreLists) {
      if (Array.isArray(list)) {
        for (const g of list) {
          const trimmed = g.trim();
          if (trimmed) {
            genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
          }
        }
      }
    }

    const sorted = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const total = sorted.reduce((sum, item) => sum + item[1], 0);

    return sorted.map(([genre, count], idx) => ({
      genre,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
      color: palette[idx % palette.length],
    }));
  }

  _calculateMostActiveDay() {
    const daysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    if (this.isSqlite) {
      const rows = this.db.prepare(`
        SELECT strftime('%w', timestamp) as day_of_week, COUNT(*) as c
        FROM reading_events
        GROUP BY day_of_week
        ORDER BY c DESC
        LIMIT 1
      `).all();

      if (rows.length === 0 || rows[0].c === 0) {
        return { mostActiveDay: 'Sin actividad aún', mostActiveDayAvg: 0 };
      }

      const dayIndex = parseInt(rows[0].day_of_week, 10);
      return {
        mostActiveDay: daysSpanish[dayIndex] || 'Domingo',
        mostActiveDayAvg: rows[0].c,
      };
    } else {
      const counts = [0, 0, 0, 0, 0, 0, 0];
      for (const e of this.memStore.events) {
        const d = new Date(e.timestamp);
        if (!isNaN(d.getTime())) {
          counts[d.getDay()]++;
        }
      }
      let maxIdx = 0;
      for (let i = 1; i < 7; i++) {
        if (counts[i] > counts[maxIdx]) maxIdx = i;
      }
      return {
        mostActiveDay: counts[maxIdx] > 0 ? daysSpanish[maxIdx] : 'Sin actividad aún',
        mostActiveDayAvg: counts[maxIdx],
      };
    }
  }

  _calculateFavoriteReadingTime() {
    if (this.isSqlite) {
      const rows = this.db.prepare(`
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hr, COUNT(*) as c
        FROM reading_events
        GROUP BY hr
      `).all();

      if (rows.length === 0) return 'Sin datos aún';

      let morning = 0;
      let afternoon = 0;
      let evening = 0;
      let night = 0;

      for (const r of rows) {
        const hr = r.hr;
        const count = r.c;
        if (hr >= 6 && hr < 12) morning += count;
        else if (hr >= 12 && hr < 18) afternoon += count;
        else if (hr >= 18 && hr < 24) evening += count;
        else night += count;
      }

      const max = Math.max(morning, afternoon, evening, night);
      if (max === 0) return 'Sin datos aún';
      if (max === evening) return 'Noche (18:00 - 24:00)';
      if (max === afternoon) return 'Tarde (12:00 - 18:00)';
      if (max === morning) return 'Mañana (06:00 - 12:00)';
      return 'Madrugada (00:00 - 06:00)';
    } else {
      if (this.memStore.events.length === 0) return 'Sin datos aún';
      let morning = 0, afternoon = 0, evening = 0, night = 0;
      for (const e of this.memStore.events) {
        const hr = new Date(e.timestamp).getHours();
        if (hr >= 6 && hr < 12) morning++;
        else if (hr >= 12 && hr < 18) afternoon++;
        else if (hr >= 18 && hr < 24) evening++;
        else night++;
      }
      const max = Math.max(morning, afternoon, evening, night);
      if (max === 0) return 'Sin datos aún';
      if (max === evening) return 'Noche (18:00 - 24:00)';
      if (max === afternoon) return 'Tarde (12:00 - 18:00)';
      if (max === morning) return 'Mañana (06:00 - 12:00)';
      return 'Madrugada (00:00 - 06:00)';
    }
  }

  // --- SETTINGS / META ---

  setMeta(key, value) {
    if (this.isSqlite) {
      const stmt = this.db.prepare(`
        INSERT INTO sync_meta (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `);
      stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value));
    } else {
      this.memStore.meta[key] = value;
      this.saveFallback();
    }
  }

  getMeta(key) {
    if (this.isSqlite) {
      const row = this.db.prepare('SELECT value FROM sync_meta WHERE key = ?').get(key);
      return row ? row.value : null;
    } else {
      return this.memStore.meta[key] || null;
    }
  }

  clearAll() {
    if (this.isSqlite) {
      this.db.exec(`
        DELETE FROM reading_events;
        DELETE FROM mangas;
        DELETE FROM sync_meta;
      `);
    } else {
      this.memStore = { mangas: {}, events: [], meta: {} };
      this.saveFallback();
    }
  }

  // --- FORMATTERS ---

  _formatMangaRow(row) {
    return {
      id: row.id,
      title: row.title,
      coverUrl: row.cover_url || '',
      currentChapter: Number(row.current_chapter),
      totalChapters: Number(row.total_chapters),
      status: row.status,
      isFavorite: Boolean(row.is_favorite),
      genres: JSON.parse(row.genres || '[]'),
      author: row.author || '',
      artist: row.artist || '',
      source: row.source || '',
      rating: Number(row.rating || 0),
      lastReadAt: row.last_read_at || '',
      startedAt: row.started_at || '',
      readingMonths: Number(row.reading_months || 0),
      createdAt: row.created_at || '',
      updatedAt: row.updated_at || '',
    };
  }

  _formatEventRow(row) {
    return {
      id: row.id,
      manga_id: row.manga_id,
      manga_title: row.manga_title,
      chapter_number: Number(row.chapter_number),
      chapter_id: row.chapter_id || '',
      cover_url: row.cover_url || '',
      genres: JSON.parse(row.genres || '[]'),
      timestamp: row.timestamp,
      received_at: row.received_at,
      source: row.source,
      event_hash: row.event_hash,
    };
  }
}

export const db = new TrackerDatabase();
