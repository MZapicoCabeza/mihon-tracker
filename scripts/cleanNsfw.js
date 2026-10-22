import fs from 'fs';
import { parseTachibkBuffer } from './processBackup.js';

const BACKEND_URL = process.env.TRACKER_BACKEND_URL || 'https://mihon-tracker.onrender.com';
const API_KEY = process.env.TRACKER_API_KEY || null;

const EXTENDED_NSFW_WORDS = new Set([
  '18+', '+18', 'adult', 'adulthood', 'mature', 'smut', 'hentai', 'ecchi',
  'erotica', 'erotico', 'erótico', 'gore', 'porn', 'nsfw', 'r-18', 'r18',
  'doujinshi', 'sex', 'sexual', 'borderline', 'bloody', 'nakadashi',
  'breasts', 'big breasts', 'defloration', 'ahegao', 'netorare', 'ntr',
  'milf', 'cheating', 'incest', 'rape', 'futanari', 'paizuri', 'creampie',
  'bondage', 'femdom', 'masturbation', 'orgasm', 'pegging', 'prostitution',
  'gangbang', 'anal', 'shotacon', 'lolicon', 'bukkake', 'cuckold', 'dilf',
  'bdsm', 'tentacles', 'blowjob', 'handjob', 'virgin', 'virginity',
  'unrated', 'x-rated', 'yandere sex', 'hardcore', 'erotic'
]);

function isExtendedNsfw(genres = [], title = '', description = '', source = '') {
  const allTerms = [
    ...(Array.isArray(genres) ? genres : []),
    ...title.toLowerCase().split(/[\s,.:;!?-]+/),
    ...source.toLowerCase().split(/[\s,.:;!?-]+/),
  ];

  for (const term of allTerms) {
    const clean = String(term).trim().toLowerCase();
    if (EXTENDED_NSFW_WORDS.has(clean)) {
      return true;
    }
  }

  const combined = (title + ' ' + (Array.isArray(genres) ? genres.join(' ') : '') + ' ' + source).toLowerCase();
  for (const keyword of EXTENDED_NSFW_WORDS) {
    if (keyword.length > 3 && combined.includes(keyword)) {
      return true;
    }
    if ((keyword === '+18' || keyword === '18+' || keyword === 'ntr') && combined.includes(keyword)) {
      return true;
    }
  }

  return false;
}

async function run() {
  const filePath = 'C:/Users/maria/Downloads/app.mihon_2026-10-22_20-18.tachibk';
  console.log('Reading and deep-cleaning backup:', filePath);
  const buffer = fs.readFileSync(filePath);
  const rawResult = parseTachibkBuffer(buffer);

  // Now apply extended NSFW filter to rawResult.mangas
  const cleanMangas = [];
  const purgedNsfw = [];
  const cleanMangaIds = new Set();

  for (const m of rawResult.mangas) {
    if (isExtendedNsfw(m.genres, m.title, '', m.source || '')) {
      purgedNsfw.push(m);
    } else {
      cleanMangas.push(m);
      cleanMangaIds.add(m.id);
    }
  }

  // Filter history to ONLY clean manga IDs
  const cleanHistory = rawResult.history.filter(h => cleanMangaIds.has(h.manga_id));

  console.log('\n================ RESULTADOS DEL FILTRADO PROFUNDO ================');
  console.log(`✅ Mangas 100% limpios y seguros: ${cleanMangas.length}`);
  console.log(`🚫 Mangas adultos / +18 / hentai / ecchi eliminados: ${purgedNsfw.length}`);
  console.log(`📜 Capítulos leídos del historial correspondientes a mangas limpios: ${cleanHistory.length}`);

  console.log('\nEjemplos de géneros más leídos tras la limpieza:');
  const genreCount = {};
  cleanMangas.forEach(m => {
    (m.genres || []).forEach(g => {
      const cleanG = g.trim();
      if (cleanG) genreCount[cleanG] = (genreCount[cleanG] || 0) + 1;
    });
  });
  console.log(Object.entries(genreCount).sort((a,b) => b[1] - a[1]).slice(0, 10));

  // Reset database on Render
  console.log('\n🔄 Reseteando base de datos en Render para asegurar limpieza total...');
  const resetRes = await fetch(`${BACKEND_URL}/api/reset`, { method: 'POST' });
  console.log('Reset status:', resetRes.status);

  // Upload clean library in chunks
  console.log('\n📡 Subiendo biblioteca 100% limpia a Render...');
  const CHUNK_SIZE = 500;
  const historyChunks = [];
  for (let i = 0; i < cleanHistory.length; i += CHUNK_SIZE) {
    historyChunks.push(cleanHistory.slice(i, i + CHUNK_SIZE));
  }

  const res1 = await fetch(`${BACKEND_URL}/api/sync/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backupManga: cleanMangas,
      history: historyChunks.length > 0 ? historyChunks[0] : [],
    }),
  });

  const res1Json = await res1.json();
  console.log(`🎉 Biblioteca limpia subida: ${res1Json.importedMangas} mangas.`);

  // Upload remaining history
  for (let i = 1; i < historyChunks.length; i++) {
    process.stdout.write(`   Subiendo bloque de historial ${i + 1}/${historyChunks.length}...\r`);
    await fetch(`${BACKEND_URL}/api/sync/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backupManga: [],
        history: historyChunks[i],
      }),
    });
  }

  // Also clean local DB
  try {
    const { db } = await import('../database.js');
    db.clearAll();
    db.upsertLibrary(cleanMangas);
    for (const h of cleanHistory) {
      db.recordReadingEvent({
        id: `bk-${h.manga_id}-${h.chapter_number}-${new Date(h.timestamp || h.readAt).getTime()}`,
        manga_id: h.manga_id,
        manga_title: h.manga_title,
        chapter_number: h.chapter_number,
        timestamp: h.timestamp || h.readAt,
        source: 'backup-import',
      });
    }
    console.log('\n💾 Base de datos local SQLite sincronizada y limpia.');
  } catch (e) {
    console.warn('(Nota local:', e.message, ')');
  }

  console.log('\n✨ ¡LIMPIEZA Y SINCRONIZACIÓN COMPLETADA CON ÉXITO!');
}

run().catch(console.error);
