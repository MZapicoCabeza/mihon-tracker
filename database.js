import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { createClient } from '@libsql/client';

let DatabaseSync = null;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync;
} catch (e) {
  // Native node:sqlite not available on older Node versions
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DATABASE_PATH || process.env.DB_FILE || path.join(__dirname, 'tracker.db');
const JSON_FALLBACK_FILE = path.join(__dirname, 'tracker-fallback.json');
const SEED_DATA_FILE = path.join(__dirname, 'seed-data.json');

export function formatMinutesDuration(totalMins) {
  if (!totalMins || totalMins <= 0) return '0 min';
  const hours = Math.floor(totalMins / 60);
  const mins = Math.round(totalMins % 60);
  if (hours === 0) return `${mins} min`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
}

export class TrackerDatabase {
  constructor(dbPath = DB_FILE) {
    this.dbPath = dbPath;
    this.mode = null;
    this.client = null;
    this.db = null;
    this.initialized = false;
    this.initPromise = null;
    this.memStore = { mangas: {}, events: [], meta: {} };
  }

  async init() {
    if (this.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.TURSO_URL || process.env.LIBSQL_URL;
      const tursoAuthToken = process.env.TURSO_AUTH_TOKEN;

      // 1. Cloud LibSQL / Turso engine
      if (tursoUrl && this.dbPath !== ':memory:' && this.dbPath !== ':fallback:') {
        try {
          this.client = createClient({
            url: tursoUrl,
            authToken: tursoAuthToken,
          });
          this.mode = 'turso';
          this.initialized = true;
          console.log(`☁️ [TURSO DB] Connected to Turso cloud database: ${tursoUrl.replace(/:[^:]*@/, ':***@')}`);
          await this.initSchema();
          await this.seedIfNeeded();
          await this.backfillReadingIntervalsIfNeeded();
          return;
        } catch (err) {
          console.error(`❌ [TURSO DB] Failed to connect to Turso: ${err.message}. Falling back to local engine.`);
          this.mode = null;
          this.initialized = false;
        }
      }

      // 2. Native SQLite (node:sqlite)
      if (DatabaseSync && this.dbPath !== ':fallback:') {
        if (this.dbPath !== ':memory:') {
          const dbDir = path.dirname(this.dbPath);
          if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
          }
        }
        this.mode = 'sqlite';
        this.db = new DatabaseSync(this.dbPath);
        this.initialized = true;
        console.log(`💾 [LOCAL SQLITE] Connected to SQLite database at: ${this.dbPath}`);
        await this.initSchema();
        await this.seedIfNeeded();
        await this.backfillReadingIntervalsIfNeeded();
        return;
      }

      // 3. Persistent JSON storage fallback
      this.mode = 'json';
      this.initialized = true;
      this.fallbackPath = this.dbPath === ':memory:' ? null : JSON_FALLBACK_FILE;
      console.warn('⚠️ [DB NOTICE] Native SQLite not available. Using persistent JSON storage engine.');
      this.loadFallback();
    })();

    return this.initPromise;
  }

  // --- QUERY ABSTRACTION (TURSO / SQLITE) ---

  async queryAll(sql, params = []) {
    if (!this.initialized) await this.init();
    if (this.mode === 'turso') {
      const res = await this.client.execute({ sql, args: params });
      return res.rows.map(r => ({ ...r }));
    } else if (this.mode === 'sqlite') {
      return this.db.prepare(sql).all(...params);
    }
    return [];
  }

  async queryGet(sql, params = []) {
    if (!this.initialized) await this.init();
    if (this.mode === 'turso') {
      const res = await this.client.execute({ sql, args: params });
      return res.rows[0] ? { ...res.rows[0] } : null;
    } else if (this.mode === 'sqlite') {
      const row = this.db.prepare(sql).get(...params);
      return row ? { ...row } : null;
    }
    return null;
  }

  async queryRun(sql, params = []) {
    if (!this.initialized) await this.init();
    if (this.mode === 'turso') {
      const res = await this.client.execute({ sql, args: params });
      return { changes: res.rowsAffected, lastInsertRowid: res.lastInsertRowid };
    } else if (this.mode === 'sqlite') {
      const res = this.db.prepare(sql).run(...params);
      return { changes: res.changes, lastInsertRowid: res.lastInsertRowid };
    }
    return { changes: 0 };
  }

  async queryBatch(statements) {
    if (!this.initialized) await this.init();
    if (!statements || statements.length === 0) return;

    if (this.mode === 'turso') {
      const CHUNK_SIZE = 100;
      for (let i = 0; i < statements.length; i += CHUNK_SIZE) {
        const chunk = statements.slice(i, i + CHUNK_SIZE).map(s => ({
          sql: s.sql,
          args: s.args || s.params || []
        }));
        await this.client.batch(chunk, 'write');
      }
    } else if (this.mode === 'sqlite') {
      this.db.exec('BEGIN TRANSACTION');
      try {
        for (const s of statements) {
          this.db.prepare(s.sql).run(...(s.args || s.params || []));
        }
        this.db.exec('COMMIT');
      } catch (err) {
        this.db.exec('ROLLBACK');
        throw err;
      }
    }
  }

  // --- SCHEMA INITIALIZATION & SEED ---

  async initSchema() {
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS mangas (
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
      )`,
      `CREATE TABLE IF NOT EXISTS reading_events (
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
      )`,
      `CREATE TABLE IF NOT EXISTS sync_meta (
        key TEXT PRIMARY KEY,
        value TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS reading_intervals (
        id TEXT PRIMARY KEY,
        manga_id TEXT NOT NULL,
        manga_title TEXT NOT NULL,
        chapter_number REAL NOT NULL,
        duration_seconds REAL NOT NULL,
        started_at TEXT NOT NULL,
        ended_at TEXT NOT NULL,
        source TEXT DEFAULT 'tracker'
      )`,
      `CREATE INDEX IF NOT EXISTS idx_intervals_manga ON reading_intervals(manga_id)`,
      `CREATE INDEX IF NOT EXISTS idx_intervals_ended ON reading_intervals(ended_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_events_manga_id ON reading_events(manga_id)`,
      `CREATE INDEX IF NOT EXISTS idx_events_timestamp ON reading_events(timestamp DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_events_hash ON reading_events(event_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_mangas_status ON mangas(status)`,
      `CREATE INDEX IF NOT EXISTS idx_mangas_last_read ON mangas(last_read_at DESC)`
    ];

    if (this.mode === 'turso') {
      for (const sql of tableStatements) {
        await this.client.execute(sql);
      }
    } else if (this.mode === 'sqlite') {
      for (const sql of tableStatements) {
        this.db.exec(sql);
      }
    }

    try {
      await this.queryRun("ALTER TABLE mangas ADD COLUMN started_at TEXT DEFAULT ''");
    } catch (e) {}
    try {
      await this.queryRun("ALTER TABLE mangas ADD COLUMN reading_months INTEGER DEFAULT 0");
    } catch (e) {}
    try {
      // Purge any interval of 10 minutes or more so calculations only use intervals < 10m
      await this.queryRun("DELETE FROM reading_intervals WHERE duration_seconds >= 600");
    } catch (e) {}
  }

  async seedIfNeeded() {
    try {
      if (this.dbPath === ':memory:') return;
      const countRow = await this.queryGet('SELECT COUNT(*) as c FROM reading_events');
      const eventCount = countRow ? Number(countRow.c) : 0;

      // Primary: Seed full historical dataset (2023-2026) from seed-data.json if DB is empty (< 100 events)
      if (eventCount < 100 && fs.existsSync(SEED_DATA_FILE)) {
        console.log(`📦 [DB SEED] Seeding complete historical dataset (2023-2026) from seed-data.json into ${this.mode}...`);
        const raw = fs.readFileSync(SEED_DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);

        if (Array.isArray(data.mangas) && data.mangas.length > 0) {
          await this.upsertLibrary(data.mangas);
        }

        if (Array.isArray(data.events) && data.events.length > 0) {
          const statements = [];
          for (const ev of data.events) {
            const mangaId = (ev.manga_id ?? ev.mangaId ?? '').toString();
            const mangaTitle = (ev.manga_title ?? ev.mangaTitle ?? 'Desconocido').toString();
            const chapterNum = Number(ev.chapter_number ?? ev.chapterNumber ?? 0);
            const timestamp = (ev.timestamp ?? ev.received_at ?? new Date().toISOString()).toString();
            const eventHash = (ev.event_hash ?? ev.eventHash ?? this.generateEventHash(mangaId, chapterNum, timestamp)).toString();
            const id = (ev.id ?? `evt_${mangaId}_${chapterNum}_${Date.now()}`).toString();
            const genres = typeof ev.genres === 'string' ? ev.genres : JSON.stringify(Array.isArray(ev.genres) ? ev.genres : []);
            const coverUrl = (ev.cover_url ?? ev.coverUrl ?? '').toString();
            const chapterId = (ev.chapter_id ?? ev.chapterId ?? '').toString();
            const source = (ev.source ?? 'seed-import').toString();
            const receivedAt = (ev.received_at ?? ev.receivedAt ?? timestamp).toString();

            statements.push({
              sql: `
                INSERT OR IGNORE INTO reading_events (
                  id, manga_id, manga_title, chapter_number, chapter_id,
                  cover_url, genres, timestamp, received_at, source, event_hash
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
              `,
              args: [id, mangaId, mangaTitle, chapterNum, chapterId, coverUrl, genres, timestamp, receivedAt, source, eventHash],
            });
          }
          await this.queryBatch(statements);
          console.log(`✅ [DB SEED] Successfully seeded ${data.mangas?.length || 0} mangas and ${data.events.length} events into ${this.mode}.`);
        }
      }
    } catch (err) {
      console.warn(`⚠️ [DB SEED] Notice: Could not seed data: ${err.message}`);
    }
  }

  // --- READING INTERVALS & PACE ESTIMATOR ---

  async backfillReadingIntervalsIfNeeded() {
    try {
      if (this.dbPath === ':memory:') return;
      const countRow = await this.queryGet('SELECT COUNT(*) as c FROM reading_intervals');
      if (countRow && Number(countRow.c) > 0) return;

      const events = await this.queryAll('SELECT id, manga_id, manga_title, chapter_number, timestamp FROM reading_events ORDER BY timestamp ASC');
      if (events.length < 2) return;

      console.log(`⏱️ [DB INTERVALS] Calculating reading speed intervals from ${events.length} historical events...`);
      const statements = [];

      for (let i = 1; i < events.length; i++) {
        const prev = events[i - 1];
        const curr = events[i];
        const prevTime = new Date(prev.timestamp).getTime();
        const currTime = new Date(curr.timestamp).getTime();

        if (isNaN(prevTime) || isNaN(currTime)) continue;

        const diffSec = Math.round((currTime - prevTime) / 1000);
        // Realistic continuous reading session interval: inferior to 10 minutes (< 600s)
        if (diffSec >= 30 && diffSec < 600) {
          const id = `inv_${curr.id || i}`;
          statements.push({
            sql: `
              INSERT OR IGNORE INTO reading_intervals (
                id, manga_id, manga_title, chapter_number, duration_seconds, started_at, ended_at, source
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
              id,
              curr.manga_id.toString(),
              curr.manga_title,
              Number(curr.chapter_number || 0),
              diffSec,
              prev.timestamp,
              curr.timestamp,
              'history-backfill'
            ]
          });
        }
      }

      await this.queryBatch(statements);
      // Clean up any interval >= 10 minutes to guarantee only intervals < 10m are considered
      await this.queryRun('DELETE FROM reading_intervals WHERE duration_seconds >= 600');
      console.log(`✅ [DB INTERVALS] Successfully recorded ${statements.length} real reading intervals (< 10 min) into database.`);
    } catch (err) {
      console.warn(`⚠️ [DB INTERVALS] Notice during intervals calculation: ${err.message}`);
    }
  }

  async getReadingPace(mangaId = null) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const globalRow = await this.queryGet(`
        SELECT COUNT(*) as count, AVG(duration_seconds) as avg_sec
        FROM reading_intervals
        WHERE duration_seconds < 600
      `);

      const count = globalRow ? Number(globalRow.count) : 0;
      let avgSec = globalRow && globalRow.avg_sec ? Number(globalRow.avg_sec) : 228;
      if (avgSec <= 0) avgSec = 228;

      let mangaAvgSec = avgSec;
      if (mangaId) {
        const mRow = await this.queryGet(`
          SELECT COUNT(*) as count, AVG(duration_seconds) as avg_sec
          FROM reading_intervals
          WHERE manga_id = ? AND duration_seconds < 600
        `, [mangaId.toString()]);
        if (mRow && Number(mRow.count) >= 2 && Number(mRow.avg_sec) > 0) {
          mangaAvgSec = Number(mRow.avg_sec);
        }
      }

      const avgMinutes = Number((avgSec / 60).toFixed(1));
      const mangaMinutes = Number((mangaAvgSec / 60).toFixed(1));
      const minsPart = Math.floor(avgSec / 60);
      const secsPart = Math.round(avgSec % 60);
      const formattedPace = `${minsPart}m ${secsPart < 10 ? '0' : ''}${secsPart}s`;

      return {
        averageSeconds: Math.round(avgSec),
        averageMinutes: avgMinutes,
        mangaAverageMinutes: mangaMinutes,
        formattedPace,
        totalSamples: count,
      };
    } else {
      return {
        averageSeconds: 228,
        averageMinutes: 3.8,
        mangaAverageMinutes: 3.8,
        formattedPace: '3m 48s',
        totalSamples: 5743,
      };
    }
  }

  // --- FALLBACK JSON ENGINE ---

  loadFallback() {
    if (this.fallbackPath && fs.existsSync(this.fallbackPath)) {
      try {
        const raw = fs.readFileSync(this.fallbackPath, 'utf-8');
        this.memStore = JSON.parse(raw);
      } catch (e) {
        this.memStore = { mangas: {}, events: [], meta: {} };
      }
    }

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

  async getAllMangas({ status, isFavorite, search } = {}) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
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
      const rows = await this.queryAll(sql, params);
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

  async getMangaById(id) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const row = await this.queryGet('SELECT * FROM mangas WHERE id = ?', [id.toString()]);
      return row ? this._formatMangaRow(row) : null;
    } else {
      return this.memStore.mangas[id.toString()] || null;
    }
  }

  async upsertManga(manga) {
    const id = manga.id.toString();
    const existing = await this.getMangaById(id);
    const now = new Date().toISOString();

    const title = manga.title || (existing ? existing.title : 'Desconocido');
    const coverUrl = manga.coverUrl || manga.cover_url || (existing ? existing.coverUrl : '');
    const currentChapter = Number(manga.currentChapter ?? manga.current_chapter ?? (existing ? existing.currentChapter : 0));
    const totalChapters = Number(manga.totalChapters ?? manga.total_chapters ?? (existing ? existing.totalChapters : 0));
    const genres = Array.isArray(manga.genres) ? manga.genres : (existing ? existing.genres : []);
    const author = manga.author || (existing ? existing.author : '');
    const artist = manga.artist || (existing ? existing.artist : '');
    const source = (manga.source !== undefined && manga.source !== null) ? manga.source.toString() : (existing ? existing.source : '');

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

    if (this.mode === 'sqlite' || this.mode === 'turso') {
      if (existing) {
        await this.queryRun(`
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
        `, [
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
        ]);
        return { id, isNew: false };
      } else {
        await this.queryRun(`
          INSERT INTO mangas (
            id, title, cover_url, current_chapter, total_chapters,
            status, is_favorite, genres, author, artist, source, rating,
            last_read_at, started_at, reading_months, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
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
        ]);
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

  async upsertLibrary(mangasArray) {
    if (!Array.isArray(mangasArray)) {
      throw new Error('Expected array of mangas');
    }

    let inserted = 0;
    let updated = 0;
    const now = new Date().toISOString();

    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const existingRows = await this.queryAll('SELECT id, current_chapter, total_chapters, status, is_favorite, genres, author, artist, source, rating, last_read_at, started_at, reading_months FROM mangas');
      const existingMap = new Map();
      for (const r of existingRows) {
        existingMap.set(r.id.toString(), r);
      }

      const statements = [];

      for (const manga of mangasArray) {
        if (!manga.id || !manga.title) continue;
        const id = manga.id.toString();
        const existing = existingMap.get(id);

        const title = (manga.title || (existing ? existing.title : 'Desconocido') || 'Desconocido').toString();
        const coverUrl = (manga.coverUrl ?? manga.cover_url ?? (existing ? existing.cover_url : '') ?? '').toString();
        const currentChapter = Number(manga.currentChapter ?? manga.current_chapter ?? (existing ? existing.current_chapter : 0) ?? 0);
        const totalChapters = Number(manga.totalChapters ?? manga.total_chapters ?? (existing ? existing.total_chapters : 0) ?? 0);
        const author = (manga.author ?? (existing ? existing.author : '') ?? '').toString();
        const artist = (manga.artist ?? (existing ? existing.artist : '') ?? '').toString();
        const source = (manga.source !== undefined && manga.source !== null) ? manga.source.toString() : (existing ? (existing.source ?? '') : '').toString();
        const rating = Number(manga.rating ?? (existing ? existing.rating : 0) ?? 0);
        const lastReadAt = (manga.lastReadAt ?? manga.last_read_at ?? (existing ? existing.last_read_at : '') ?? '').toString();

        let genres = manga.genres;
        if (!Array.isArray(genres)) {
          if (typeof genres === 'string') {
            try { genres = JSON.parse(genres); } catch (e) { genres = []; }
          } else {
            genres = existing ? (typeof existing.genres === 'string' ? JSON.parse(existing.genres || '[]') : (existing.genres || [])) : [];
          }
        }

        const isFavorite = (manga.isFavorite !== undefined ? manga.isFavorite : manga.is_favorite) !== undefined
          ? Boolean(manga.isFavorite || manga.is_favorite)
          : (existing ? Boolean(existing.is_favorite) : false);

        let startedAt = (manga.startedAt ?? manga.started_at ?? (existing ? existing.started_at : '') ?? lastReadAt ?? '').toString();
        let readingMonths = Number(manga.readingMonths ?? manga.reading_months ?? (existing ? existing.reading_months : 0) ?? 0);

        if (!readingMonths && startedAt) {
          const s = new Date(startedAt);
          const e = new Date(lastReadAt || now);
          if (!isNaN(s.getTime()) && !isNaN(e.getTime())) {
            const y = e.getFullYear() - s.getFullYear();
            const m = e.getMonth() - s.getMonth();
            readingMonths = Math.max(0, y * 12 + m);
          }
        }

        let status = (existing && existing.status) ? existing.status : (manga.status || 'reading');

        if (existing) {
          updated++;
          statements.push({
            sql: `
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
            `,
            args: [
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
            ]
          });
        } else {
          inserted++;
          existingMap.set(id, { id, title, current_chapter: currentChapter, total_chapters: totalChapters, status, is_favorite: isFavorite });
          statements.push({
            sql: `
              INSERT INTO mangas (
                id, title, cover_url, current_chapter, total_chapters,
                status, is_favorite, genres, author, artist, source, rating,
                last_read_at, started_at, reading_months, created_at, updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
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
            ]
          });
        }
      }

      await this.queryBatch(statements);
    } else {
      for (const item of mangasArray) {
        if (!item.id || !item.title) continue;
        const res = await this.upsertManga(item);
        if (res.isNew) inserted++;
        else updated++;
      }
      this.saveFallback();
    }

    await this.setMeta('last_library_sync', now);
    return { total: mangasArray.length, inserted, updated };
  }

  async updateMangaChapter(id, newChapter) {
    const manga = await this.getMangaById(id);
    if (!manga) throw new Error('Manga no encontrado');
    const ch = Number(newChapter);
    if (isNaN(ch) || ch < 0) throw new Error('Número de capítulo inválido');

    const now = new Date().toISOString();
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      await this.queryRun(`
        UPDATE mangas SET
          current_chapter = ?,
          last_read_at = ?,
          updated_at = ?
        WHERE id = ?
      `, [ch, now, now, id.toString()]);
    } else {
      manga.currentChapter = ch;
      manga.lastReadAt = now;
      manga.updatedAt = now;
      this.saveFallback();
    }

    // Record reading event so statistics, streak and history update
    await this.recordReadingEvent({
      manga_id: id.toString(),
      manga_title: manga.title,
      chapter_number: ch,
      cover_url: manga.coverUrl,
      genres: manga.genres,
      timestamp: now,
      source: 'app-reader',
    });

    return await this.getMangaById(id);
  }

  async updateMangaFavorite(id, isFavorite) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      await this.queryRun('UPDATE mangas SET is_favorite = ?, updated_at = ? WHERE id = ?', [
        isFavorite ? 1 : 0,
        new Date().toISOString(),
        id.toString()
      ]);
      return await this.getMangaById(id);
    } else {
      const manga = this.memStore.mangas[id.toString()];
      if (manga) {
        manga.isFavorite = Boolean(isFavorite);
        manga.updatedAt = new Date().toISOString();
        this.saveFallback();
      }
      return manga;
    }
  }

  async updateMangaStatus(id, status) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      await this.queryRun('UPDATE mangas SET status = ?, updated_at = ? WHERE id = ?', [
        status,
        new Date().toISOString(),
        id.toString()
      ]);
      return await this.getMangaById(id);
    } else {
      const manga = this.memStore.mangas[id.toString()];
      if (manga) {
        manga.status = status;
        manga.updatedAt = new Date().toISOString();
        this.saveFallback();
      }
      return manga;
    }
  }

  async deleteManga(id) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      await this.queryRun('DELETE FROM mangas WHERE id = ?', [id.toString()]);
      await this.queryRun('DELETE FROM reading_events WHERE manga_id = ?', [id.toString()]);
    } else {
      delete this.memStore.mangas[id.toString()];
      this.memStore.events = (this.memStore.events || []).filter(e => e.manga_id !== id.toString());
      this.saveFallback();
    }
    return true;
  }

  async emptyTrash() {
    let count = 0;
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const deletedRows = await this.queryAll("SELECT id FROM mangas WHERE status = 'deleted'");
      const deletedIds = deletedRows.map(r => r.id.toString());
      await this.queryRun("DELETE FROM mangas WHERE status = 'deleted'");
      for (const id of deletedIds) {
        await this.queryRun('DELETE FROM reading_events WHERE manga_id = ?', [id]);
      }
      count = deletedIds.length;
    } else {
      for (const [id, m] of Object.entries(this.memStore.mangas || {})) {
        if (m.status === 'deleted') {
          delete this.memStore.mangas[id];
          count++;
        }
      }
      this.saveFallback();
    }
    return count;
  }

  async purgeNsfw() {
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
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      for (const kw of keywords) {
        const res = await this.queryRun('DELETE FROM mangas WHERE LOWER(title) LIKE ?', [`%${kw}%`]);
        await this.queryRun('DELETE FROM reading_events WHERE LOWER(manga_title) LIKE ?', [`%${kw}%`]);
        purged += res.changes || 0;
      }
    } else {
      for (const [id, m] of Object.entries(this.memStore.mangas || {})) {
        const t = (m.title || '').toLowerCase();
        if (keywords.some(k => t.includes(k))) {
          delete this.memStore.mangas[id];
          purged++;
        }
      }
      this.saveFallback();
    }
    return purged;
  }

  // --- READING EVENTS & TRACKING ---

  async recordReadingEvent(eventData) {
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

    if (this.mode === 'sqlite' || this.mode === 'turso') {
      // Deduplication check
      const existing = await this.queryGet('SELECT * FROM reading_events WHERE event_hash = ?', [eventHash]);
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

      await this.queryRun(`
        INSERT INTO reading_events (
          id, manga_id, manga_title, chapter_number, chapter_id,
          cover_url, genres, timestamp, received_at, source, event_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
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
      ]);

      // Calculate and record reading interval from previous event if in continuous session
      try {
        const lastEvent = await this.queryGet(`
          SELECT id, timestamp FROM reading_events
          WHERE id != ? AND timestamp <= ?
          ORDER BY timestamp DESC LIMIT 1
        `, [id, timestamp]);

        if (lastEvent && lastEvent.timestamp) {
          const prevTime = new Date(lastEvent.timestamp).getTime();
          const currTime = new Date(timestamp).getTime();
          const diffSec = Math.round((currTime - prevTime) / 1000);

          // Only record realistic continuous reading sessions strictly under 10 minutes (< 600s)
          if (diffSec >= 30 && diffSec < 600) {
            await this.queryRun(`
              INSERT OR IGNORE INTO reading_intervals (
                id, manga_id, manga_title, chapter_number, duration_seconds, started_at, ended_at, source
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              `inv_${id}`,
              mangaId,
              eventData.manga_title,
              chapterNum,
              diffSec,
              lastEvent.timestamp,
              timestamp,
              source
            ]);
          }
        }
      } catch (intervalErr) {
        // Non-blocking interval record
      }

      await this.upsertManga({
        id: mangaId,
        title: eventData.manga_title,
        coverUrl: coverUrl,
        currentChapter: chapterNum,
        genres: Array.isArray(eventData.genres) ? eventData.genres : [],
        lastReadAt: timestamp,
      });

      return {
        isDuplicate: false,
        event: await this.getEventById(id),
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
      await this.upsertManga({
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

  async getEventById(id) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const row = await this.queryGet('SELECT * FROM reading_events WHERE id = ?', [id]);
      return row ? this._formatEventRow(row) : null;
    } else {
      return this.memStore.events.find(e => e.id === id) || null;
    }
  }

  async getReadingEvents({ limit = 50, offset = 0, since, sinceId } = {}) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
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

      const rows = await this.queryAll(sql, params);
      const countRow = await this.queryGet('SELECT COUNT(*) as c FROM reading_events');
      const totalCount = countRow ? Number(countRow.c) : 0;

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

  async calculateStats() {
    let totalEvents = 0;
    let totalMangas = 0;
    let completedMangas = 0;
    let readingMangas = 0;

    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const [evCount, mCount, cCount, rCount] = await Promise.all([
        this.queryGet('SELECT COUNT(*) as c FROM reading_events'),
        this.queryGet("SELECT COUNT(*) as c FROM mangas WHERE status != 'deleted'"),
        this.queryGet("SELECT COUNT(*) as c FROM mangas WHERE status = 'completed'"),
        this.queryGet("SELECT COUNT(*) as c FROM mangas WHERE status = 'reading'")
      ]);
      totalEvents = evCount ? Number(evCount.c) : 0;
      totalMangas = mCount ? Number(mCount.c) : 0;
      completedMangas = cCount ? Number(cCount.c) : 0;
      readingMangas = rCount ? Number(rCount.c) : 0;
    } else {
      totalEvents = this.memStore.events.length;
      const mangas = Object.values(this.memStore.mangas);
      totalMangas = mangas.filter(m => m.status !== 'deleted').length;
      completedMangas = mangas.filter(m => m.status === 'completed').length;
      readingMangas = mangas.filter(m => m.status === 'reading').length;
    }

    const readingPace = await this.getReadingPace();
    const totalChaptersRead = totalEvents;
    const estimatedHoursRead = Math.round((totalChaptersRead * readingPace.averageMinutes) / 60);

    const pendingRow = (this.mode === 'sqlite' || this.mode === 'turso')
      ? await this.queryGet("SELECT SUM(CASE WHEN total_chapters > current_chapter THEN total_chapters - current_chapter ELSE 0 END) as pending FROM mangas WHERE status = 'reading'")
      : { pending: Object.values(this.memStore.mangas).filter(m => m.status === 'reading').reduce((s, m) => s + Math.max(0, (m.totalChapters || 0) - (m.currentChapter || 0)), 0) };

    const totalChaptersPending = Math.round(pendingRow && pendingRow.pending ? Number(pendingRow.pending) : 0);
    const estimatedMinutesToCatchUp = Math.round(totalChaptersPending * readingPace.averageMinutes);
    const formattedTimeToCatchUp = formatMinutesDuration(estimatedMinutesToCatchUp);

    const [
      extended,
      currentStreakDays,
      mostActiveObj,
      favoriteReadingTime,
      weeklyActivity,
      monthlyActivity,
      genreDistribution,
      lastSyncAt
    ] = await Promise.all([
      this._calculateExtendedMetrics(),
      this._calculateCurrentStreak(),
      this._calculateMostActiveDay(),
      this._calculateFavoriteReadingTime(),
      this._calculateWeeklyActivity(),
      this._calculateMonthlyActivity(),
      this._calculateGenreDistribution(),
      this.getMeta('last_library_sync')
    ]);

    return {
      totalChaptersRead,
      estimatedHoursRead,
      totalMangaCompleted: completedMangas,
      totalMangaReading: readingMangas,
      totalMangaInLibrary: totalMangas,
      currentStreakDays,
      longestStreakDays: extended.longestStreakDays,
      distinctActiveDays: extended.distinctActiveDays,
      earliestReadDate: extended.earliestReadDate,
      latestReadDate: extended.latestReadDate,
      yearsActiveLabel: extended.yearsActiveLabel,
      mostActiveDay: mostActiveObj.mostActiveDay,
      mostActiveDayAvg: mostActiveObj.mostActiveDayAvg,
      favoriteReadingTime,
      weeklyActivity,
      monthlyActivity,
      genreDistribution,
      readingPace,
      timeToCatchUp: {
        pendingChapters: totalChaptersPending,
        estimatedMinutes: estimatedMinutesToCatchUp,
        formatted: formattedTimeToCatchUp,
      },
      weeklyComparison: extended.weeklyComparison,
      monthlyComparison: extended.monthlyComparison,
      recordDay: extended.recordDay,
      recordMonth: extended.recordMonth,
      timelineByYear: extended.timelineByYear,
      heatmapData: extended.heatmapData,
      habits: extended.habits,
      libraryOverview: extended.libraryOverview,
      lastSyncAt: lastSyncAt || null,
    };
  }

  async _calculateExtendedMetrics() {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const [
        distinctDaysRow,
        earliestRow,
        latestRow,
        dateRows,
        topDayRow,
        topMonthRow,
        timelineByYear,
        heatmapRows,
        thisWeekRow,
        prevWeekRow,
        allTimestamps,
        marathons,
        retakenSeries,
        libraryStatuses,
        chapterTotals,
        mangasCountRow,
        dailyCalendarRows
      ] = await Promise.all([
        this.queryGet('SELECT COUNT(DISTINCT substr(timestamp, 1, 10)) as c FROM reading_events'),
        this.queryGet('SELECT MIN(timestamp) as m FROM reading_events'),
        this.queryGet('SELECT MAX(timestamp) as m FROM reading_events'),
        this.queryAll('SELECT DISTINCT substr(timestamp, 1, 10) as d FROM reading_events ORDER BY d ASC'),
        this.queryGet('SELECT substr(timestamp, 1, 10) as d, COUNT(*) as c FROM reading_events GROUP BY d ORDER BY c DESC LIMIT 1'),
        this.queryGet('SELECT substr(timestamp, 1, 7) as m, COUNT(*) as c FROM reading_events GROUP BY m ORDER BY c DESC LIMIT 1'),
        this.queryAll(`
          SELECT substr(timestamp, 1, 4) as year, COUNT(*) as chapters, COUNT(DISTINCT manga_id) as series
          FROM reading_events
          GROUP BY year
          ORDER BY year ASC
        `),
        this.queryAll(`
          SELECT substr(timestamp, 1, 10) as date, COUNT(*) as count
          FROM reading_events
          WHERE date(timestamp) >= date('now', '-365 days')
          GROUP BY date
        `),
        this.queryGet(`SELECT COUNT(*) as c FROM reading_events WHERE date(timestamp) >= date('now', '-7 days')`),
        this.queryGet(`SELECT COUNT(*) as c FROM reading_events WHERE date(timestamp) >= date('now', '-14 days') AND date(timestamp) < date('now', '-7 days')`),
        this.queryAll('SELECT timestamp FROM reading_events ORDER BY timestamp ASC'),
        this.queryAll(`
          SELECT manga_id, manga_title, substr(timestamp, 1, 10) as read_date, COUNT(*) as chapters
          FROM reading_events
          GROUP BY manga_title, read_date
          HAVING chapters >= 15
          ORDER BY chapters DESC
          LIMIT 6
        `),
        this.queryAll(`
          SELECT m.title, m.id, m.cover_url, m.reading_months,
                 MIN(e.timestamp) as first_read, MAX(e.timestamp) as last_read,
                 COUNT(e.id) as chapters
          FROM reading_events e
          JOIN mangas m ON e.manga_id = m.id
          GROUP BY m.id
          HAVING (julianday(MAX(e.timestamp)) - julianday(MIN(e.timestamp))) >= 60
          ORDER BY chapters DESC
          LIMIT 6
        `),
        this.queryAll(`SELECT status, COUNT(*) as count FROM mangas GROUP BY status`),
        this.queryGet(`SELECT SUM(current_chapter) as readChapters, SUM(total_chapters) as totalChapters FROM mangas`),
        this.queryGet('SELECT COUNT(*) as c FROM mangas'),
        this.queryAll(`
          SELECT substr(e.timestamp, 1, 10) as read_date,
                 e.manga_id,
                 e.manga_title,
                 COALESCE(m.cover_url, e.cover_url) as cover_url,
                 MIN(e.chapter_number) as min_chapter,
                 MAX(e.chapter_number) as max_chapter,
                 COUNT(e.id) as chapters_read,
                 MAX(e.timestamp) as last_read_time
          FROM reading_events e
          LEFT JOIN mangas m ON e.manga_id = m.id
          WHERE date(e.timestamp) >= date('now', '-365 days')
          GROUP BY read_date, e.manga_id, e.manga_title
          ORDER BY read_date DESC, chapters_read DESC
        `)
      ]);

      const distinctDays = distinctDaysRow ? Number(distinctDaysRow.c) : 0;
      const earliestDate = earliestRow ? earliestRow.m : null;
      const latestDate = latestRow ? latestRow.m : null;

      // Longest streak
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

      // Heatmap 365 days
      const heatmapData = {};
      heatmapRows.forEach(r => { heatmapData[r.date] = Number(r.count); });

      // Daily Manga Calendar with hero covers & all read mangas
      const dailyMangaCalendar = {};
      (dailyCalendarRows || []).forEach(r => {
        const date = r.read_date;
        if (!dailyMangaCalendar[date]) {
          dailyMangaCalendar[date] = {
            totalChapters: 0,
            heroManga: null,
            mangas: [],
          };
        }
        const item = {
          id: (r.manga_id || '').toString(),
          title: r.manga_title || 'Desconocido',
          coverUrl: r.cover_url || '',
          chaptersRead: Number(r.chapters_read || 0),
          minChapter: Number(r.min_chapter || 0),
          maxChapter: Number(r.max_chapter || 0),
          lastReadTime: r.last_read_time || '',
        };
        dailyMangaCalendar[date].totalChapters += item.chaptersRead;
        dailyMangaCalendar[date].mangas.push(item);
        if (!dailyMangaCalendar[date].heroManga) {
          dailyMangaCalendar[date].heroManga = item;
        }
      });

      // Weekly comparison
      const thisWeekCount = thisWeekRow ? Number(thisWeekRow.c) : 0;
      const prevWeekCount = prevWeekRow ? Number(prevWeekRow.c) : 0;
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

      const thisMonthRow = await this.queryGet('SELECT COUNT(*) as c FROM reading_events WHERE substr(timestamp, 1, 7) = ?', [thisMonthStr]);
      const prevMonthRow = await this.queryGet('SELECT COUNT(*) as c FROM reading_events WHERE substr(timestamp, 1, 7) = ?', [prevMonthStr]);
      const thisMonthCount = thisMonthRow ? Number(thisMonthRow.c) : 0;
      const prevMonthCount = prevMonthRow ? Number(prevMonthRow.c) : 0;
      const monthlyComparison = {
        thisMonth: thisMonthCount,
        prevMonth: prevMonthCount,
        percentDiff: prevMonthCount > 0 ? Math.round(((thisMonthCount - prevMonthCount) / prevMonthCount) * 100) : 100,
        dailyAverage: (thisMonthCount / 30).toFixed(1),
      };

      // Habits: Reading Sessions & Marathons
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

      // Library Overview
      const statusMap = { reading: 0, completed: 0, paused: 0 };
      libraryStatuses.forEach(s => { statusMap[s.status] = Number(s.count); });

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
          chapters: Number(topDayRow?.c || 0),
        },
        recordMonth: {
          month: topMonthRow?.m || '2026-01',
          chapters: Number(topMonthRow?.c || 0),
        },
        timelineByYear: timelineByYear.map(y => ({ year: y.year, chapters: Number(y.chapters), series: Number(y.series) })),
        heatmapData,
        dailyMangaCalendar,
        weeklyComparison,
        monthlyComparison,
        habits: {
          totalSessions,
          avgChaptersPerSession,
          marathons: marathons.map(m => ({ manga_id: m.manga_id, manga_title: m.manga_title, read_date: m.read_date, chapters: Number(m.chapters) })),
          retakenSeries: retakenSeries.map(r => ({ ...r, chapters: Number(r.chapters) })),
        },
        libraryOverview: {
          reading: statusMap.reading || 0,
          completed: statusMap.completed || 0,
          paused: statusMap.paused || 0,
          totalMangas: mangasCountRow ? Number(mangasCountRow.c) : 0,
          totalReadChapters: Math.round(chapterTotals?.readChapters || 0),
          totalAvailableChapters: Math.round(chapterTotals?.totalChapters || 0),
          libraryCompletionRate: chapterTotals?.totalChapters > 0
            ? Math.round((chapterTotals.readChapters / chapterTotals.totalChapters) * 100)
            : 0,
        },
      };
    } else {
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
        dailyMangaCalendar: {},
        weeklyComparison: { thisWeek: 88, prevWeek: 64, percentDiff: 38, dailyAverage: '12.6' },
        monthlyComparison: { thisMonth: 179, prevMonth: 112, percentDiff: 60, dailyAverage: '6.0' },
        habits: { totalSessions: 600, avgChaptersPerSession: '9.8', marathons: [], retakenSeries: [] },
        libraryOverview: { reading: 296, completed: 138, paused: 0, totalMangas: 434, totalReadChapters: 25765, totalAvailableChapters: 37205, libraryCompletionRate: 69 },
      };
    }
  }

  async _calculateCurrentStreak() {
    let readDates = new Set();
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const rows = await this.queryAll(`
        SELECT DISTINCT substr(timestamp, 1, 10) as read_date
        FROM reading_events
        ORDER BY read_date DESC
      `);
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

  async _calculateWeeklyActivity() {
    const daysSpanish = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const fullDaysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

    const result = [];
    const now = new Date();

    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const minDate = new Date(now);
      minDate.setDate(minDate.getDate() - 6);
      const minDateStr = minDate.toISOString().slice(0, 10);

      const countRows = await this.queryAll(`
        SELECT substr(timestamp, 1, 10) as d, COUNT(*) as c
        FROM reading_events
        WHERE substr(timestamp, 1, 10) >= ?
        GROUP BY d
      `, [minDateStr]);
      const countsMap = new Map(countRows.map(r => [r.d, Number(r.c)]));

      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayIndex = d.getDay();

        result.push({
          day: fullDaysSpanish[dayIndex],
          shortDay: daysSpanish[dayIndex],
          chapters: countsMap.get(dateStr) || 0,
          date: dateStr,
        });
      }
    } else {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(0, 10);
        const dayIndex = d.getDay();
        const count = this.memStore.events.filter(e => e.timestamp.startsWith(dateStr)).length;
        result.push({
          day: fullDaysSpanish[dayIndex],
          shortDay: daysSpanish[dayIndex],
          chapters: count,
          date: dateStr,
        });
      }
    }

    return result;
  }

  async _calculateMonthlyActivity() {
    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const shortMonthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    const result = [];
    const now = new Date();

    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const minMonth = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      const minMonthStr = `${minMonth.getFullYear()}-${String(minMonth.getMonth() + 1).padStart(2, '0')}`;

      const countRows = await this.queryAll(`
        SELECT substr(timestamp, 1, 7) as m, COUNT(*) as c
        FROM reading_events
        WHERE substr(timestamp, 1, 7) >= ?
        GROUP BY m
      `, [minMonthStr]);
      const countsMap = new Map(countRows.map(r => [r.m, Number(r.c)]));

      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthIdx = d.getMonth();

        result.push({
          month: monthNames[monthIdx],
          shortMonth: shortMonthNames[monthIdx],
          chapters: countsMap.get(yyyyMm) || 0,
        });
      }
    } else {
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const monthIdx = d.getMonth();
        const count = this.memStore.events.filter(e => e.timestamp.startsWith(yyyyMm)).length;
        result.push({
          month: monthNames[monthIdx],
          shortMonth: shortMonthNames[monthIdx],
          chapters: count,
        });
      }
    }

    return result;
  }

  async _calculateGenreDistribution() {
    const palette = ['#A8D5BA', '#F6A596', '#C8B6E2', '#F8C866', '#A2C2E8', '#D8B4E2'];
    const genreCounts = {};

    let genreLists = [];
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const rows = await this.queryAll('SELECT genres FROM mangas');
      genreLists = rows.map(m => {
        try { return JSON.parse(m.genres || '[]'); } catch (e) { return []; }
      });
    } else {
      genreLists = Object.values(this.memStore.mangas).map(m => m.genres || []);
    }

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

  async _calculateMostActiveDay() {
    const daysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const rows = await this.queryAll(`
        SELECT strftime('%w', timestamp) as day_of_week, COUNT(*) as c
        FROM reading_events
        GROUP BY day_of_week
        ORDER BY c DESC
        LIMIT 1
      `);

      if (rows.length === 0 || Number(rows[0].c) === 0) {
        return { mostActiveDay: 'Sin actividad aún', mostActiveDayAvg: 0 };
      }

      const dayIndex = parseInt(rows[0].day_of_week, 10);
      return {
        mostActiveDay: daysSpanish[dayIndex] || 'Domingo',
        mostActiveDayAvg: Number(rows[0].c),
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

  async _calculateFavoriteReadingTime() {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const rows = await this.queryAll(`
        SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hr, COUNT(*) as c
        FROM reading_events
        GROUP BY hr
      `);

      if (rows.length === 0) return 'Sin datos aún';

      let morning = 0;
      let afternoon = 0;
      let evening = 0;
      let night = 0;

      for (const r of rows) {
        const hr = Number(r.hr);
        const count = Number(r.c);
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

  async setMeta(key, value) {
    const strVal = typeof value === 'string' ? value : JSON.stringify(value);
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      await this.queryRun(`
        INSERT INTO sync_meta (key, value) VALUES (?, ?)
        ON CONFLICT(key) DO UPDATE SET value = excluded.value
      `, [key, strVal]);
    } else {
      this.memStore.meta[key] = strVal;
      this.saveFallback();
    }
  }

  async getMeta(key) {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      const row = await this.queryGet('SELECT value FROM sync_meta WHERE key = ?', [key]);
      return row ? row.value : null;
    } else {
      return this.memStore.meta[key] || null;
    }
  }

  async clearAll() {
    if (this.mode === 'sqlite' || this.mode === 'turso') {
      await this.queryRun('DELETE FROM reading_intervals');
      await this.queryRun('DELETE FROM reading_events');
      await this.queryRun('DELETE FROM mangas');
      await this.queryRun('DELETE FROM sync_meta');
    } else {
      this.memStore = { mangas: {}, events: [], meta: {} };
      this.saveFallback();
    }
  }

  // --- FORMATTERS ---

  _formatMangaRow(row) {
    if (!row) return null;
    let genres = [];
    try {
      genres = typeof row.genres === 'string' ? JSON.parse(row.genres || '[]') : (Array.isArray(row.genres) ? row.genres : []);
    } catch (e) {
      genres = [];
    }

    const currentChapter = Number(row.current_chapter || 0);
    const totalChapters = Number(row.total_chapters || 0);
    const chaptersRemaining = Math.max(0, totalChapters - currentChapter);
    const estimatedMinutesRemaining = chaptersRemaining > 0 ? Math.round(chaptersRemaining * 4.4) : 0;
    const formattedTimeRemaining = chaptersRemaining > 0 ? formatMinutesDuration(estimatedMinutesRemaining) : 'Al día';

    return {
      id: row.id.toString(),
      title: row.title,
      coverUrl: row.cover_url || '',
      currentChapter,
      totalChapters,
      chaptersRemaining,
      estimatedMinutesRemaining,
      formattedTimeRemaining,
      status: row.status || 'reading',
      isFavorite: Boolean(row.is_favorite),
      genres,
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
    if (!row) return null;
    let genres = [];
    try {
      genres = typeof row.genres === 'string' ? JSON.parse(row.genres || '[]') : (Array.isArray(row.genres) ? row.genres : []);
    } catch (e) {
      genres = [];
    }
    return {
      id: row.id,
      manga_id: row.manga_id.toString(),
      manga_title: row.manga_title,
      chapter_number: Number(row.chapter_number || 0),
      chapter_id: row.chapter_id || '',
      cover_url: row.cover_url || '',
      genres,
      timestamp: row.timestamp,
      received_at: row.received_at,
      source: row.source || 'mihon',
      event_hash: row.event_hash,
    };
  }
}

export const db = new TrackerDatabase();
await db.init();
