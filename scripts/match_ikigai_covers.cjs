const fs = require('fs');

const seedData = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
const ikigaiEntries = JSON.parse(fs.readFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', 'utf-8'));

console.log(`Library mangas: ${seedData.mangas.length}`);
console.log(`Ikigai entries: ${ikigaiEntries.length}`);

// Build Ikigai search structures
const ikigaiMap = new Map();
const ikigaiList = [];

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
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

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

// Special alias dictionary for known alternative titles / translations
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
  'vestir a julieta': ['dressing up juliet', 'to dress up him']
};

function similarity(s1, s2) {
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;
  // Bigram Dice similarity
  const bg1 = new Set();
  for (let i = 0; i < s1.length - 1; i++) bg1.add(s1.substring(i, i + 2));
  const bg2 = new Set();
  for (let i = 0; i < s2.length - 1; i++) bg2.add(s2.substring(i, i + 2));
  let intersection = 0;
  for (const b of bg1) if (bg2.has(b)) intersection++;
  return (2.0 * intersection) / (bg1.size + bg2.size);
}

let exactMatches = 0;
let aliasMatches = 0;
let fuzzyMatches = 0;
let notFound = 0;

const matchedResults = [];

for (const manga of seedData.mangas) {
  const cleanMangaTitle = cleanString(manga.title);
  const strictMangaTitle = cleanStrict(manga.title);
  const mangaWords = getSignificantWords(manga.title);

  let bestMatch = null;
  let matchReason = '';

  // 1. Direct exact strict title or slug
  if (ikigaiMap.has(strictMangaTitle)) {
    bestMatch = ikigaiMap.get(strictMangaTitle);
    matchReason = 'exact';
    exactMatches++;
  }

  // 2. Alias match
  if (!bestMatch) {
    for (const [from, toList] of Object.entries(ALIASES)) {
      if (cleanMangaTitle.includes(cleanString(from))) {
        for (const alias of toList) {
          const strictAlias = cleanStrict(alias);
          if (ikigaiMap.has(strictAlias)) {
            bestMatch = ikigaiMap.get(strictAlias);
            matchReason = `alias (${alias})`;
            aliasMatches++;
            break;
          }
        }
      }
      if (bestMatch) break;
    }
  }

  // 3. High word overlap (all significant words of manga are present in ikigai title, or vice-versa)
  if (!bestMatch && mangaWords.length >= 2) {
    let maxOverlap = 0;
    for (const item of ikigaiList) {
      if (item.words.size === 0) continue;
      const common = mangaWords.filter(w => item.words.has(w)).length;
      const ratio1 = common / mangaWords.length;
      const ratio2 = common / item.words.size;
      
      // If 100% of manga words match and titles are similar length
      if (ratio1 === 1.0 && ratio2 >= 0.7) {
        bestMatch = item;
        matchReason = 'full word match';
        fuzzyMatches++;
        break;
      }
    }
  }

  // 4. Fuzzy bigram Dice similarity >= 0.85
  if (!bestMatch && strictMangaTitle.length > 5) {
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
    if (highestSim >= 0.85 && candidate) {
      bestMatch = candidate;
      matchReason = `fuzzy (${highestSim.toFixed(2)})`;
      fuzzyMatches++;
    }
  }

  if (bestMatch) {
    matchedResults.push({
      id: manga.id,
      originalTitle: manga.title,
      matchedTitle: bestMatch.title,
      currentCover: manga.coverUrl,
      ikigaiCover: bestMatch.cover,
      matchReason
    });
  } else {
    notFound++;
    matchedResults.push({
      id: manga.id,
      originalTitle: manga.title,
      matchedTitle: null,
      currentCover: manga.coverUrl,
      ikigaiCover: null,
      matchReason: 'none'
    });
  }
}

console.log('\n--- MATCHING SUMMARY ---');
console.log(`Total Library Mangas: ${seedData.mangas.length}`);
console.log(`Exact matches: ${exactMatches}`);
console.log(`Alias matches: ${aliasMatches}`);
console.log(`Fuzzy / Word matches: ${fuzzyMatches}`);
const totalMatched = exactMatches + aliasMatches + fuzzyMatches;
console.log(`Total Matched to Ikigai: ${totalMatched} / ${seedData.mangas.length} (${((totalMatched / seedData.mangas.length) * 100).toFixed(1)}%)`);
console.log(`Not Matched in Ikigai: ${notFound}`);

// Show some sample matched
console.log('\nSample Ikigai Cover Upgrades:');
const sampleUpgrades = matchedResults
  .filter(m => m.ikigaiCover && !m.currentCover.includes('image2.ikigaimangas.cloud'))
  .slice(0, 15);

for (const s of sampleUpgrades) {
  console.log(`- "${s.originalTitle}" -> "${s.matchedTitle}" [${s.matchReason}]`);
  console.log(`    Old: ${s.currentCover}`);
  console.log(`    New: ${s.ikigaiCover}`);
}
