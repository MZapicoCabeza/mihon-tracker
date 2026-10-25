import fs from 'fs';

const data = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
console.log(`Auditing covers for ${data.mangas.length} mangas...`);

const results = {
  ok: 0,
  failed: 0,
  empty: 0,
  byDomain: {},
  failedExamples: [],
};

for (const m of data.mangas.slice(0, 50)) {
  const url = m.coverUrl || m.cover_url;
  if (!url) {
    results.empty++;
    continue;
  }

  let domain = 'unknown';
  try {
    domain = new URL(url).hostname;
  } catch {}

  results.byDomain[domain] = (results.byDomain[domain] || { ok: 0, fail: 0 });

  try {
    const res = await fetch(url, {
      method: 'HEAD',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    if (res.ok) {
      results.ok++;
      results.byDomain[domain].ok++;
    } else {
      results.failed++;
      results.byDomain[domain].fail++;
      results.failedExamples.push({ title: m.title, url, status: res.status });
    }
  } catch (e) {
    results.failed++;
    results.byDomain[domain].fail++;
    results.failedExamples.push({ title: m.title, url, error: e.message });
  }
}

console.log('Sample audit (first 50):');
console.log('OK:', results.ok, 'Failed:', results.failed, 'Empty:', results.empty);
console.log('By domain:', JSON.stringify(results.byDomain, null, 2));
console.log('Failed examples (first 10):');
for (const ex of results.failedExamples.slice(0, 10)) {
  console.log(`- "${ex.title}": status=${ex.status || ex.error} (${ex.url})`);
}
