import fs from 'fs';
import path from 'path';

const BACKEND_URL = process.env.TRACKER_BACKEND_URL || 'https://mihon-tracker.onrender.com';

// 1. Read existing seed-data.json
const seedData = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
console.log(`Starting with ${seedData.mangas.length} mangas and ${seedData.events.length} events.`);

// 2. Load Ikigai catalogs
let ikigaiCatalog = new Map();
if (fs.existsSync('./tracker-app/scripts/ikigaiFullCatalog.json')) {
  const raw = JSON.parse(fs.readFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', 'utf-8'));
  ikigaiCatalog = new Map(raw);
  console.log(`Loaded ${ikigaiCatalog.size} series from Ikigai Full Catalog.`);
}

// Also load local Ikigai data
const localIkigaiJsonPath = 'c:/Users/maria/Documents/Textual_C1/Web Scrapping/Estudiar/Ikigai/data/tramites_pdi2.json';
if (fs.existsSync(localIkigaiJsonPath)) {
  try {
    const raw = fs.readFileSync(localIkigaiJsonPath, 'utf-8').replace(/:\s*NaN/g, ': null');
    const localItems = JSON.parse(raw);
    for (const item of localItems) {
      if (item.titulo) {
        const key = item.titulo.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!ikigaiCatalog.has(key)) {
          ikigaiCatalog.set(key, {
            title: item.titulo,
            cover: '',
            link: item.link,
            description: item.info?.descripcion || '',
            estado: item.estado,
          });
        }
      }
    }
  } catch (e) {
    console.warn('Notice parsing local Ikigai json:', e.message);
  }
}

// 3. Known canonical aliases for merging duplicates
const ALIAS_CANONICAL = {
  // LA LEY DEL INSO / MY LIFE AS AN INTERNET NOVEL / INSO'S LAW
  'laleydelinso': 'laleydelinso',
  'insoslaw': 'laleydelinso',
  'mylifeasaninternetnovel': 'laleydelinso',
  'laleydelinso2019': 'laleydelinso',

  // OPERACIÓN AMOR VERDADERO
  'operationnamepurelove': 'operacionamorverdadero',
  'operationnamepurelove2022': 'operacionamorverdadero',
  'pureloveoperation': 'operacionamorverdadero',
  'operacionamorverdadero': 'operacionamorverdadero',
  'operacionamorverdadero2022': 'operacionamorverdadero',

  // CÓMO CONQUISTAR A MI MARIDO / CÓMO PONER A MI ESPOSO DE MI LADO
  'comohacerquemimaridoestedemilado': 'comoconquistaramimarido',
  'comoponeramiesposodemilado': 'comoconquistaramimarido',
  'comoconquistaramimarido': 'comoconquistaramimarido',
  'howtogetmyhusbandonmyside': 'comoconquistaramimarido',
  'howtowinmyhusbandover': 'comoconquistaramimarido',

  // A LA AMANTE DE MI MARIDO / ESPOSO
  'alaamantedemimarido': 'alaamantedemiesposo',
  'alaamantedemiesposo': 'alaamantedemiesposo',

  // EL ÚNICO FINAL DE LA VILLANA ES LA MUERTE
  'elunicofinaldelavillanaeslamuerte': 'elunicofinaldelavillanaeslamuerte',
  'elunicofinaldelavillanaeslamuerte2020': 'elunicofinaldelavillanaeslamuerte',
  'deathistheonlyendingforthevillainess': 'elunicofinaldelavillanaeslamuerte',
  'villainsaredestinedtodie': 'elunicofinaldelavillanaeslamuerte',

  // CÓMO ESCONDER AL HIJO DEL EMPERADOR
  'howtohidetheemperorschild': 'comoesconderalhijodelemperador',
  'howtohidetheemperorschild2022': 'comoesconderalhijodelemperador',
  'comoesconderalhijodelemperador': 'comoesconderalhijodelemperador',

  // RAELIANA
  'larazonporlaqueraelianaterminoenlamansiondelduque': 'larazonporlaqueraelianaterminoenlamansiondelduque',
  'thereasonwhyraelianaendedupatthedukesmansion': 'larazonporlaqueraelianaterminoenlamansiondelduque',

  // ME CONVERTÍ EN LA ESPOSA DEL PROTAGONISTA MASCULINO
  'meconvertienlaesposadelprotagonistamasculino': 'meconvertienlaesposadelprotagonistamasculino',
  'ibecamethewifeofthemalelead': 'meconvertienlaesposadelprotagonistamasculino',
  'authorofmyowndestiny': 'meconvertienlaesposadelprotagonistamasculino',

  // SEDUCIENDO AL PADRE DEL VILLANO
  'seduciendoalpadredelvillano': 'seduciendoalpadredelvillano',
  'seducingthevillainsfather': 'seduciendoalpadredelvillano',

  // ROXANA
  'roxanacomoprotegeralhermanomayordelaprotagonista': 'comoprotegeralhermanomayordelaprotagonista',
  'comoprotegeralhermanomayordelaprotagonista': 'comoprotegeralhermanomayordelaprotagonista',

  // ESTE MATRIMONIO ESTÁ DESTINADO A FRACASAR
  'estematrimonioestadestinadoafracasardetodosmodos': 'estematrimonioestadestinadoafracasar',
  'estematrimonioestadestinadoafracasar': 'estematrimonioestadestinadoafracasar',

  // GACHIAKUTA
  'gachiakuta': 'gachiakuta',
  'gachiakutaofficial': 'gachiakuta',

  // NIGHTWING
  'nightwing2016': 'nightwing',
  'nightwing': 'nightwing',

  // MI BELLA JULIETA
  'paramibellajulieta': 'paramibellajulieta',
  'mibellajulieta': 'paramibellajulieta',

  // LA DOBLE VIDA DEL PROFESOR
  'ladoblevidadelprofesormasextras': 'ladoblevidadelprofesor',
  'ladoblevidadelprofesor': 'ladoblevidadelprofesor',

  // ONE PIECE
  'onepiece': 'onepiece',
  'onepiecefullcolor': 'onepiece',
  'onepiecefullcolor2012': 'onepiece',
};

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

