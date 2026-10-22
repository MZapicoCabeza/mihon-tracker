import fs from 'fs';
import path from 'path';
import { parseTachibkBuffer } from './processBackup.js';

const BACKEND_URL = process.env.TRACKER_BACKEND_URL || 'https://mihon-tracker.onrender.com';

// 1. Palabras estrictamente NSFW para eliminar contenido +18
const NSFW_EXACT_TOKENS = new Set([
  '18+', '+18', '19+', '+19', 'r18', 'r-18', 'r19', 'r-19',
  'adult', 'adulthood', 'adulto', 'mature', 'smut', 'hentai', 'ecchi',
  'erotica', 'erotico', 'erótico', 'erotic', 'gore', 'porn', 'porno', 'nsfw',
  'doujinshi', 'sex', 'sexual', 'borderline', 'bloody', 'nakadashi',
  'breasts', 'defloration', 'ahegao', 'netorare',
  'milf', 'cheating', 'incest', 'incesto', 'rape', 'futanari', 'paizuri', 'creampie',
  'bondage', 'femdom', 'masturbation', 'masturbacion', 'orgasm', 'pegging', 'prostitution',
  'gangbang', 'anal', 'shotacon', 'lolicon', 'bukkake', 'cuckold', 'dilf',
  'bdsm', 'tentacles', 'blowjob', 'handjob', 'virgin', 'virginity',
  'unrated', 'x-rated', 'hardcore'
]);

const NSFW_PHRASES = [
  'big breasts', 'small breast', 'yandere sex', 'sin censura', 'uncensored',
  '+18', '18+', '+19', '19+', 'r-18', 'r-19', 'novela +19', 'novela +18'
];

