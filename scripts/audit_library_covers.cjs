const fs = require('fs');

const seedData = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
const mangas = seedData.mangas;

console.log('Total mangas in seed-data.json:', mangas.length);

const domainCounts = {};
const noCover = [];
const scanlationCovers = [];

for (const m of mangas) {
  if (!m.coverUrl || m.coverUrl.trim() === '') {
    noCover.push(m);
    continue;
  }
  let domain = 'unknown';
  try {
    domain = new URL(m.coverUrl).hostname;
  } catch(e) {
    domain = 'invalid-url';
  }
  domainCounts[domain] = (domainCounts[domain] || 0) + 1;

  // Check if it's not Ikigai or MangaDex
  if (!domain.includes('ikigai') && !domain.includes('mangadex')) {
    scanlationCovers.push({ id: m.id, title: m.title, domain, coverUrl: m.coverUrl });
  }
}

console.log('\nCover domain distribution:');
console.table(domainCounts);
console.log(`\nNo cover: ${noCover.length}`);
console.log(`Scanlation / third-party covers: ${scanlationCovers.length}`);
console.log('\nFirst 10 scanlation covers that can be upgraded:');
console.log(scanlationCovers.slice(0, 10).map(s => `${s.title} (${s.domain})`));