function getCanonicalKey(rawTitle) {
  const norm = normalize(rawTitle);
  return ALIAS_CANONICAL[norm] || norm;
}

// 4. Fallback high-res official covers for titles with dead Otakuteca links
const KNOWN_COVERS = {
  'laleydelinso': 'https://uploads.mangadex.org/covers/8a2e20cc-bdc8-47f1-80fd-b6da4b2703df/64dbd78d-0b3e-4dcf-9657-95019715558f.jpg',
  'operacionamorverdadero': 'https://image2.ikigaimangas.cloud/cWZTkHYRBHszeBlTExuMOa9oToarW94Fa1iOJ1cMCBU/f:webp/sh:0.5/q:99/rs:fill:350:500:t/czM6Ly9pa2lnYWktY2RuL3Nlcmllcy9jb3ZlcnMvOTExODAzNTAyNjM5MTIwMzg2LzY0ZDZlOGE0LTJhYmMtNGE3Ny05NTVmLTJiNWQxYTgwMTU4MS53ZWJw.webp',
  'comoesconderalhijodelemperador': 'https://uploads.mangadex.org/covers/af2834eb-34dd-4cc2-9b09-7cab4e5e172b/81d5e43d-01ba-42c2-826b-ad81ecb99226.jpg',
  'seduciendoalpadredelvillano': 'https://uploads.mangadex.org/covers/c19e7ff1-36c4-430a-a92a-884716963ea9/dfd607ac-b639-4573-9d45-17a52e999839.jpg',
  'larazonporlaqueraelianaterminoenlamansiondelduque': 'https://uploads.mangadex.org/covers/00c73336-1e64-4bfd-a1c6-2bebe5aa0f31/948332d9-e938-4034-8c46-9d5a718b530c.jpg',
  'onepiece': 'https://uploads.mangadex.org/covers/a1c7c817-4e59-43b7-9365-09675a149a6f/a8d38e2e-2f5a-4e2a-89a4-2454a37b3be1.jpg',
  'encontrandoacamellia': 'https://uploads.mangadex.org/covers/339a11a8-ffcb-456d-b8d9-482fb49a37e9/59ba3394-9669-42b7-84fe-4861ae6bf79e.jpg',
  'lavillanaesunamarioneta': 'https://uploads.mangadex.org/covers/d89ca4e2-63b7-4d7a-8f0a-7463f82fc462/8d8a7a8f-2877-4c4f-9e73-b3c66f54c9da.jpg',
  'meconvertienlaesposadelprotagonistamasculino': 'https://uploads.mangadex.org/covers/9a0e6e89-1310-449b-9861-bf9ee320eb99/a2f77ff6-69b0-466c-bb9b-b6a8360eb1ce.jpg',
  'elunicofinaldelavillanaeslamuerte': 'https://uploads.mangadex.org/covers/48d0859a-f0f1-4dfb-bb66-e8d7d9620ddb/43f87fa3-a8bf-4950-8430-80ba4c0840cb.jpg',
};

// Words indicating adult fetish / hentai titles that had empty genres
const EXPLICIT_ADULT_KEYWORDS = [
  'leche materna', 'pezones', 'ordeño', 'cama lechera', 'vaca lechera',
  'granblue fantasy dj', 'jugos de yamada', 'ataque de leche', 'extraer leche',
  'no saldra leche', 'hacer leche sabrosa', 'amigos de leche', 'serpiente x vaca'
];

