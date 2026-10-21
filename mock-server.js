import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, 'mock-db.json');

// Ensure DB exists
if (!fs.existsSync(DB_PATH)) {
  fs.writeFileSync(DB_PATH, JSON.stringify({ events: [] }, null, 2));
}

const PORT = 3000;

const server = http.createServer((req, res) => {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // Mihon Fork Webhook Endpoint
  if (req.method === 'POST' && req.url === '/api/track') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        console.log('\n[MIHON WEBHOOK RECIBIDO]', new Date().toLocaleTimeString());
        console.log(JSON.stringify(payload, null, 2));

        // Read and persist to local mock DB
        const rawDb = fs.readFileSync(DB_PATH, 'utf-8');
        const db = JSON.parse(rawDb);
        db.events.unshift({
          ...payload,
          id: `evt-${Date.now()}`,
          received_at: new Date().toISOString(),
        });
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok', message: 'Chapter completion tracked successfully', payload }));
      } catch (err) {
        console.error('Error procesando payload:', err.message);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // Get tracked events API
  if (req.method === 'GET' && req.url === '/api/events') {
    const rawDb = fs.readFileSync(DB_PATH, 'utf-8');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(rawDb);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n=================================================`);
  console.log(`🚀 Mihon Tracker Backend Mock Server activo en:`);
  console.log(`   - Local:    http://localhost:${PORT}/api/track`);
  console.log(`   - Emulador: http://10.0.2.2:${PORT}/api/track`);
  console.log(`=================================================\n`);
});
