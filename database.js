import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = process.env.DATABASE_PATH || process.env.DB_FILE || path.join(__dirname, 'tracker.db');
const MOCK_DB_FILE = path.join(__dirname, 'mock-db.json');

// Ensure directory exists
const dbDir = path.dirname(DB_FILE);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export class TrackerDatabase {
  constructor(dbPath = DB_FILE) {
    this.dbPath = dbPath;
    this.db = new DatabaseSync(dbPath);
    this.initSchema();
    this.migrateFromMockDbIfNeeded();
  }

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
  }

  migrateFromMockDbIfNeeded() {
    try {
      if (this.dbPath === ':memory:') return;
      const eventCount = this.db.prepare('SELECT COUNT(*) as c FROM reading_events').get().c;
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
      console.warn('⚠️ [DB MIGRATION] Notice: Could not migrate from mock-db.json:', err.message);
    }
  }

  // Generate stable deterministic hash for deduplication
  generateEventHash(mangaId, chapterNumber, timestamp) {
    // Normalise timestamp to date or ISO minute to avoid accidental double-taps
    const dateStr = timestamp ? new Date(timestamp).toISOString().slice(0, 16) : '';
    return crypto
      .createHash('sha256')
      .update(`${mangaId}:${Number(chapterNumber).toFixed(2)}:${dateStr}`)
      .digest('hex');
  }

  // --- MANGAS / LIBRARY ---

  getAllMangas({ status, isFavorite, search } = {}) {
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
  }

  getMangaById(id) {
    const row = this.db.prepare('SELECT * FROM mangas WHERE id = ?').get(id.toString());
    return row ? this._formatMangaRow(row) : null;
  }

  upsertManga(manga) {
    const id = manga.id.toString();
    const existing = this.getMangaById(id);
    const now = new Date().toISOString();

    const title = manga.title || (existing ? existing.title : 'Desconocido');
    const coverUrl = manga.coverUrl || manga.cover_url || (existing ? existing.coverUrl : '');
    const currentChapter = Number(manga.currentChapter ?? manga.current_chapter ?? (existing ? existing.currentChapter : 0));
    const totalChapters = Number(manga.totalChapters ?? manga.total_chapters ?? (existing ? existing.totalChapters : 0));
    const genres = JSON.stringify(manga.genres || (existing ? existing.genres : []));
    const author = manga.author || (existing ? existing.author : '');
    const artist = manga.artist || (existing ? existing.artist : '');
    const source = manga.source || (existing ? existing.source : '');
    const isFavorite = (manga.isFavorite !== undefined ? manga.isFavorite : manga.is_favorite) !== undefined
      ? ((manga.isFavorite || manga.is_favorite) ? 1 : 0)
      : (existing ? (existing.isFavorite ? 1 : 0) : 0);
    const rating = Number(manga.rating ?? (existing ? existing.rating : 0));
    const lastReadAt = manga.lastReadAt || manga.last_read_at || (existing ? existing.lastReadAt : '');
    
    // Auto status determination if not specified
    let status = manga.status || (existing ? existing.status : 'reading');
    if (totalChapters > 0 && currentChapter >= totalChapters) {
      status = 'completed';
    }

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
        isFavorite,
        genres,
        author,
        artist,
        source,
        rating,
        lastReadAt,
        lastReadAt,
        now,
        id
      );
      return { id, isNew: false };
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO mangas (
          id, title, cover_url, current_chapter, total_chapters,
          status, is_favorite, genres, author, artist, source, rating,
          last_read_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        id,
        title,
        coverUrl,
        currentChapter,
        totalChapters,
        status,
        isFavorite,
        genres,
        author,
        artist,
        source,
        rating,
        lastReadAt,
        now,
        now
      );
      return { id, isNew: true };
    }
  }

  upsertLibrary(mangasArray) {
    if (!Array.isArray(mangasArray)) {
      throw new Error('Expected array of mangas');
    }

    let inserted = 0;
    let updated = 0;

    // Use transaction for bulk operations
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

    this.setMeta('last_library_sync', new Date().toISOString());
    return { total: mangasArray.length, inserted, updated };
  }

  updateMangaFavorite(id, isFavorite) {
    const stmt = this.db.prepare('UPDATE mangas SET is_favorite = ?, updated_at = ? WHERE id = ?');
    stmt.run(isFavorite ? 1 : 0, new Date().toISOString(), id.toString());
    return this.getMangaById(id);
  }

  updateMangaStatus(id, status) {
    const stmt = this.db.prepare('UPDATE mangas SET status = ?, updated_at = ? WHERE id = ?');
    stmt.run(status, new Date().toISOString(), id.toString());
    return this.getMangaById(id);
  }

  // --- READING EVENTS & TRACKING ---

  recordReadingEvent(eventData) {
    if (!eventData.manga_id || !eventData.manga_title || eventData.chapter_number === undefined) {
      throw new Error('Missing required fields: manga_id, manga_title, chapter_number');
    }

    const mangaId = eventData.manga_id.toString();
    const chapterNum = Number(eventData.chapter_number);
    if (isNaN(chapterNum) || chapterNum < 0) {
      throw new Error('chapter_number must be a non-negative number');
    }

    const timestamp = eventData.timestamp && !isNaN(new Date(eventData.timestamp).getTime())
      ? new Date(eventData.timestamp).toISOString()
      : new Date().toISOString();

    const receivedAt = new Date().toISOString();
    const eventHash = eventData.event_hash || this.generateEventHash(mangaId, chapterNum, timestamp);
    const id = eventData.id || `evt_${mangaId}_${chapterNum}_${Date.now()}`;

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

    // Insert event
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

    // Update or insert manga
    this.upsertManga({
      id: mangaId,
      title: eventData.manga_title,
      coverUrl: coverUrl,
      currentChapter: chapterNum,
      genres: Array.isArray(eventData.genres) ? eventData.genres : [],
      lastReadAt: timestamp,
    });

    const newEvent = this.getEventById(id);
    return {
      isDuplicate: false,
      event: newEvent,
    };
  }

  getEventById(id) {
    const row = this.db.prepare('SELECT * FROM reading_events WHERE id = ?').get(id);
    return row ? this._formatEventRow(row) : null;
  }

  getReadingEvents({ limit = 50, offset = 0, since, sinceId } = {}) {
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
  }

  // --- STATS CALCULATION (REAL DATA) ---

  calculateStats() {
    const totalEvents = this.db.prepare('SELECT COUNT(*) as c FROM reading_events').get().c;
    const totalMangas = this.db.prepare('SELECT COUNT(*) as c FROM mangas').get().c;
    const completedMangas = this.db.prepare("SELECT COUNT(*) as c FROM mangas WHERE status = 'completed'").get().c;
    const readingMangas = this.db.prepare("SELECT COUNT(*) as c FROM mangas WHERE status = 'reading'").get().c;

    // Distinct read chapters count or total event count
    const totalChaptersRead = totalEvents;
    const estimatedHoursRead = Math.round((totalChaptersRead * 10) / 60);

    // Streak calculation
    const currentStreakDays = this._calculateCurrentStreak();

    // Weekly activity (last 7 days from today)
    const weeklyActivity = this._calculateWeeklyActivity();

    // Monthly activity (last 6 months)
    const monthlyActivity = this._calculateMonthlyActivity();

    // Genre distribution
    const genreDistribution = this._calculateGenreDistribution();

    // Most active day & average
    const { mostActiveDay, mostActiveDayAvg } = this._calculateMostActiveDay();

    // Favorite reading time (Mañana, Tarde, Noche, Madrugada)
    const favoriteReadingTime = this._calculateFavoriteReadingTime();

    return {
      totalChaptersRead,
      estimatedHoursRead,
      totalMangaCompleted: completedMangas,
      totalMangaReading: readingMangas,
      totalMangaInLibrary: totalMangas,
      currentStreakDays,
      mostActiveDay,
      mostActiveDayAvg,
      favoriteReadingTime,
      weeklyActivity,
      monthlyActivity,
      genreDistribution,
      lastSyncAt: this.getMeta('last_library_sync') || null,
    };
  }

  _calculateCurrentStreak() {
    // Get distinct reading dates in UTC YYYY-MM-DD
    const rows = this.db.prepare(`
      SELECT DISTINCT substr(timestamp, 1, 10) as read_date
      FROM reading_events
      ORDER BY read_date DESC
    `).all();

    if (rows.length === 0) return 0;

    const readDates = new Set(rows.map(r => r.read_date));
    const now = new Date();
    
    // Format YYYY-MM-DD in local/UTC
    const formatDate = d => d.toISOString().slice(0, 10);

    const todayStr = formatDate(now);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDate(yesterday);

    let streak = 0;
    let checkDate = new Date(now);

    // If no read today, check if yesterday was read. If neither, streak is 0.
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

    // Last 7 days in chronological order
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const dayIndex = d.getDay();

      const countRow = this.db.prepare(`
        SELECT COUNT(*) as c
        FROM reading_events
        WHERE substr(timestamp, 1, 10) = ?
      `).get(dateStr);

      result.push({
        day: fullDaysSpanish[dayIndex],
        shortDay: daysSpanish[dayIndex],
        chapters: countRow ? countRow.c : 0,
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

    // Last 6 months
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yyyyMm = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthIdx = d.getMonth();

      const countRow = this.db.prepare(`
        SELECT COUNT(*) as c
        FROM reading_events
        WHERE substr(timestamp, 1, 7) = ?
      `).get(yyyyMm);

      result.push({
        month: monthNames[monthIdx],
        shortMonth: shortMonthNames[monthIdx],
        chapters: countRow ? countRow.c : 0,
      });
    }

    return result;
  }

  _calculateGenreDistribution() {
    const palette = [
      '#A8D5BA', // Sage green
      '#F6A596', // Coral peach
      '#C8B6E2', // Lavender
      '#F8C866', // Honey yellow
      '#A2C2E8', // Soft sky blue
      '#D8B4E2', // Orchid
      '#E8D5B5', // Warm almond
      '#BCE5D0', // Mint
    ];

    const genreCounts = {};
    const mangas = this.db.prepare('SELECT genres FROM mangas').all();

    for (const m of mangas) {
      try {
        const list = JSON.parse(m.genres || '[]');
        if (Array.isArray(list)) {
          for (const g of list) {
            const trimmed = g.trim();
            if (trimmed) {
              genreCounts[trimmed] = (genreCounts[trimmed] || 0) + 1;
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const sorted = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);

    const totalGenreOccurrences = sorted.reduce((sum, item) => sum + item[1], 0);

    return sorted.map(([genre, count], idx) => ({
      genre,
      count,
      percentage: totalGenreOccurrences > 0 ? Math.round((count / totalGenreOccurrences) * 100) : 0,
      color: palette[idx % palette.length],
    }));
  }

  _calculateMostActiveDay() {
    const daysSpanish = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
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
  }

  _calculateFavoriteReadingTime() {
    const rows = this.db.prepare(`
      SELECT CAST(strftime('%H', timestamp) AS INTEGER) as hr, COUNT(*) as c
      FROM reading_events
      GROUP BY hr
    `).all();

    if (rows.length === 0) return 'Sin datos aún';

    let morning = 0;   // 06:00 - 12:00
    let afternoon = 0; // 12:00 - 18:00
    let evening = 0;   // 18:00 - 24:00
    let night = 0;     // 00:00 - 06:00

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
  }

  // --- SETTINGS / META ---

  setMeta(key, value) {
    const stmt = this.db.prepare(`
      INSERT INTO sync_meta (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    stmt.run(key, typeof value === 'string' ? value : JSON.stringify(value));
  }

  getMeta(key) {
    const row = this.db.prepare('SELECT value FROM sync_meta WHERE key = ?').get(key);
    return row ? row.value : null;
  }

  // Clear all data (for testing / reset)
  clearAll() {
    this.db.exec(`
      DELETE FROM reading_events;
      DELETE FROM mangas;
      DELETE FROM sync_meta;
    `);
  }

  // --- ROW FORMATTERS ---

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