function isExplicitAdultTitle(title) {
  const norm = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const kw of EXPLICIT_ADULT_KEYWORDS) {
    if (norm.includes(kw)) return true;
  }
  return false;
}

// 5. Merge duplicates & Clean Library
const mergedMangasMap = new Map();
const oldIdToCanonical = new Map();
let purgedAdultCount = 0;

for (const m of seedData.mangas) {
  if (isExplicitAdultTitle(m.title)) {
    purgedAdultCount++;
    console.log(`🚫 Purgado manga adulto con género vacío: "${m.title}"`);
    continue;
  }

  const canonKey = getCanonicalKey(m.title);
  oldIdToCanonical.set(String(m.id), canonKey);

  let existing = mergedMangasMap.get(canonKey);
  if (!existing) {
    // Clean display title
    let displayTitle = m.title.trim();
    if (canonKey === 'laleydelinso') {
      displayTitle = 'La Ley del Inso (Inso\'s Law)';
    } else if (canonKey === 'operacionamorverdadero') {
      displayTitle = 'Operación: Amor Verdadero';
    } else if (canonKey === 'comoesconderalhijodelemperador') {
      displayTitle = 'Cómo Esconder Al Hijo Del Emperador';
    } else if (canonKey === 'comoconquistaramimarido') {
      displayTitle = 'Cómo conquistar a mi Marido';
    } else if (canonKey === 'alaamantedemiesposo') {
      displayTitle = 'A la amante de mi esposo';
    } else if (canonKey === 'onepiece') {
      displayTitle = 'One Piece';
    } else if (canonKey === 'elunicofinaldelavillanaeslamuerte') {
      displayTitle = 'El Único Final De La Villana Es La Muerte';
    }

    // Resolve cover URL
    let coverUrl = m.coverUrl || m.cover_url || '';
    if (KNOWN_COVERS[canonKey]) {
      coverUrl = KNOWN_COVERS[canonKey];
    } else if (coverUrl.includes('otakuteca.com') || !coverUrl) {
      // Try Ikigai catalog
      const ikigaiEntry = ikigaiCatalog.get(canonKey) || ikigaiCatalog.get(normalize(m.title));
      if (ikigaiEntry && ikigaiEntry.cover) {
        coverUrl = ikigaiEntry.cover;
      }
    }

    mergedMangasMap.set(canonKey, {
      ...m,
      title: displayTitle,
      coverUrl,
      canonicalKey: canonKey,
    });
  } else {
    console.log(`🔄 Fusionando duplicado: "${m.title}" en "${existing.title}"`);
    // Combine stats
    existing.currentChapter = Math.max(existing.currentChapter || 0, m.currentChapter || 0);
    existing.totalChapters = Math.max(existing.totalChapters || 0, m.totalChapters || 0);

    const sOld = new Date(existing.startedAt || existing.started_at);
    const sNew = new Date(m.startedAt || m.started_at);
    if (!isNaN(sNew.getTime()) && (isNaN(sOld.getTime()) || sNew < sOld)) {
      existing.startedAt = m.startedAt || m.started_at;
    }

    const lOld = new Date(existing.lastReadAt || existing.last_read_at);
    const lNew = new Date(m.lastReadAt || m.last_read_at);
    if (!isNaN(lNew.getTime()) && (isNaN(lOld.getTime()) || lNew > lOld)) {
      existing.lastReadAt = m.lastReadAt || m.last_read_at;
    }

    // Best cover
    if (!existing.coverUrl || existing.coverUrl.includes('otakuteca.com')) {
      if (m.coverUrl && !m.coverUrl.includes('otakuteca.com')) {
        existing.coverUrl = m.coverUrl;
      }
    }
  }
}

// 6. Calculate reading recency & months for each manga
const now = new Date('2026-10-22T22:45:00Z');
for (const m of mergedMangasMap.values()) {
  const start = new Date(m.startedAt || m.started_at);
  const last = new Date(m.lastReadAt || m.last_read_at);

  if (!isNaN(start.getTime()) && !isNaN(last.getTime())) {
    const diffMonths = (last.getFullYear() - start.getFullYear()) * 12 + (last.getMonth() - start.getMonth());
    m.readingMonths = Math.max(0, diffMonths);
  }

  // Recency classification:
  if (!isNaN(last.getTime())) {
    const daysSinceLastRead = (now.getTime() - last.getTime()) / (1000 * 3600 * 24);
    m.daysSinceLastRead = Math.round(daysSinceLastRead);
    // User requested: "los que leo ultimamente en un lado y los que llevo mas tiempo sin leer en otro"
    // Leídos últimamente (< 60 días) vs Llevo tiempo sin leer (>= 60 días)
    m.readingRecency = daysSinceLastRead <= 60 ? 'recent' : 'long_time';
  } else {
    m.daysSinceLastRead = 999;
    m.readingRecency = 'long_time';
  }

  // Keep publication status (finalizado vs en emisión)
  m.publicationStatus = m.status === 'completed' ? 'completed' : 'ongoing';
}

