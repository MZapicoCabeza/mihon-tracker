import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
const domains = new Map();

for (const m of data.mangas) {
  const url = m.coverUrl || m.cover_url || '';
  if (!url) {
    domains.set('EMPTY', (domains.get('EMPTY') || 0) + 1);
  } else {
    try {
      const u = new URL(url);
      domains.set(u.hostname, (domains.get(u.hostname) || 0) + 1);
    } catch {
      domains.set('INVALID', (domains.get('INVALID') || 0) + 1);
    }
  }
}

console.log('Cover domains in library:');
for (const [dom, count] of domains.entries()) {
  console.log(`- ${dom}: ${count}`);
}
