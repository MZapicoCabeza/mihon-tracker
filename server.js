import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_PATH = path.join(__dirname, 'dist');

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.TRACKER_API_KEY || process.env.API_KEY || null;

if (API_KEY) {
  console.log('🔒 [SECURITY] Authentication enabled for write endpoints (X-API-KEY / Bearer token)');
} else {
  console.log('⚠️ [SECURITY] Running in open mode without TRACKER_API_KEY. Write endpoints accept unauthenticated requests.');
}

// MIME types for static assets
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive',
};

// Helper: send JSON response
function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Helper: send text/error response
function sendError(res, statusCode, message, details = null) {
  sendJson(res, statusCode, {
    error: message,
    statusCode,
    ...(details ? { details } : {}),
  });
}

// Helper: validate API Key if configured
function isAuthorized(req) {
  if (!API_KEY) return true; // Open mode if no key configured

  const reqKey = req.headers['x-api-key'] ||
    (req.headers['authorization']?.startsWith('Bearer ') ? req.headers['authorization'].slice(7) : null);

  return reqKey === API_KEY;
}

// Helper: parse JSON request body with max size limit (50MB)
function parseBody(req, maxSize = 50 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;

    req.on('data', chunk => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new Error(`Payload too large (limit ${Math.round(maxSize / 1024 / 1024)}MB)`));
        req.destroy();
        return;
      }
      body += chunk.toString();
    });

    req.on('end', () => {
      if (!body.trim()) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(body);
        resolve(parsed);
      } catch (err) {
        reject(new Error('Invalid JSON format: ' + err.message));
      }
    });

    req.on('error', err => reject(err));
  });
}

