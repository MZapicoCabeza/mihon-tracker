import fs from 'fs';

const fullCatRaw = JSON.parse(fs.readFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', 'utf-8'));
const ikigaiMap = new Map(fullCatRaw);

const seedData = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

let matchedWithIkigai = 0;
let replacedOtakuteca = 0;

for (const m of seedData.mangas) {
  const norm = normalize(m.title);
  const found = ikigaiMap.get(norm);
  if (found) {
    matchedWithIkigai++;
    const currentCover = m.coverUrl || m.cover_url || '';
    if (currentCover.includes('otakuteca.com') || !currentCover) {
      replacedOtakuteca++;
      console.log(`[IKIGAI MATCH] "${m.title}" -> ${found.cover.slice(0, 70)}...`);
    }
  }
}

console.log(`\nMatched ${matchedWithIkigai} mangas with Ikigai.`);
console.log(`Can replace ${replacedOtakuteca} broken/dead covers with official Ikigai covers.`);
