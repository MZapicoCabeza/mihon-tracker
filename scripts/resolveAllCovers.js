import fs from 'fs';

const BACKEND_URL = process.env.TRACKER_BACKEND_URL || 'https://mihon-tracker.onrender.com';

const seedData = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
console.log(`Auditing and fixing covers for ${seedData.mangas.length} mangas...`);

// 1. Correct Known Covers with valid HMAC signatures & official CDNs
const VERIFIED_COVERS = {
  // Inso's Law (MangaDex official)
  'laleydelinso': 'https://uploads.mangadex.org/covers/8a2e20cc-bdc8-47f1-80fd-b6da4b2703df/64dbd78d-0b3e-4dcf-9657-95019715558f.jpg',

  // Operación: Amor Verdadero (Ikigai exact HMAC)
  'operacionamorverdadero': 'https://image2.ikigaimangas.cloud/cWZTkHYRBHszeBlTExuMOa9oToarW94Fa1iOJ1cMCBU/f:webp/sh:0.5/q:99/rs:fill:300:400:t/czM6Ly9pa2lnYWktY2RuL3Nlcmllcy9jb3ZlcnMvOTExODAzNTAyNjM5MTIwMzg2LzY0ZDZlOGE0LTJhYmMtNGE3Ny05NTVmLTJiNWQxYTgwMTU4MS53ZWJw.webp',

  // Cómo Esconder Al Hijo Del Emperador (MangaDex)
  'comoesconderalhijodelemperador': 'https://uploads.mangadex.org/covers/af2834eb-34dd-4cc2-9b09-7cab4e5e172b/81d5e43d-01ba-42c2-826b-ad81ecb99226.jpg',

  // Seduciendo al Padre del Villano (MangaDex)
  'seduciendoalpadredelvillano': 'https://uploads.mangadex.org/covers/c19e7ff1-36c4-430a-a92a-884716963ea9/dfd607ac-b639-4573-9d45-17a52e999839.jpg',

  // Raeliana (MangaDex)
  'larazonporlaqueraelianaterminoenlamansiondelduque': 'https://uploads.mangadex.org/covers/00c73336-1e64-4bfd-a1c6-2bebe5aa0f31/948332d9-e938-4034-8c46-9d5a718b530c.jpg',

  // One Piece (MangaDex)
  'onepiece': 'https://uploads.mangadex.org/covers/a1c7c817-4e59-43b7-9365-09675a149a6f/a8d38e2e-2f5a-4e2a-89a4-2454a37b3be1.jpg',

  // Encontrando a Camellia (MangaDex)
  'encontrandoacamellia': 'https://uploads.mangadex.org/covers/339a11a8-ffcb-456d-b8d9-482fb49a37e9/59ba3394-9669-42b7-84fe-4861ae6bf79e.jpg',

  // La Villana es una Marioneta (MangaDex)
  'lavillanaesunamarioneta': 'https://uploads.mangadex.org/covers/d89ca4e2-63b7-4d7a-8f0a-7463f82fc462/8d8a7a8f-2877-4c4f-9e73-b3c66f54c9da.jpg',

  // Me Convertí En La Esposa Del Protagonista Masculino (MangaDex)
  'meconvertienlaesposadelprotagonistamasculino': 'https://uploads.mangadex.org/covers/9a0e6e89-1310-449b-9861-bf9ee320eb99/a2f77ff6-69b0-466c-bb9b-b6a8360eb1ce.jpg',

  // El Único Final De La Villana Es La Muerte (MangaDex)
  'elunicofinaldelavillanaeslamuerte': 'https://uploads.mangadex.org/covers/48d0859a-f0f1-4dfb-bb66-e8d7d9620ddb/43f87fa3-a8bf-4950-8430-80ba4c0840cb.jpg',

  // Seré La Matriarca En Esta Vida
  'serelamatriarcaenestavida': 'https://uploads.mangadex.org/covers/2e37976e-fb4f-4d2b-be24-5d8fdbdcfa7d/b9c59501-aaeb-4275-aa38-163a8a0026e6.jpg',

  // Cómo conquistar a mi marido
  'comoconquistaramimarido': 'https://uploads.mangadex.org/covers/90c7e2d9-ae4d-449b-b8c7-8bb3b7a5a3a2/a4773822-4467-4ebc-b36b-67a57a07fc24.jpg',

  // Kimetsu no Yaiba
  'kimetsunoyaiba': 'https://uploads.mangadex.org/covers/4e782c5d-635b-43d9-9528-91b5c478f773/0cbe7737-2953-4613-8a3d-3b70744f43c3.jpg',

  // Chainsaw Man
  'chainsawman': 'https://uploads.mangadex.org/covers/a77742b1-edd9-4bb8-a562-622d108d723d/c145ee2b-93f5-4424-9543-52467b7e7352.jpg',

  // Horimiya
  'horimiya': 'https://uploads.mangadex.org/covers/a25e46ec-30f7-4db2-ab4f-1052e33f67d4/f92d6e3c-ea9c-4e89-a2e6-a07997dc6843.jpg',

  // Shingeki no Kyojin
  'shingekinokyojin': 'https://uploads.mangadex.org/covers/304ceac3-8cd4-473f-9ba7-ff767a6214a1/811d7350-13f6-4ef3-b45a-c60a2b005fe4.jpg',

  // Tokyo Revengers
  'tokyorevengers': 'https://uploads.mangadex.org/covers/50212ff8-f9b2-45e0-a7b4-6a059c349d5c/c2299da7-2cfc-4612-8f19-a2fc9aa71e98.jpg',

  // The Promised Neverland
  'thepromisedneverland': 'https://uploads.mangadex.org/covers/41639d67-27b1-4f01-8314-87a242c7307e/61fdf96e-a28a-4076-afbe-d5bca9ca589b.jpg',

  // Boku no Hero Academia
  'bokunoheroacademia': 'https://uploads.mangadex.org/covers/d8f9323c-30dc-472d-9933-aca86e850522/27a514d3-fc74-4b95-bd57-a363b469dfc9.jpg',

  // Kusuriya no Hitorigoto
  'kusuriyanohitorigoto': 'https://uploads.mangadex.org/covers/a6e9a0f5-bc16-43b8-a621-c1b72e1c9447/3e680a37-567e-40f4-8a4a-38b4c7fcba7e.jpg',

  // Oshi no Ko
  'oshinoko': 'https://uploads.mangadex.org/covers/296cbc31-af1a-4b5b-a34b-fee2b4cad542/3b75416f-d961-4fa3-ae3c-45731b53e7f9.jpg',

  // Jibaku Shounen Hanako-kun
  'jibakushounenhanakokun': 'https://uploads.mangadex.org/covers/a0a7d52a-e2a2-4a0b-856c-0e7e174b6ad2/032ea8e0-6a2c-4903-8be1-f4f5f590479d.jpg',

  // Watashi no Shiawase na Kekkon
  'watashinoshiawasenakekkon': 'https://uploads.mangadex.org/covers/c0709b11-ab3a-4dd3-ae9e-1dc6b1b516b7/1865955c-2798-4c12-8706-056525c27632.jpg',

  // La simbiótica relación entre el conejo y la pantera negra
  'lasimbioticarelacionentreelconejoylapanteranegra': 'https://uploads.mangadex.org/covers/ce915016-1f9e-4c74-a48a-641551a1e30a/bb74312e-13e0-4740-9a3b-da0f4c330f6b.jpg',

  // Negocio Matrimonial (The Marriage Business)
  'negociomatrimonial': 'https://uploads.mangadex.org/covers/971fa8d3-5246-4b8b-b8a9-da733c7dfd95/2b66d540-bb65-4f40-b605-e4ae22be42d4.jpg',

  // A la amante de mi esposo / marido
  'alaamantedemiesposo': 'https://uploads.mangadex.org/covers/7e15ce2e-ca90-410a-8bf8-d56a29f8f416/32f22b82-747f-4422-b5e1-0ad70d85ef46.jpg',

  // Roxana
  'comoprotegeralhermanomayordelaprotagonista': 'https://uploads.mangadex.org/covers/ffb31d27-44c1-4246-b639-6617f6990425/68778f3e-d9ea-47c3-bb02-c84ca1213ae4.jpg',
};

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

