const fs = require('fs');
let DatabaseSync;
try {
  DatabaseSync = require('node:sqlite').DatabaseSync;
} catch (e) {
  console.log('node:sqlite not directly available via require, will test import');
}

const seedDataPath = './tracker-app/seed-data.json';
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf-8'));
const ikigaiEntries = JSON.parse(fs.readFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', 'utf-8'));
const mangadexResolved = fs.existsSync('./tracker-app/scripts/resolvedMangaDexCovers.json')
  ? JSON.parse(fs.readFileSync('./tracker-app/scripts/resolvedMangaDexCovers.json', 'utf-8'))
  : {};

function cleanString(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .replace(/\s*\((?:comic|novela|manhwa|manga|color|oficial)\)/gi, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanStrict(str) {
  return cleanString(str).replace(/\s+/g, '');
}

const STOP_WORDS = new Set([
  'el', 'la', 'los', 'las', 'un', 'una', 'unos', 'unas', 'de', 'del', 'en', 'y', 'a', 'con', 'por', 'para', 'mi', 'mis', 'su', 'sus', 'se', 'al', 'lo',
  'the', 'a', 'an', 'of', 'in', 'and', 'to', 'with', 'for', 'my', 'its', 'is', 'on', 'at', 'by'
]);

function getSignificantWords(str) {
  return cleanString(str)
    .split(' ')
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

// Build Ikigai catalog lookup structures
const ikigaiMap = new Map();
const ikigaiList = [];

for (const [key, item] of ikigaiEntries) {
  if (!item || !item.cover) continue;
  const rawTitle = item.title || '';
  const slugTitle = (item.slug || '').replace(/-/g, ' ');
  const strictTitle = cleanStrict(rawTitle);
  const strictSlug = cleanStrict(slugTitle);
  const words = getSignificantWords(rawTitle);

  const entry = {
    title: rawTitle,
    slug: item.slug,
    cover: item.cover,
    link: item.link,
    strictTitle,
    strictSlug,
    words: new Set(words)
  };

  ikigaiList.push(entry);
  if (strictTitle) ikigaiMap.set(strictTitle, entry);
  if (strictSlug && !ikigaiMap.has(strictSlug)) ikigaiMap.set(strictSlug, entry);
}

const ALIASES = {
  'la ley del inso': ['inso s law', 'insos law', 'la ley de inso', 'my life as an internet novel'],
  'inso s law': ['la ley del inso', 'insos law', 'my life as an internet novel'],
  'falle al divorciarme de mi esposo': ['falle en divorciarme de mi esposo', 'i failed to divorce my husband', 'i failed to oust the villain'],
  'elimina a la dama villana': ['kill the villainess', 'matar a la villana'],
  'solo necesito al hijo del duque': ['i only need the duke s son'],
  'carino hoy voy hacer huelga': ['honey i m going on strike', 'carino me declaro en huelga', 'honey i am on a strike'],
  'la prometida obsidiana': ['the obsidian bride', 'obsidian bride', 'novia de obsidiana'],
  'una vez mas hacia luz': ['into the light once again', 'hacia la luz una vez mas'],
  'el heroe de la dama malvada': ['the evil lady s hero', 'evil lady s hero'],
  'el rey de la tierra': ['king the land'],
  'couple breaker': ['rompe parejas', 'couple breaker'],
  'operacion amor verdadero': ['operation true love', 'pure love operation'],
  'matrimonio real': ['royal marriage'],
  'las circunstancias de jooin': ['jooin s circumstances', 'the circumstances of jooin'],
  'la autora piensa que la villana es comun': ['i thought it was a common possession', 'i thought it was a common isekai story'],
  'me converti en la rival de los protagonistas': ['i became the male lead s female friend', 'i became the male lead s rival'],
  'vestir a julieta': ['dressing up juliet', 'to dress up him'],
  'este matrimonio esta destinado a fracasar de todos modos': ['el anillo roto este matrimonio fracasara de todos modos', 'el anillo roto'],
  'el matrimonio fraudulento de lily bush': ['el matrimonio fraudulento de lily busch'],
  'la dama secreta': ['una dama secreta', 'secret lady'],
  'no toques al perro': ['no toques el perro'],
  'capture el corazon del gran duque siendo una villana': ['siendo una villana capture el corazon del gran duque'],
  'soy la madrastra y evitare la muerte': ['sere la madrastra en esta historia pero evitare mi muerte destinada'],
  'infiltrada en una escuela secundaria chaebol': ['infiltrada en una escuela chaebol'],
  'una familia de villanos esta en contra de mi autonomia': ['la familia de villanos esta en contra de mi independencia'],
  'cafeteria para ninos': ['bienvenidos a la cafeteria para ninos'],
  'alguien ha poseido mi cuerpo': ['mi cuerpo ha sido poseido por alguien'],
  'el primer amor del chico rebelde': ['el primer amor del delincuente', 'el primer amor del chico rebelde'],
  'el primer amor del delincuente': ['el primer amor del chico rebelde'],
  'el duque quiere tener un heredero': ['lee the duke wants to have an heir'],
  'lee the duke wants to have an heir': ['el duque quiere tener un heredero']
};

function similarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  const bg1 = new Set();
  for (let i = 0; i < s1.length - 1; i++) bg1.add(s1.substring(i, i + 2));
  const bg2 = new Set();
  for (let i = 0; i < s2.length - 1; i++) bg2.add(s2.substring(i, i + 2));
  let intersection = 0;
  for (const b of bg1) if (bg2.has(b)) intersection++;
  return (2.0 * intersection) / (bg1.size + bg2.size);
}

function findIkigaiMatch(title) {
  const cleanMangaTitle = cleanString(title);
  const strictMangaTitle = cleanStrict(title);
  const mangaWords = getSignificantWords(title);

  // 1. Direct strict title or slug
  if (ikigaiMap.has(strictMangaTitle)) {
    return { match: ikigaiMap.get(strictMangaTitle), reason: 'exact' };
  }

  // 2. Alias match
  for (const [from, toList] of Object.entries(ALIASES)) {
    if (cleanMangaTitle.includes(cleanString(from))) {
      for (const alias of toList) {
        const strictAlias = cleanStrict(alias);
        if (ikigaiMap.has(strictAlias)) {
          return { match: ikigaiMap.get(strictAlias), reason: `alias (${alias})` };
        }
      }
    }
  }

  // 3. Significant word subset
  if (mangaWords.length >= 2) {
    for (const item of ikigaiList) {
      if (item.words.size === 0) continue;
      const common = mangaWords.filter(w => item.words.has(w)).length;
      const ratio1 = common / mangaWords.length;
      const ratio2 = common / item.words.size;
      if (ratio1 === 1.0 && ratio2 >= 0.7) {
        return { match: item, reason: 'word match' };
      }
    }
  }

  // 4. Dice similarity >= 0.88
  if (strictMangaTitle.length > 5) {
    let highestSim = 0;
    let candidate = null;
    for (const item of ikigaiList) {
      const sim = Math.max(
        similarity(strictMangaTitle, item.strictTitle),
        similarity(strictMangaTitle, item.strictSlug)
      );
      if (sim > highestSim) {
        highestSim = sim;
        candidate = item;
      }
    }
    if (highestSim >= 0.88 && candidate) {
      return { match: candidate, reason: `fuzzy (${highestSim.toFixed(2)})` };
    }
  }

  return null;
}

let ikigaiUpgrades = 0;
let mangadexUpgrades = 0;
let untouched = 0;

for (const m of seedData.mangas) {
  const ikigai = findIkigaiMatch(m.title);
  if (ikigai && ikigai.match.cover) {
    if (m.coverUrl !== ikigai.match.cover) {
      m.coverUrl = ikigai.match.cover;
      ikigaiUpgrades++;
    }
  } else if (mangadexResolved[m.title]) {
    if (m.coverUrl !== mangadexResolved[m.title]) {
      m.coverUrl = mangadexResolved[m.title];
      mangadexUpgrades++;
    }
  } else {
    untouched++;
  }
}

console.log(`\n=== COVER UPGRADE SUMMARY ===`);
console.log(`Total library mangas: ${seedData.mangas.length}`);
console.log(`Upgraded to official Ikigai covers: ${ikigaiUpgrades}`);
console.log(`Upgraded to official MangaDex covers: ${mangadexUpgrades}`);
console.log(`Untouched / already optimal: ${untouched}`);

// 1. Save to seed-data.json
fs.writeFileSync(seedDataPath, JSON.stringify(seedData, null, 2), 'utf-8');
console.log(`Saved updated library to ${seedDataPath}`);

// 2. Update local SQLite tracker.db
const dbPath = './tracker-app/tracker.db';
if (fs.existsSync(dbPath) && DatabaseSync) {
  const db = new DatabaseSync(dbPath);
  const updateStmt = db.prepare('UPDATE mangas SET cover_url = ? WHERE id = ?');
  for (const m of seedData.mangas) {
    updateStmt.run(m.coverUrl, m.id);
  }
  console.log(`Updated all mangas in local SQLite database (${dbPath})`);
  db.close();
}

// 3. Sync to Render cloud backend
(async () => {
  const RENDER_BACKEND_URL = 'https://mihon-tracker.onrender.com';
  console.log(`\nSyncing updated covers to Render Cloud (${RENDER_BACKEND_URL})...`);
  try {
    const res = await fetch(`${RENDER_BACKEND_URL}/api/sync/library`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      },
      body: JSON.stringify({
        mangas: seedData.mangas,
        stats: seedData.stats
      })
    });
    console.log(`Render sync response status: ${res.status}`);
    const data = await res.json();
    console.log('Render sync response:', data);
  } catch (e) {
    console.error('Failed to sync to Render Cloud:', e.message);
  }
})();
