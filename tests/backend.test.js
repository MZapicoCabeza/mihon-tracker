import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'http';
import { TrackerDatabase } from '../database.js';
import { server } from '../server.js';

// Helper to make HTTP requests against the test server
function request(app, options, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, res => {
      let data = '';
      res.on('data', chunk => (data += chunk.toString()));
      res.on('end', () => {
        try {
          const json = data ? JSON.parse(data) : null;
          resolve({ status: res.statusCode, headers: res.headers, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: data });
        }
      });
    });
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

test('Mihon Reading Tracker Backend Test Suite', async (t) => {
  let testServer;
  let port;

  t.before(() => {
    return new Promise(resolve => {
      testServer = server.listen(0, () => {
        port = testServer.address().port;
        resolve();
      });
    });
  });

  t.after(() => {
    return new Promise(resolve => testServer.close(resolve));
  });

  t.beforeEach(async () => {
    // Reset database state before each test
    await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/reset',
      method: 'POST',
    });
  });

  await t.test('Caso G: Biblioteca y estadísticas vacías por defecto (Sin datos inventados)', async () => {
    const libRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/library',
      method: 'GET',
    });
    assert.equal(libRes.status, 200);
    assert.deepEqual(libRes.body.mangas, []);
    assert.equal(libRes.body.total, 0);

    const statsRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/stats',
      method: 'GET',
    });
    assert.equal(statsRes.status, 200);
    assert.equal(statsRes.body.stats.totalChaptersRead, 0);
    assert.equal(statsRes.body.stats.totalMangaInLibrary, 0);
    assert.equal(statsRes.body.stats.currentStreakDays, 0);
    assert.deepEqual(statsRes.body.stats.genreDistribution, []);
  });

  await t.test('Caso A: Importación inicial de biblioteca desde Mihon (POST /api/sync/library)', async () => {
    const payload = {
      mangas: [
        {
          id: '1001',
          title: 'Sousou no Frieren',
          cover_url: 'https://example.com/frieren.jpg',
          current_chapter: 120,
          total_chapters: 130,
          status: 'reading',
          is_favorite: true,
          genres: ['Fantasía', 'Aventura', 'Drama'],
          author: 'Kanehito Yamada',
        },
        {
          id: '1002',
          title: 'Chainsaw Man',
          cover_url: 'https://example.com/csm.jpg',
          current_chapter: 170,
          total_chapters: 170,
          status: 'completed',
          is_favorite: false,
          genres: ['Acción', 'Sobrenatural'],
          author: 'Tatsuki Fujimoto',
        },
      ],
    };

    const syncRes = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/sync/library',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      payload
    );

    assert.equal(syncRes.status, 200);
    assert.equal(syncRes.body.status, 'ok');
    assert.equal(syncRes.body.count, 2);
    assert.equal(syncRes.body.inserted, 2);

    // Verify GET /api/library reflects imported mangas
    const libRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/library',
      method: 'GET',
    });
    assert.equal(libRes.body.total, 2);
    const frieren = libRes.body.mangas.find(m => m.id === '1001');
    assert.ok(frieren);
    assert.equal(frieren.title, 'Sousou no Frieren');
    assert.equal(frieren.currentChapter, 120);
    assert.equal(frieren.isFavorite, true);
  });

  await t.test('Caso B: Nuevo capítulo leído recibido por webhook (POST /api/track)', async () => {
    const trackPayload = {
      manga_id: '1001',
      manga_title: 'Sousou no Frieren',
      chapter_number: 121,
      cover_url: 'https://example.com/frieren.jpg',
      genres: ['Fantasía', 'Aventura'],
      timestamp: new Date().toISOString(),
    };

    const trackRes = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/track',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      trackPayload
    );

    assert.equal(trackRes.status, 201);
    assert.equal(trackRes.body.tracked, true);
    assert.equal(trackRes.body.deduplicated, false);
    assert.equal(trackRes.body.event.chapter_number, 121);

    // Verify GET /api/events has this event
    const eventsRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/events',
      method: 'GET',
    });
    assert.equal(eventsRes.body.total, 1);
    assert.equal(eventsRes.body.events[0].manga_id, '1001');
    assert.equal(eventsRes.body.events[0].chapter_number, 121);

    // Verify manga progress updated automatically
    const libRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/library',
      method: 'GET',
    });
    const manga = libRes.body.mangas.find(m => m.id === '1001');
    assert.equal(manga.currentChapter, 121);

    // Verify stats updated
    const statsRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/stats',
      method: 'GET',
    });
    assert.equal(statsRes.body.stats.totalChaptersRead, 1);
    assert.equal(statsRes.body.stats.currentStreakDays, 1);
  });

  await t.test('Caso C: Varios eventos seguidos en ráfaga', async () => {
    for (let cap = 1; cap <= 5; cap++) {
      const res = await request(
        testServer,
        {
          hostname: 'localhost',
          port,
          path: '/api/track',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        {
          manga_id: '2001',
          manga_title: 'Dandadan',
          chapter_number: cap,
          timestamp: new Date().toISOString(),
        }
      );
      assert.equal(res.status, 201);
    }

    const eventsRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/events',
      method: 'GET',
    });
    assert.equal(eventsRes.body.total, 5);

    const libRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/library',
      method: 'GET',
    });
    const manga = libRes.body.mangas.find(m => m.id === '2001');
    assert.equal(manga.currentChapter, 5);
  });

  await t.test('Caso D: Detección de duplicados e idempotencia', async () => {
    const fixedTimestamp = '2026-10-21T20:00:00.000Z';
    const payload = {
      manga_id: '3001',
      manga_title: 'Spy x Family',
      chapter_number: 95,
      timestamp: fixedTimestamp,
    };

    // First send
    const res1 = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/track',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      payload
    );
    assert.equal(res1.status, 201);
    assert.equal(res1.body.deduplicated, false);

    // Second send (Identical event replay)
    const res2 = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/track',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      payload
    );
    assert.equal(res2.status, 200);
    assert.equal(res2.body.deduplicated, true);

    // Ensure events table only has 1 event (not duplicated)
    const eventsRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/events',
      method: 'GET',
    });
    assert.equal(eventsRes.body.total, 1);
  });

  await t.test('Caso H: Validación y rechazo de datos inválidos', async () => {
    // Missing manga_id
    const badRes1 = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/track',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { manga_title: 'No ID', chapter_number: 1 }
    );
    assert.equal(badRes1.status, 400);

    // Missing chapter_number
    const badRes2 = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/track',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { manga_id: '123', manga_title: 'No Chapter' }
    );
    assert.equal(badRes2.status, 400);

    // Malformed JSON
    const badRes3 = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/track',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      'not-json{'
    );
    assert.equal(badRes3.status, 400);
  });

  await t.test('Caso F: Importación de respaldo de Mihon (POST /api/sync/backup)', async () => {
    const backupPayload = {
      backupManga: [
        {
          manga: {
            id: '5001',
            title: 'Monster',
            author: 'Naoki Urasawa',
            genre: ['Misterio', 'Psicológico', 'Drama'],
            favorite: true,
            status: 2, // completed
          },
          chapters: [
            { chapterNumber: 1, read: true },
            { chapterNumber: 2, read: true },
            { chapterNumber: 162, read: true },
          ],
        },
      ],
      history: [
        {
          manga_id: '5001',
          manga_title: 'Monster',
          chapter_number: 162,
          readAt: new Date().toISOString(),
        },
      ],
    };

    const res = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/sync/backup',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      backupPayload
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.importedMangas, 1);
    assert.equal(res.body.importedEvents, 1);

    const libRes = await request(testServer, {
      hostname: 'localhost',
      port,
      path: '/api/library',
      method: 'GET',
    });
    const monster = libRes.body.mangas.find(m => m.id === '5001');
    assert.ok(monster);
    assert.equal(monster.title, 'Monster');
    assert.equal(monster.currentChapter, 162);
    assert.equal(monster.status, 'completed');
  });

  await t.test('Caso Status & Favorite Updates (PUT /api/library/:id/favorite y status)', async () => {
    // Setup manga
    await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/sync/library',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      { mangas: [{ id: '9001', title: 'Vinland Saga', total_chapters: 200 }] }
    );

    // Toggle favorite
    const favRes = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/library/9001/favorite',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      },
      { isFavorite: true }
    );
    assert.equal(favRes.status, 200);
    assert.equal(favRes.body.manga.isFavorite, true);

    // Update status to paused
    const statusRes = await request(
      testServer,
      {
        hostname: 'localhost',
        port,
        path: '/api/library/9001/status',
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      },
      { status: 'paused' }
    );
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.manga.status, 'paused');
  });
});