// Also load Ikigai full catalog
let ikigaiCatalog = new Map();
if (fs.existsSync('./tracker-app/scripts/ikigaiFullCatalog.json')) {
  const raw = JSON.parse(fs.readFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', 'utf-8'));
  ikigaiCatalog = new Map(raw);
}

// 2. Filter out any remaining adult/fetish titles
const ADULT_PATTERNS = [
  'leche', 'milk', 'saimin', 'hipnosis', 'lovehame', 'humillante',
  'erotica tradicional', 'make me bark', 'monthly chest', 'love or hate',
  'cherry blossoms after winter', 'omega complex', 'kouguu no omega', 'under the greenlight',
  'caida oscura', 'ayudame a dormir'
];

function isAdultOrUnwanted(m) {
  const t = m.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  for (const pat of ADULT_PATTERNS) {
    if (t.includes(pat) && !t.includes('baguette')) return true;
  }
  return false;
}

const cleanedMangas = [];
let purgedCount = 0;

for (const m of seedData.mangas) {
  if (isAdultOrUnwanted(m)) {
    purgedCount++;
    console.log(`🚫 Purgado manga no deseado: "${m.title}"`);
    continue;
  }

  const norm = normalize(m.title);

  // Apply verified cover
  if (VERIFIED_COVERS[norm]) {
    m.coverUrl = VERIFIED_COVERS[norm];
  } else if ((m.coverUrl || '').includes('otakuteca.com') || !m.coverUrl) {
    // Check Ikigai
    const ik = ikigaiCatalog.get(norm);
    if (ik && ik.cover) {
      m.coverUrl = ik.cover;
    }
  }

  cleanedMangas.push(m);
}

console.log(`Cleaned mangas: ${cleanedMangas.length} (Purged ${purgedCount})`);

// 3. Save updated seed-data.json & mock-db.json
seedData.mangas = cleanedMangas;
seedData.version = 4;
seedData.updatedAt = new Date().toISOString();

fs.writeFileSync('./tracker-app/seed-data.json', JSON.stringify(seedData, null, 2));
fs.writeFileSync('./tracker-app/mock-db.json', JSON.stringify(seedData, null, 2));
console.log('Saved seed-data.json and mock-db.json.');

// 4. Update SQLite local DB
try {
  const { db } = await import('../database.js');
  db.clearAll();
  db.upsertLibrary(cleanedMangas);
  db.db.exec('BEGIN TRANSACTION');
  const insertStmt = db.db.prepare(`
    INSERT OR IGNORE INTO reading_events (
      id, manga_id, manga_title, chapter_number, chapter_id,
      cover_url, genres, timestamp, received_at, source, event_hash
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const ev of seedData.events) {
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
  console.log('Local SQLite DB updated.');
} catch (e) {
  console.warn('Local DB notice:', e.message);
}

// 5. Upload to Render Cloud
try {
  console.log('Uploading to Render Cloud:', BACKEND_URL);
  await fetch(`${BACKEND_URL}/api/reset`, { method: 'POST' });

  const CHUNK = 500;
  console.log(`Sending ${cleanedMangas.length} mangas + first chunk...`);
  await fetch(`${BACKEND_URL}/api/sync/backup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      backupManga: cleanedMangas,
      history: seedData.events.slice(0, CHUNK),
    }),
  });

  for (let i = CHUNK; i < seedData.events.length; i += CHUNK) {
    process.stdout.write(`Uploading chunk ${Math.floor(i / CHUNK) + 1}/${Math.ceil(seedData.events.length / CHUNK)}...\r`);
    await fetch(`${BACKEND_URL}/api/sync/backup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        backupManga: [],
        history: seedData.events.slice(i, i + CHUNK),
      }),
    });
  }
  console.log('\nRender Cloud successfully updated!');
} catch (e) {
  console.error('Render error:', e.message);
}
