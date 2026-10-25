import fs from 'fs';

let content = fs.readFileSync('./tracker-app/server.js', 'utf-8');

const needle = 'Failed to calculate stats:';
const idx = content.indexOf(needle);
if (idx !== -1) {
  const blockEnd = content.indexOf('  }', idx) + 3;
  const proxyCode = `

  // 5.1 GET /api/cover-proxy: Server-side cover proxy bypassing CORS and hotlink protection
  if (req.method === 'GET' && pathname === '/api/cover-proxy') {
    const targetUrl = searchParams.get('url');
    if (!targetUrl || !targetUrl.startsWith('http')) {
      sendError(res, 400, 'Missing or invalid url parameter');
      return;
    }

    try {
      const u = new URL(targetUrl);
      const upstream = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': u.origin + '/',
        }
      });

      if (!upstream.ok) {
        sendError(res, upstream.status, 'Upstream returned ' + upstream.status);
        return;
      }

      const contentType = upstream.headers.get('content-type') || 'image/jpeg';
      const arrayBuffer = await upstream.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': buffer.length,
        'Cache-Control': 'public, max-age=604800, stale-while-revalidate=2592000',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(buffer);
      return;
    } catch (proxyErr) {
      sendError(res, 502, 'Proxy error: ' + proxyErr.message);
      return;
    }
  }`;

  content = content.slice(0, blockEnd) + proxyCode + content.slice(blockEnd);
  fs.writeFileSync('./tracker-app/server.js', content, 'utf-8');
  console.log('Successfully added cover-proxy to server.js');
} else {
  console.error('Could not find needle in server.js');
}