const finalMangas = Array.from(mergedMangasMap.values());
console.log(`\nFinal unique cleaned mangas: ${finalMangas.length} (Purged ${purgedAdultCount} adult titles)`);

// 7. Update reading events with canonical manga ids & deduplicate
const validCanonicalKeys = new Set(mergedMangasMap.keys());
const deduplicatedEvents = [];
const seenEventKeys = new Set();

for (const ev of seedData.events) {
  const canonKey = oldIdToCanonical.get(String(ev.manga_id)) || getCanonicalKey(ev.manga_title);
  if (!validCanonicalKeys.has(canonKey)) continue; // skip purged adult mangas

  const targetManga = mergedMangasMap.get(canonKey);
  const rawDate = ev.timestamp || ev.received_at;
  const dObj = new Date(rawDate);
  if (isNaN(dObj.getTime())) continue;

  const dayStr = dObj.toISOString().slice(0, 10);
  const dedupeKey = `${canonKey}_${Number(ev.chapter_number)}_${dayStr}`;

  if (!seenEventKeys.has(dedupeKey)) {
    seenEventKeys.add(dedupeKey);
    deduplicatedEvents.push({
      id: `evt-${canonKey}-${ev.chapter_number}-${dObj.getTime()}`,
      manga_id: targetManga.id,
      manga_title: targetManga.title,
      chapter_number: Number(ev.chapter_number),
      chapter_id: ev.chapter_id || '',
      cover_url: targetManga.coverUrl || '',
      genres: targetManga.genres || [],
      timestamp: dObj.toISOString(),
      received_at: dObj.toISOString(),
      source: 'normalized-sync',
    });
  }
}

deduplicatedEvents.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
console.log(`Final deduplicated events: ${deduplicatedEvents.length}`);

// 8. Save updated seed-data.json & mock-db.json
const updatedSeedPayload = {
  version: 3,
  updatedAt: new Date().toISOString(),
  mangas: finalMangas,
  events: deduplicatedEvents,
};

fs.writeFileSync('./tracker-app/seed-data.json', JSON.stringify(updatedSeedPayload, null, 2));
fs.writeFileSync('./tracker-app/mock-db.json', JSON.stringify(updatedSeedPayload, null, 2));
console.log('Saved updated seed-data.json and mock-db.json.');

// 9. Update local SQLite DB
try {
  const { db } = await import('../database.js');
  db.clearAll();
  db.upsertLibrary(finalMangas);
  db.db.exec('BEGIN TRANSACTION');
  const insertStmt = db.db.prepare(`
    INSERT OR IGNORE INTO reading_events (
      id, manga_id, manga_title, chapter_number, chapter_id,
      cover_url, genres, timestamp, received_at, source, event_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ev of deduplicatedEvents) {
    const hash = db.generateEventHash(ev.manga_id, ev.chapter_number, ev.timestamp);
    insertStmt.run(
      ev.id,
      ev.manga_id,
      ev.manga_title,
      ev.chapter_number,
      ev.chapter_id,
      ev.cover_url,
      JSON.stringify(ev.genres),
      ev.timestamp,
      ev.received_at,
      ev.source,
      hash
    );
  }
  db.db.exec('COMMIT');
  console.log('Local SQLite DB tracker.db updated successfully.');
} catch (e) {
  console.warn('Notice local SQLite:', e.message);
}

// 10. Sync to Render Cloud
try {
  console.log('Syncing to Render Cloud:', BACKEND_URL);
  await fetch(`${BACKEND_URL}/api/reset`, { method: 'POST' });

  const CHUNK = 500;
  console.log(`Sending library (${finalMangas.length} mangas) + first event chunk...`);
  await fetch(`${BACKEND_URL}/api/sync/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backupManga: finalMangas,
      history: deduplicatedEvents.slice(0, CHUNK),
    }),
  });

  for (let i = CHUNK; i < deduplicatedEvents.length; i += CHUNK) {
    process.stdout.write(`Uploading chunk ${Math.floor(i / CHUNK) + 1}/${Math.ceil(deduplicatedEvents.length / CHUNK)}...\r`);
    await fetch(`${BACKEND_URL}/api/sync/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backupManga: [],
        history: deduplicatedEvents.slice(i, i + CHUNK),
      }),
    });
  }
  console.log('\nRender Cloud synchronized successfully!');
} catch (e) {
  console.error('Error syncing to Render:', e.message);
}
