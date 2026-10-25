import fs from 'fs';

const raw = fs.readFileSync('./tracker-app/seed-data.json', 'utf-8');
const data = JSON.parse(raw);

const titles = data.mangas.map(m => m.title);

const pairs = [];
for (let i = 0; i < titles.length; i++) {
  for (let j = i + 1; j < titles.length; j++) {
    const t1 = titles[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    const t2 = titles[j].toLowerCase().replace(/[^a-z0-9]/g, '');

    if (t1.length > 5 && t2.length > 5) {
      if (t1.includes(t2) || t2.includes(t1)) {
        pairs.push([titles[i], titles[j]]);
      }
    }
  }
}

console.log('Similar title pairs:', pairs.length);
for (const p of pairs) {
  console.log(`- "${p[0]}" <==> "${p[1]}"`);
}
