import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseTachibkBuffer } from './processBackup.js';
import { TrackerDatabase } from '../database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SEED_DATA_FILE = path.join(__dirname, '..', 'seed-data.json');

const BACKUP_FILES = [
  'C:/Users/maria/Downloads/app.mihon_2026-10-26_00-30.tachibk',
  'C:/Users/maria/Downloads/app.mihon.sync_2026-10-26_00-32.tachibk',
];

async function main() {
  console.log('🔄 [BACKUP SYNC] Starting import of recent backups...');

  const combinedMangasMap = new Map();
  const allHistoryEvents = [];
  const eventKeys = new Set();

  for (const file of BACKUP_FILES) {
    if (!fs.existsSync(file)) {
      console.warn(`⚠️ File not found: ${file}`);
      continue;
    }
    console.log(`\n📂 Reading backup: ${path.basename(file)}...`);
    const buffer = fs.readFileSync(file);
    const parsed = parseTachibkBuffer(buffer);

    console.log(`   - Mangas extraídos: ${parsed.mangas.length}`);
    console.log(`   - Mangas +18 excluidos: ${parsed.filteredNsfw.length}`);
    console.log(`   - Eventos de historial: ${parsed.history.length}`);

    // Merge mangas
    for (const manga of parsed.mangas) {
      const key = manga.title.toLowerCase().trim();
      const existing = combinedMangasMap.get(key);
      if (!existing) {
        combinedMangasMap.set(key, manga);
      } else {
        // Take highest currentChapter and latest dates
        const maxCurrent = Math.max(existing.current_chapter || 0, manga.current_chapter || 0);
        const maxTotal = Math.max(existing.total_chapters || 0, manga.total_chapters || 0);
        const latestRead = (manga.last_read_at > existing.last_read_at) ? manga.last_read_at : existing.last_read_at;
        const earliestStarted = (manga.started_at && (!existing.started_at || manga.started_at < existing.started_at))
          ? manga.started_at
          : existing.started_at;

        combinedMangasMap.set(key, {
          ...existing,
          ...manga,
          current_chapter: maxCurrent,
          total_chapters: maxTotal,
          last_read_at: latestRead,
          started_at: earliestStarted,
        });
      }
    }

    // Merge events
    for (const ev of parsed.history) {
      const dateStr = ev.timestamp ? ev.timestamp.slice(0, 16) : '';
      const key = `${ev.manga_title.toLowerCase().trim()}::${Number(ev.chapter_number).toFixed(1)}::${dateStr}`;
      if (!eventKeys.has(key)) {
        eventKeys.add(key);
        allHistoryEvents.push(ev);
      }
    }
  }

  console.log(`\n📊 [RESUMEN TOTAL COMBINADO]`);
  console.log(`   - Total mangas únicos: ${combinedMangasMap.size}`);
  console.log(`   - Total eventos únicos: ${allHistoryEvents.length}`);

  // Sort events by timestamp
  allHistoryEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Connect to database
  const db = new TrackerDatabase();
  await db.init();

  // 1. Fetch current database state
  const existingMangas = await db.queryAll('SELECT id, title, current_chapter, total_chapters, status, last_read_at FROM mangas');
  const dbMangasByTitle = new Map();
  for (const m of existingMangas) {
    dbMangasByTitle.set(m.title.toLowerCase().trim(), m);
  }

  const existingEvents = await db.queryAll('SELECT manga_title, chapter_number, timestamp, event_hash FROM reading_events');
  const dbEventKeys = new Set();
  for (const e of existingEvents) {
    const dateStr = e.timestamp ? e.timestamp.slice(0, 16) : '';
    dbEventKeys.add(`${e.manga_title.toLowerCase().trim()}::${Number(e.chapter_number).toFixed(1)}::${dateStr}`);
    if (e.event_hash) dbEventKeys.add(e.event_hash);
  }

  // 2. Identify new reading events
  const newEvents = [];
  for (const ev of allHistoryEvents) {
    const dateStr = ev.timestamp ? ev.timestamp.slice(0, 16) : '';
    const key = `${ev.manga_title.toLowerCase().trim()}::${Number(ev.chapter_number).toFixed(1)}::${dateStr}`;
    if (!dbEventKeys.has(key)) {
      newEvents.push(ev);
    }
  }

  console.log(`\n⚡ [EVENTOS NUEVOS NO SUBIDOS]: ${newEvents.length} eventos encontrados para insertar.`);

  if (newEvents.length > 0) {
    console.log(`   Muestra de eventos recientes a subir:`);
    newEvents.slice(-15).forEach((e) => {
      console.log(`   - ${e.timestamp} | ${e.manga_title} - Cap. ${e.chapter_number}`);
    });
  }

  // 3. Insert new events into database
  let insertedEvents = 0;
  const eventInsertStatements = [];
  for (const ev of newEvents) {
    const mangaTitle = ev.manga_title.trim();
    const existingManga = dbMangasByTitle.get(mangaTitle.toLowerCase());
    const mangaId = existingManga ? existingManga.id.toString() : (ev.manga_id || `manga_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`);
    const chapterNum = Number(ev.chapter_number || 0);
    const timestamp = ev.timestamp || new Date().toISOString();
    const eventHash = db.generateEventHash(mangaId, chapterNum, timestamp);
    const id = `evt_sync_${mangaId}_${chapterNum}_${new Date(timestamp).getTime()}`;

    eventInsertStatements.push({
      sql: `
        INSERT OR IGNORE INTO reading_events (
          id, manga_id, manga_title, chapter_number, chapter_id,
          cover_url, genres, timestamp, received_at, source, event_hash
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        mangaId,
        mangaTitle,
        chapterNum,
        '',
        existingManga?.cover_url || '',
        '[]',
        timestamp,
        new Date().toISOString(),
        'tachibk-sync',
        eventHash,
      ],
    });
    insertedEvents++;
  }

  if (eventInsertStatements.length > 0) {
    await db.queryBatch(eventInsertStatements);
    console.log(`✅ [DB EVENTS] Se insertaron ${eventInsertStatements.length} eventos en reading_events.`);
  }

  // 4. Update manga progress
  let updatedMangasCount = 0;
  const mangaStatements = [];
  for (const [titleLower, backupManga] of combinedMangasMap.entries()) {
    const existing = dbMangasByTitle.get(titleLower);
    if (existing) {
      const backupCurrent = Number(backupManga.current_chapter || 0);
      const dbCurrent = Number(existing.current_chapter || 0);
      const backupTotal = Number(backupManga.total_chapters || 0);
      const dbTotal = Number(existing.total_chapters || 0);

      const newCurrent = Math.max(dbCurrent, backupCurrent);
      const newTotal = Math.max(dbTotal, backupTotal);
      const newLastRead = (backupManga.last_read_at && backupManga.last_read_at > (existing.last_read_at || ''))
        ? backupManga.last_read_at
        : existing.last_read_at;

      if (newCurrent !== dbCurrent || newTotal !== dbTotal || newLastRead !== existing.last_read_at) {
        mangaStatements.push({
          sql: `
            UPDATE mangas SET
              current_chapter = ?,
              total_chapters = ?,
              last_read_at = ?,
              updated_at = ?
            WHERE id = ?
          `,
          args: [newCurrent, newTotal, newLastRead || '', new Date().toISOString(), existing.id.toString()],
        });
        updatedMangasCount++;
      }
    } else {
      // New manga from backup
      const id = backupManga.id || `manga_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      mangaStatements.push({
        sql: `
          INSERT OR IGNORE INTO mangas (
            id, title, cover_url, current_chapter, total_chapters,
            status, is_favorite, genres, author, artist, source, rating,
            started_at, last_read_at, reading_months, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          id.toString(),
          backupManga.title,
          backupManga.cover_url || '',
          Number(backupManga.current_chapter || 0),
          Number(backupManga.total_chapters || 0),
          backupManga.status || 'reading',
          backupManga.is_favorite ? 1 : 0,
          JSON.stringify(backupManga.genres || []),
          backupManga.author || '',
          backupManga.artist || '',
          backupManga.source || '',
          0,
          backupManga.started_at || '',
          backupManga.last_read_at || '',
          Number(backupManga.reading_months || 0),
          new Date().toISOString(),
          new Date().toISOString(),
        ],
      });
      updatedMangasCount++;
    }
  }

  if (mangaStatements.length > 0) {
    await db.queryBatch(mangaStatements);
    console.log(`✅ [DB MANGAS] Se actualizaron/insertaron ${mangaStatements.length} mangas en la base de datos.`);
  }

  // 5. Recalculate reading intervals for intervals < 600s
  console.log(`⏱️ [DB INTERVALS] Actualizando intervalos de lectura (< 10 min)...`);
  const allDbEvents = await db.queryAll('SELECT id, manga_id, manga_title, chapter_number, timestamp FROM reading_events ORDER BY timestamp ASC');
  const intervalStatements = [];
  for (let i = 1; i < allDbEvents.length; i++) {
    const prev = allDbEvents[i - 1];
    const curr = allDbEvents[i];
    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();
    if (isNaN(prevTime) || isNaN(currTime)) continue;

    const diffSec = Math.round((currTime - prevTime) / 1000);
    // Strictly under 10 minutes (600s) and at least 30s
    if (diffSec >= 30 && diffSec < 600) {
      intervalStatements.push({
        sql: `
          INSERT OR IGNORE INTO reading_intervals (
            id, manga_id, manga_title, chapter_number, duration_seconds, started_at, ended_at, source
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
        args: [
          `inv_${curr.id}`,
          curr.manga_id.toString(),
          curr.manga_title,
          Number(curr.chapter_number || 0),
          diffSec,
          prev.timestamp,
          curr.timestamp,
          'tachibk-sync',
        ],
      });
    }
  }

  if (intervalStatements.length > 0) {
    await db.queryBatch(intervalStatements);
    await db.queryRun('DELETE FROM reading_intervals WHERE duration_seconds >= 600');
    console.log(`✅ [DB INTERVALS] Guardados ${intervalStatements.length} intervalos de lectura.`);
  }

  // 6. Update seed-data.json so Render has the updated baseline on deployment
  console.log(`💾 [SEED DATA] Actualizando ${SEED_DATA_FILE}...`);
  const finalMangas = await db.getAllMangas();
  const finalEvents = await db.queryAll('SELECT * FROM reading_events ORDER BY timestamp ASC');

  const seedPayload = {
    mangas: finalMangas,
    events: finalEvents.map((e) => ({
      id: e.id,
      manga_id: e.manga_id,
      manga_title: e.manga_title,
      chapter_number: e.chapter_number,
      chapter_id: e.chapter_id,
      cover_url: e.cover_url,
      genres: typeof e.genres === 'string' ? JSON.parse(e.genres || '[]') : e.genres,
      timestamp: e.timestamp,
      received_at: e.received_at,
      source: e.source,
      event_hash: e.event_hash,
    })),
    updatedAt: new Date().toISOString(),
    version: '2.0.0',
  };

  fs.writeFileSync(SEED_DATA_FILE, JSON.stringify(seedPayload, null, 2));
  console.log(`✅ [SEED DATA] ${SEED_DATA_FILE} actualizado con ${finalMangas.length} mangas y ${finalEvents.length} eventos.`);

  const pace = await db.getReadingPace();
  console.log(`\n🎉 [LISTO] Ritmo medio actualizado (< 10 min): ${pace.formattedPace}/capítulo (${pace.totalSamples} muestras).`);
}

main().catch((err) => {
  console.error('❌ Error during backup sync:', err);
  process.exit(1);
});
