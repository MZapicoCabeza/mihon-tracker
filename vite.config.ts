import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import fs from 'fs';
import path from 'path';

function trackerApiPlugin(): Plugin {
  const dbPath = path.resolve(__dirname, 'mock-db.json');
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ events: [] }, null, 2));
  }

  return {
    name: 'tracker-api-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, User-Agent');

        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          res.end();
          return;
        }

        if (req.url === '/api/track' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk.toString();
          });
          req.on('end', () => {
            try {
              const payload = JSON.parse(body);
              console.log(
                '\n⚡ [MIHON WEBHOOK RECIBIDO DESDE EL MÓVIL POR WI-FI]',
                new Date().toLocaleTimeString()
              );
              console.log(JSON.stringify(payload, null, 2));

              const raw = fs.readFileSync(dbPath, 'utf-8');
              const db = JSON.parse(raw);
              const eventWithId = {
                ...payload,
                id: `evt-${Date.now()}`,
                received_at: new Date().toISOString(),
              };
              db.events.unshift(eventWithId);
              fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));

              res.setHeader('Content-Type', 'application/json');
              res.statusCode = 200;
              res.end(
                JSON.stringify({ status: 'ok', tracked: true, event: eventWithId })
              );
            } catch (err: any) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
          });
          return;
        }

        if (req.url === '/api/events' && req.method === 'GET') {
          const raw = fs.readFileSync(dbPath, 'utf-8');
          res.setHeader('Content-Type', 'application/json');
          res.statusCode = 200;
          res.end(raw);
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), trackerApiPlugin()],
  server: {
    port: 3000,
    host: true,
  },
});