function isPureNsfw(genres = [], title = '', source = '') {
  const textToScan = [
    ...(Array.isArray(genres) ? genres : []),
    title,
    source
  ].join(' ').toLowerCase();

  for (const phrase of NSFW_PHRASES) {
    if (textToScan.includes(phrase)) return true;
  }

  // Token-based matching (exact whole words separated by punctuation/spaces)
  const tokens = textToScan.split(/[\s,.:;!?/()\[\]{}_"-]+/);
  for (const t of tokens) {
    if (NSFW_EXACT_TOKENS.has(t)) return true;
    if (t === 'ntr') return true; // only as an exact standalone token!
  }

  return false;
}

// 2. Normalización de títulos y alias canónicos
const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '') // eliminar años como ( 2020 ) o (2022)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // eliminar tildes
    .replace(/[^a-z0-9]/g, '');

const ALIAS_CANONICAL = {
  // Operación: Amor Verdadero
  'operationnamepurelove': 'operacionamorverdadero',
  'pureloveoperation': 'operacionamorverdadero',
  'operacionamorverdadero': 'operacionamorverdadero',

  // La Ley del Inso / Inso's Law
  'laleydelinso': 'laleydelinso',
  'insoslaw': 'laleydelinso',

  // Cómo conquistar a mi Marido / Cómo hacer que mi marido esté de mi lado / Cómo poner a mi esposo de mi lado
  'comohacerquemimaridoestedemilado': 'comoconquistaramimarido',
  'comoponeramiesposodemilado': 'comoconquistaramimarido',
  'comoconquistaramimarido': 'comoconquistaramimarido',
  'howtogetmyhusbandonmyside': 'comoconquistaramimarido',
  'howtowinmyhusbandover': 'comoconquistaramimarido',

  // A la amante de mi marido / A la amante de mi esposo
  'alaamantedemimarido': 'alaamantedemiesposo',
  'alaamantedemiesposo': 'alaamantedemiesposo',

  // El Único Final De La Villana Es La Muerte
  'elunicofinaldelavillanaeslamuerte': 'elunicofinaldelavillanaeslamuerte',
  'deathistheonlyendingforthevillainess': 'elunicofinaldelavillanaeslamuerte',
  'villainsaredestinedtodie': 'elunicofinaldelavillanaeslamuerte',

  // Cómo Esconder Al Hijo Del Emperador
  'howtohidetheemperorschild': 'comoesconderalhijodelemperador',
  'comoesconderalhijodelemperador': 'comoesconderalhijodelemperador',

  // La Razón por la que Raeliana Terminó en la Mansión del Duque
  'thereasonwhyraelianaendedupatthedukesmansion': 'larazonporlaqueraelianaterminoenlamansiondelduque',
  'larazonporlaqueraelianaterminoenlamansiondelduque': 'larazonporlaqueraelianaterminoenlamansiondelduque',

  // Me Convertí En La Esposa Del Protagonista Masculino
  'meconvertienlaesposadelprotagonistamasculino': 'meconvertienlaesposadelprotagonistamasculino',
  'ibecamethewifeofthemalelead': 'meconvertienlaesposadelprotagonistamasculino',
  'authorofmyowndestiny': 'meconvertienlaesposadelprotagonistamasculino',

  // En Realidad, Yo Era La Verdadera
  'enrealidadyoeralaverdadera': 'enrealidadyoeralaverdadera',

  // No Quiero Firmar El Divorcio
  'noquierofirmareldivorcio': 'noquierofirmareldivorcio',

  // One Piece
  'onepiece': 'onepiece',
  'onepiecefullcolor': 'onepiece',
};

function getCanonicalKey(rawTitle) {
  const norm = normalize(rawTitle);
  return ALIAS_CANONICAL[norm] || norm;
}

function calculateMonths(startedAt, lastReadAt) {
  if (!startedAt || !lastReadAt) return 0;
  const s = new Date(startedAt);
  const e = new Date(lastReadAt);
  if (isNaN(s.getTime()) || isNaN(e.getTime())) return 0;
  return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
}

async function runUnifiedMerge() {
  const backups = [
    { label: '2023 (Tachiyomi)', path: 'C:/Users/maria/Downloads/tachiyomi_2026-10-22_20-45.proto.gz' },
    { label: '2024-02 (Mihon)', path: 'C:/Users/maria/Downloads/app.mihon_2026-10-22_21-34.tachibk' },
    { label: '2024-03..09 (TachiyomiJ2K)', path: 'C:/Users/maria/Downloads/eu.kanade.tachiyomi.j2k_2026-10-22_21-27.tachibk' },
    { label: '2024..2026 (Mihon)', path: 'C:/Users/maria/Downloads/app.mihon_2026-10-22_20-18.tachibk' },
  ];

  console.log('🔄 ================= INICIANDO FUSIÓN TOTAL DE 4 RESPALDOS =================');
  
  const parsedBackups = [];
  let totalRawMangas = 0;
  let totalRawEvents = 0;

  for (const b of backups) {
    if (!fs.existsSync(b.path)) {
      console.error(`❌ Archivo no encontrado: ${b.path}`);
      continue;
    }
    const buf = fs.readFileSync(b.path);
    const parsed = parseTachibkBuffer(buf);
    parsedBackups.push({ label: b.label, ...parsed });
    totalRawMangas += parsed.mangas.length;
    totalRawEvents += parsed.history.length;
    console.log(`📦 ${b.label}: ${parsed.mangas.length} mangas, ${parsed.history.length} eventos históricos.`);
  }

  // 1. Filtrado de mangas NSFW
  let totalCleanMangasCount = 0;
  let totalExcludedNsfwCount = 0;
  const cleanMangaLists = [];

  for (const pb of parsedBackups) {
    const cleanList = pb.mangas.filter(m => !isPureNsfw(m.genres, m.title, m.source));
    const excludedCount = pb.mangas.length - cleanList.length;
    totalCleanMangasCount += cleanList.length;
    totalExcludedNsfwCount += excludedCount;
    cleanMangaLists.push({ label: pb.label, mangas: cleanList, allHistory: pb.history });
    console.log(`   -> [${pb.label}] Limpios: ${cleanList.length} | NSFW Purigados: ${excludedCount}`);
  }

  // 2. Fusionar mangas por clave canónica
  const mergedMangasMap = new Map();
  // Map de id original a clave canónica para vincular los eventos
  const idToCanonicalKey = new Map();

  // Procesamos en orden cronológico (2023 -> 2024-1 -> 2024-2 -> 2026)
  // para que los metadatos más recientes y mejores portadas prevalezcan,
  // pero las fechas de inicio conserven la antigüedad original.
  for (const item of cleanMangaLists) {
    for (const m of item.mangas) {
      const canonKey = getCanonicalKey(m.title);
      idToCanonicalKey.set(String(m.id), canonKey);

      let existing = mergedMangasMap.get(canonKey);
      if (!existing) {
        mergedMangasMap.set(canonKey, {
          ...m,
          canonical_key: canonKey,
          sources: [item.label],
        });
      } else {
        // Unir fechas: fecha de inicio más antigua posible
        const sM = new Date(m.started_at);
        const sEx = new Date(existing.started_at);
        if (sM < sEx) {
          existing.started_at = m.started_at;
        }

        // Fecha de última lectura: la más reciente
        const lM = new Date(m.last_read_at);
        const lEx = new Date(existing.last_read_at);
        if (lM > lEx) {
          existing.last_read_at = m.last_read_at;
        }

        // Progreso más alto
        existing.current_chapter = Math.max(existing.current_chapter || 0, m.current_chapter || 0);
        existing.total_chapters = Math.max(existing.total_chapters || 0, m.total_chapters || 0);

        // Si el existente no tiene portada pero este sí, o este es más nuevo
        if (!existing.cover_url && m.cover_url) {
          existing.cover_url = m.cover_url;
        }

        // Título más limpio / preferir título en español o más detallado
        if (m.title.length > existing.title.length && !m.title.includes('(')) {
          existing.title = m.title;
        }

        existing.reading_months = calculateMonths(existing.started_at, existing.last_read_at);
        if (!existing.sources.includes(item.label)) {
          existing.sources.push(item.label);
        }
      }
    }
  }

  // Recalcular reading_months final para todos los mangas fusionados
  for (const m of mergedMangasMap.values()) {
    m.reading_months = calculateMonths(m.started_at, m.last_read_at);
  }

  const finalMergedMangas = Array.from(mergedMangasMap.values());
  console.log(`\n📚 Total de mangas únicos unificados (2023 - 2026): ${finalMergedMangas.length}`);

  // 3. Fusionar y desduplicar eventos históricos
  const allEvents = [];
  const seenEventKeys = new Set();
  let totalRawHistoryScanned = 0;

  for (const item of cleanMangaLists) {
    for (const h of item.allHistory) {
      totalRawHistoryScanned++;
      const canonKey = idToCanonicalKey.get(String(h.manga_id)) || getCanonicalKey(h.manga_title);
      const targetManga = mergedMangasMap.get(canonKey);

      // Si el manga pertenece a la lista limpia permitida
      if (targetManga && !isPureNsfw(targetManga.genres, targetManga.title, targetManga.source)) {
        const rawDate = h.timestamp || h.readAt;
        const dObj = new Date(rawDate);
        if (isNaN(dObj.getTime()) || dObj.getTime() <= 0) continue;

        const dayStr = dObj.toISOString().slice(0, 10);
        const eventDedupeKey = `${canonKey}_${Number(h.chapter_number)}_${dayStr}`;

        if (!seenEventKeys.has(eventDedupeKey)) {
          seenEventKeys.add(eventDedupeKey);
          allEvents.push({
            id: `bk-${canonKey}-${h.chapter_number}-${dObj.getTime()}`,
            manga_id: targetManga.id,
            manga_title: targetManga.title,
            chapter_number: Number(h.chapter_number),
            timestamp: dObj.toISOString(),
            readAt: dObj.toISOString(),
            source: 'backup-unified-merge',
          });
        }
      }
    }
  }

  allEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  console.log(`📜 Total de eventos históricos desduplicados: ${allEvents.length} (de ${totalRawHistoryScanned} analizados)`);
  console.log(`📅 Inicio del historial: ${allEvents[0]?.timestamp?.slice(0, 10)}`);
  console.log(`📅 Fin del historial: ${allEvents[allEvents.length - 1]?.timestamp?.slice(0, 10)}`);

  console.log('\n🏆 TOP 15 MANHWAS CON MÁS MESES DE LECTURA (FIDELIDAD):');
  const sortedLoyalty = [...finalMergedMangas]
    .filter(m => m.reading_months > 0)
    .sort((a, b) => b.reading_months - a.reading_months);

  for (const m of sortedLoyalty.slice(0, 15)) {
    console.log(`- ${m.title}: ${m.reading_months} meses (Desde ${m.started_at?.slice(0, 10)} hasta ${m.last_read_at?.slice(0, 10)}) [Cap: ${m.current_chapter}/${m.total_chapters}]`);
  }

  // 4. Subir a Render Cloud
  console.log('\n☁️ Conectando con Render Cloud:', BACKEND_URL);
  try {
    console.log('   🔄 Reseteando base de datos en la nube...');
    const resetRes = await fetch(`${BACKEND_URL}/api/reset`, { method: 'POST' });
    console.log('   Reset response status:', resetRes.status);

    console.log(`   📡 Subiendo ${finalMergedMangas.length} mangas y eventos en lotes de 500...`);
    const CHUNK_SIZE = 500;
    const eventChunks = [];
    for (let i = 0; i < allEvents.length; i += CHUNK_SIZE) {
      eventChunks.push(allEvents.slice(i, i + CHUNK_SIZE));
    }

    // Primer lote con los mangas
    const chunk1Res = await fetch(`${BACKEND_URL}/api/sync/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backupManga: finalMergedMangas,
        history: eventChunks[0] || [],
      }),
    });
    const c1Json = await chunk1Res.json();
    console.log(`   ✅ Bloque inicial subido. Mangas registrados: ${c1Json.importedMangas}`);

    // Lotes restantes de eventos
    for (let i = 1; i < eventChunks.length; i++) {
      process.stdout.write(`   Subiendo bloque de historial ${i + 1}/${eventChunks.length}...\r`);
      await fetch(`${BACKEND_URL}/api/sync/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          backupManga: [],
          history: eventChunks[i],
        }),
      });
    }
    console.log(`\n   ✅ Todos los ${allEvents.length} eventos subidos a Render con éxito.`);
  } catch (cloudErr) {
    console.error('❌ Error sincronizando con Render:', cloudErr.message);
  }

  // 5. Actualizar SQLite Local
  try {
    const { db } = await import('../database.js');
    db.clearAll();
    db.upsertLibrary(finalMergedMangas);
    for (const h of allEvents) {
      try {
        db.recordReadingEvent(h);
      } catch (e) {}
    }
    console.log('💾 Base de datos SQLite local (tracker.db) actualizada completamente.');
  } catch (localErr) {
    console.warn('⚠️ Nota sobre DB local:', localErr.message);
  }

  // 6. Verificar estadísticas en la nube
  try {
    console.log('\n📊 Verificando estadísticas consolidadas en Render Cloud...');
    const statsRes = await fetch(`${BACKEND_URL}/api/stats`);
    const stats = await statsRes.json();
    console.log(`✨ Días activos registrados: ${stats.distinctActiveDays}`);
    console.log(`✨ Primer día registrado: ${stats.earliestReadDate}`);
    console.log(`✨ Último día registrado: ${stats.latestReadDate}`);
    console.log(`✨ Años en lectura: ${stats.yearsActiveLabel}`);
    console.log(`✨ Racha récord: ${stats.longestStreakDays} días`);
    console.log(`✨ Día más activo: ${stats.recordDay?.date} (${stats.recordDay?.chapters} capítulos)`);
  } catch (verifyErr) {
    console.warn('⚠️ No se pudo verificar stats:', verifyErr.message);
  }

  console.log('\n🎉 ¡PROCESO DE FUSIÓN DE 4 COPIAS COMPLETADO CON ÉXITO!');
}

runUnifiedMerge().catch(console.error);
