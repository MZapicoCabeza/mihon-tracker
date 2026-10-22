import fs from 'fs';
import { parseTachibkBuffer } from './processBackup.js';

const BACKEND_URL = process.env.TRACKER_BACKEND_URL || 'https://mihon-tracker.onrender.com';

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
    if (EXTENDED_NSFW_WORDS.has(clean)) return true;
  }

  const combined = (title + ' ' + (Array.isArray(genres) ? genres.join(' ') : '') + ' ' + source).toLowerCase();
  for (const keyword of EXTENDED_NSFW_WORDS) {
    if (keyword.length > 3 && combined.includes(keyword)) return true;
    if ((keyword === '+18' || keyword === '18+' || keyword === 'ntr') && combined.includes(keyword)) return true;
  }
  return false;
}

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

function calculateMonths(startedAt, lastReadAt) {
  if (!startedAt || !lastReadAt) return 0;
  const s = new Date(startedAt);
  const e = new Date(lastReadAt);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

async function runMerge() {
  const path2026 = 'C:/Users/maria/Downloads/app.mihon_2026-10-22_20-18.tachibk';
  const path2023 = 'C:/Users/maria/Downloads/tachiyomi_2026-10-22_20-45.proto.gz';

  console.log('📖 Decodificando copias de 2026 y 2023...');
  const res2026 = parseTachibkBuffer(fs.readFileSync(path2026));
  const res2023 = parseTachibkBuffer(fs.readFileSync(path2023));

  // 1. Filtrar +18 en ambos
  const clean2026Mangas = res2026.mangas.filter(m => !isExtendedNsfw(m.genres, m.title, '', m.source));
  const clean2023Mangas = res2023.mangas.filter(m => !isExtendedNsfw(m.genres, m.title, '', m.source));

  console.log(`Mangas limpios 2026: ${clean2026Mangas.length} (NSFW eliminados: ${res2026.mangas.length - clean2026Mangas.length})`);
  console.log(`Mangas limpios 2023: ${clean2023Mangas.length} (NSFW eliminados: ${res2023.mangas.length - clean2023Mangas.length})`);

  // 2. Mapear y fusionar
  const mergedMangasMap = new Map();

  // Indexar los de 2026
  for (const m of clean2026Mangas) {
    mergedMangasMap.set(normalize(m.title), { ...m });
  }

  // Fusionar con los de 2023
  for (const m23 of clean2023Mangas) {
    const norm = normalize(m23.title);
    let existing = mergedMangasMap.get(norm);

    // Búsqueda inteligente por variaciones de nombre
    if (!existing) {
      if (norm.includes('purelove') || norm.includes('operationname')) {
        for (const [k, v] of mergedMangasMap.entries()) {
          if (k.includes('amorverdadero')) { existing = v; break; }
        }
      } else if (norm.includes('onepiece')) {
        for (const [k, v] of mergedMangasMap.entries()) {
          if (k.includes('onepiece')) { existing = v; break; }
        }
      }
    }

    if (existing) {
      // Unir fechas: la más antigua como inicio, la más reciente como fin
      const s23 = new Date(m23.started_at);
      const sEx = new Date(existing.started_at);
      if (s23 < sEx) {
        existing.started_at = m23.started_at;
      }

      const l23 = new Date(m23.last_read_at);
      const lEx = new Date(existing.last_read_at);
      if (l23 > lEx) {
        existing.last_read_at = m23.last_read_at;
      }

      existing.current_chapter = Math.max(existing.current_chapter || 0, m23.current_chapter || 0);
      existing.total_chapters = Math.max(existing.total_chapters || 0, m23.total_chapters || 0);
      existing.reading_months = calculateMonths(existing.started_at, existing.last_read_at);
    } else {
      // Manga nuevo que estaba en 2023
      const mClone = { ...m23 };
      mClone.reading_months = calculateMonths(mClone.started_at, mClone.last_read_at);
      mergedMangasMap.set(norm, mClone);
    }
  }

  const finalMergedMangas = Array.from(mergedMangasMap.values());
  const finalMangaIds = new Set(finalMergedMangas.map(m => m.id));

  // 3. Fusionar eventos de lectura
  const clean2026History = res2026.history.filter(h => finalMangaIds.has(h.manga_id));
  const clean2023History = res2023.history.filter(h => finalMangaIds.has(h.manga_id) || !isExtendedNsfw([], h.manga_title));

  const allMergedEvents = [];
  const seenEventKeys = new Set();

  for (const h of [...clean2023History, ...clean2026History]) {
    const key = `${normalize(h.manga_title)}_${h.chapter_number}_${new Date(h.timestamp || h.readAt).toISOString().slice(0, 10)}`;
    if (!seenEventKeys.has(key)) {
      seenEventKeys.add(key);
      allMergedEvents.push(h);
    }
  }

  allMergedEvents.sort((a, b) => new Date(a.timestamp || a.readAt) - new Date(b.timestamp || b.readAt));

  console.log('\n================ RESULTADOS DE LA FUSIÓN HISTÓRICA COMPLETA ================');
  console.log(`📚 Total de mangas fusionados (2023 - 2026): ${finalMergedMangas.length}`);
  console.log(`📜 Total de eventos de lectura combinados: ${allMergedEvents.length}`);
  console.log(`📅 Fecha más antigua de lectura: ${allMergedEvents[0]?.timestamp?.slice(0, 10)}`);
  console.log(`📅 Fecha más reciente de lectura: ${allMergedEvents[allMergedEvents.length - 1]?.timestamp?.slice(0, 10)}`);

  console.log('\n🏆 TOP 15 MANHWAS CON MÁS TIEMPO LEYENDO TRAS LA FUSIÓN:');
  const sortedByLoyalty = [...finalMergedMangas]
    .filter(m => m.reading_months > 0)
    .sort((a, b) => b.reading_months - a.reading_months);

  for (const m of sortedByLoyalty.slice(0, 15)) {
    console.log(`- ${m.title}: ${m.reading_months} meses (Desde: ${m.started_at?.slice(0, 10)} hasta ${m.last_read_at?.slice(0, 10)}) [Cap. ${m.current_chapter}/${m.total_chapters}]`);
  }

  // 4. Reset y Subida a Render
  console.log('\n🔄 Reseteando base de datos en Render para asegurar datos limpios y unificados...');
  await fetch(`${BACKEND_URL}/api/reset`, { method: 'POST' });

  console.log('📡 Subiendo biblioteca fusionada...');
  const CHUNK_SIZE = 500;
  const historyChunks = [];
  for (let i = 0; i < allMergedEvents.length; i += CHUNK_SIZE) {
    historyChunks.push(allMergedEvents.slice(i, i + CHUNK_SIZE));
  }

  const res1 = await fetch(`${BACKEND_URL}/api/sync/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backupManga: finalMergedMangas,
      history: historyChunks.length > 0 ? historyChunks[0] : [],
    }),
  });
  const res1Json = await res1.json();
  console.log(`🎉 Biblioteca fusionada subida: ${res1Json.importedMangas} mangas.`);

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

  // 5. Actualizar SQLite Local
  try {
    const { db } = await import('../database.js');
    db.clearAll();
    db.upsertLibrary(finalMergedMangas);
    for (const h of allMergedEvents) {
      try {
        db.recordReadingEvent({
          id: `bk-${h.manga_id}-${h.chapter_number}-${new Date(h.timestamp || h.readAt).getTime()}`,
          manga_id: h.manga_id,
          manga_title: h.manga_title,
          chapter_number: h.chapter_number,
          timestamp: h.timestamp || h.readAt,
          source: 'backup-merge',
        });
      } catch (err) {}
    }
    console.log('\n💾 Base de datos local SQLite sincronizada y unificada.');
  } catch (e) {
    console.warn('(Nota local:', e.message, ')');
  }

  console.log('\n✨ ¡FUSIÓN COMPLETA Y PERSISTENTE REALIZADA CON ÉXITO!');
}

runMerge().catch(console.error);
