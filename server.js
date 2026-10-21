import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'mock-db.json');
const DIST_PATH = path.join(__dirname, 'dist');

// Ensure database file exists
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ events: [] }, null, 2));
}

const PORT = process.env.PORT || 3000;

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

const server = http.createServer((req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // 1. Mihon Webhook API Endpoint
  if (req.method === 'POST' && req.url === '/api/track') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log(`\n⚡ [WEBHOOK CLOUD RECIBIDO] ${new Date().toLocaleTimeString()} - ${payload.manga_title} Cap. ${payload.chapter_number}`);

        const raw = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(raw);
        const eventWithId = {
          ...payload,
          id: `evt-${Date.now()}`,
          received_at: new Date().toISOString(),
        };
        db.events.unshift(eventWithId);
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', tracked: true, event: eventWithId }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 2. Events API Endpoint
  if (req.method === 'GET' && req.url === '/api/events') {
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(raw);
    return;
  }

  // 3. Static Assets & SPA Routing
  let filePath = path.join(DIST_PATH, req.url === '/' ? 'index.html' : req.url.split('?')[0]);

  // If path has no extension and file does not exist, fallback to index.html (SPA)
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
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor Mihon Tracker activo en puerto ${PORT}`);
});