export async function handleRequest(req, res) {
  // Global CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-KEY, User-Agent, Accept');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = urlObj.pathname;
  const searchParams = urlObj.searchParams;

  // --- API ROUTES ---

  // Health check
  if (req.method === 'GET' && pathname === '/api/health') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'Mihon Reading Tracker Backend',
      version: '2.0.0',
      uptime: Math.round(process.uptime()),
      db: 'sqlite',
      authRequired: Boolean(API_KEY),
    });
    return;
  }

  // 1. POST /api/track: Chapter completion webhook from Mihon
  if (req.method === 'POST' && pathname === '/api/track') {
    if (!isAuthorized(req)) {
      sendError(res, 401, 'Unauthorized: Invalid or missing X-API-KEY');
      return;
    }

    try {
      const payload = await parseBody(req);

      // Validate required fields
      if (!payload.manga_id || (typeof payload.manga_id !== 'string' && typeof payload.manga_id !== 'number')) {
        sendError(res, 400, 'Validation Error: "manga_id" is required and must be a string or number');
        return;
      }
      if (!payload.manga_title || typeof payload.manga_title !== 'string') {
        sendError(res, 400, 'Validation Error: "manga_title" is required and must be a string');
        return;
      }
      if (payload.chapter_number === undefined || payload.chapter_number === null || isNaN(Number(payload.chapter_number))) {
        sendError(res, 400, 'Validation Error: "chapter_number" is required and must be a valid number');
        return;
      }

      console.log(`\n⚡ [WEBHOOK RECIBIDO] ${new Date().toLocaleTimeString()} - ${payload.manga_title} Cap. ${payload.chapter_number}`);

      const recordResult = db.recordReadingEvent({
        id: payload.id || payload.event_id,
        manga_id: payload.manga_id.toString(),
        manga_title: payload.manga_title.trim(),
        chapter_number: Number(payload.chapter_number),
        chapter_id: payload.chapter_id ? payload.chapter_id.toString() : '',
        cover_url: payload.cover_url || '',
        genres: Array.isArray(payload.genres) ? payload.genres : [],
        timestamp: payload.timestamp || new Date().toISOString(),
        source: payload.source || 'mihon',
      });

      if (recordResult.isDuplicate) {
        console.log(`🔁 [DEDUPLICATED] Event already recorded for ${payload.manga_title} Cap. ${payload.chapter_number}`);
        sendJson(res, 200, {
          status: 'ok',
          deduplicated: true,
          message: 'Event was already recorded (idempotent)',
          event: recordResult.event,
        });
        return;
      }

      sendJson(res, 201, {
        status: 'ok',
        tracked: true,
        deduplicated: false,
        event: recordResult.event,
      });
      return;
    } catch (err) {
      console.error('❌ [ERROR] /api/track:', err.message);
      sendError(res, 400, err.message);
      return;
    }
  }

  // 2. GET /api/events: Read history events
  if (req.method === 'GET' && pathname === '/api/events') {
    try {
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);
      const since = searchParams.get('since') || null;
      const sinceId = searchParams.get('sinceId') || null;

      const result = db.getReadingEvents({ limit, offset, since, sinceId });
      sendJson(res, 200, result);
      return;
    } catch (err) {
      console.error('❌ [ERROR] /api/events:', err.message);
      sendError(res, 500, 'Failed to retrieve events: ' + err.message);
      return;
    }
  }

  // 3. POST /api/sync/library: Bulk import/sync library from Mihon
  if (req.method === 'POST' && pathname === '/api/sync/library') {
    if (!isAuthorized(req)) {
      sendError(res, 401, 'Unauthorized: Invalid or missing X-API-KEY');
      return;
    }

    try {
      const payload = await parseBody(req);
      const mangas = Array.isArray(payload) ? payload : payload.mangas;

      if (!Array.isArray(mangas)) {
        sendError(res, 400, 'Validation Error: Expected an array of mangas or { mangas: [...] }');
        return;
      }

      console.log(`\n📚 [LIBRARY SYNC] Syncing ${mangas.length} mangas from Mihon`);
      const syncResult = db.upsertLibrary(mangas);

      sendJson(res, 200, {
        status: 'ok',
        count: syncResult.total,
        inserted: syncResult.inserted,
        updated: syncResult.updated,
        lastSyncAt: new Date().toISOString(),
      });
      return;
    } catch (err) {
      console.error('❌ [ERROR] /api/sync/library:', err.message);
      sendError(res, 400, 'Sync failed: ' + err.message);
      return;
    }
  }

  // 4. GET /api/library: Retrieve synced library
  if (req.method === 'GET' && pathname === '/api/library') {
    try {
      const status = searchParams.get('status') || 'all';
      const favoriteParam = searchParams.get('favorite');
      const isFavorite = favoriteParam !== null ? favoriteParam === 'true' || favoriteParam === '1' : undefined;
      const search = searchParams.get('search') || '';

      const mangas = db.getAllMangas({ status, isFavorite, search });
      sendJson(res, 200, {
        mangas,
        total: mangas.length,
      });
      return;
    } catch (err) {
      console.error('❌ [ERROR] /api/library:', err.message);
      sendError(res, 500, 'Failed to retrieve library: ' + err.message);
      return;
    }
  }

  // 5. GET /api/stats: Dynamically calculate real reading statistics
  if (req.method === 'GET' && pathname === '/api/stats') {
    try {
      const stats = db.calculateStats();
      sendJson(res, 200, {
        stats,
      });
      return;
    } catch (err) {
      console.error('❌ [ERROR] /api/stats:', err.message);
      sendError(res, 500, 'Failed to calculate stats: ' + err.message);
      return;
    }
  }

  // 6. POST /api/sync/backup: Import backup payload (JSON export or parsed backup)
  if (req.method === 'POST' && pathname === '/api/sync/backup') {
    if (!isAuthorized(req)) {
      sendError(res, 401, 'Unauthorized: Invalid or missing X-API-KEY');
      return;
    }

    try {
      const payload = await parseBody(req);
      
      // Support various backup formats (Mihon JSON export, Tachiyomi JSON, or direct list)
      const backupMangas = payload.backupManga || payload.mangas || [];
      const backupHistory = payload.history || [];

      let importedMangas = 0;
      let importedEvents = 0;

      if (Array.isArray(backupMangas) && backupMangas.length > 0) {
        const formattedMangas = backupMangas.map(item => {
          const mangaData = item.manga || item;
          const chapters = item.chapters || [];
          const readChapters = chapters.filter(c => c.read);
          const maxReadChapter = readChapters.reduce((max, c) => Math.max(max, c.chapterNumber || 0), 0);

          return {
            id: mangaData.id?.toString() || mangaData.url || mangaData.title,
            title: mangaData.title,
            cover_url: mangaData.thumbnailUrl || mangaData.coverUrl || mangaData.cover_url || '',
            current_chapter: mangaData.current_chapter ?? mangaData.currentChapter ?? maxReadChapter ?? 0,
            total_chapters: mangaData.total_chapters ?? mangaData.totalChapters ?? chapters.length ?? 0,
            genres: mangaData.genre || mangaData.genres || [],
            author: mangaData.author || '',
            artist: mangaData.artist || '',
            source: mangaData.source?.toString() || '',
            is_favorite: (mangaData.favorite !== undefined ? mangaData.favorite : mangaData.is_favorite) ? 1 : 0,
            status: mangaData.status === 2 || mangaData.status === 'completed' ? 'completed' : 'reading',
            started_at: mangaData.started_at || mangaData.startedAt || '',
            last_read_at: mangaData.last_read_at || mangaData.lastReadAt || '',
            reading_months: mangaData.reading_months ?? mangaData.readingMonths ?? 0,
          };
        });

        const syncRes = db.upsertLibrary(formattedMangas);
        importedMangas = syncRes.total;
      }

      // Import history events if provided
      if (Array.isArray(backupHistory) && backupHistory.length > 0) {
        for (const h of backupHistory) {
          try {
            db.recordReadingEvent({
              manga_id: h.manga_id || h.url || 'backup',
              manga_title: h.manga_title || h.title || 'Manga',
              chapter_number: Number(h.chapter_number || h.lastRead || 1),
              timestamp: (h.readAt || h.timestamp) ? new Date(h.readAt || h.timestamp).toISOString() : new Date().toISOString(),
              source: 'backup-import',
            });
            importedEvents++;
          } catch (e) {
            // Ignore single malformed history items
          }
        }
      }

      console.log(`📦 [BACKUP IMPORT] Imported ${importedMangas} mangas and ${importedEvents} history items`);
      sendJson(res, 200, {
        status: 'ok',
        importedMangas,
        importedEvents,
        lastSyncAt: new Date().toISOString(),
      });
      return;
    } catch (err) {
      console.error('❌ [ERROR] /api/sync/backup:', err.message);
      sendError(res, 400, 'Backup import failed: ' + err.message);
      return;
    }
  }

  // 7. PUT /api/library/:id/favorite: Update favorite
  if (req.method === 'PUT' && pathname.startsWith('/api/library/') && pathname.endsWith('/favorite')) {
    const parts = pathname.split('/');
    const id = parts[3];
    try {
      const payload = await parseBody(req);
      const isFavorite = Boolean(payload.isFavorite);
      const updated = db.updateMangaFavorite(id, isFavorite);
      sendJson(res, 200, { status: 'ok', manga: updated });
      return;
    } catch (err) {
      sendError(res, 400, err.message);
      return;
    }
  }

  // 8. PUT /api/library/:id/status: Update status
  if (req.method === 'PUT' && pathname.startsWith('/api/library/') && pathname.endsWith('/status')) {
    const parts = pathname.split('/');
    const id = parts[3];
    try {
      const payload = await parseBody(req);
      if (!['reading', 'completed', 'paused'].includes(payload.status)) {
        sendError(res, 400, 'Invalid status. Must be "reading", "completed", or "paused"');
        return;
      }
      const updated = db.updateMangaStatus(id, payload.status);
      sendJson(res, 200, { status: 'ok', manga: updated });
      return;
    } catch (err) {
      sendError(res, 400, err.message);
      return;
    }
  }

  // 9. POST /api/reset (Testing / Dev only)
  if (req.method === 'POST' && pathname === '/api/reset') {
    if (process.env.NODE_ENV !== 'test' && !isAuthorized(req)) {
      sendError(res, 403, 'Forbidden: Reset only permitted in test environment or with API key');
      return;
    }
    db.clearAll();
    sendJson(res, 200, { status: 'ok', message: 'All tracker database data cleared' });
    return;
  }

  // --- STATIC ASSETS & SPA ROUTING ---
  let filePath = path.join(DIST_PATH, req.url === '/' ? 'index.html' : pathname);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(DIST_PATH, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  });
}

export function createServerInstance() {
  return http.createServer(handleRequest);
}

export const server = createServerInstance();

const isMainModule = process.argv[1] && (
  path.resolve(process.argv[1]) === path.resolve(__filename)
);

if (isMainModule) {
  server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 Mihon Reading Tracker Server active on port ${PORT}`);
    console.log(`🌐 Local URL: http://localhost:${PORT}`);
    console.log(`📡 Cloud API: https://mihon-tracker.onrender.com`);
    console.log(`======================================================\n`);
  });
}
