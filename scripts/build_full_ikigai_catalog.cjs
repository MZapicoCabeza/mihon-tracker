const fs = require('fs');
const path = require('path');

async function scrapeAllIkigaiPages() {
  console.log('Starting full scrape of Ikigai catalog (pages 1 to 302)...');
  const catalog = new Map(); // key -> { name, slug, cover, link }

  const normalize = (t) =>
    String(t || '')
      .toLowerCase()
      .replace(/\s*\(\s*\d{4}\s*\)/g, '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');

  const TOTAL_PAGES = 302;
  const CONCURRENCY = 15;
  const pages = Array.from({ length: TOTAL_PAGES }, (_, i) => i + 1);

  let completed = 0;

  async function fetchPage(p) {
    try {
      const res = await fetch(`https://visualikigai.cmpunjabrashancard.pk/series/q-data.json?pagina=${p}`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      if (!res.ok) {
        console.warn(`Page ${p} returned status ${res.status}`);
        return;
      }
      const json = await res.json();
      const objs = json._objs || [];

      function resolve(val) {
        if (typeof val === 'string') {
          const idx = parseInt(val, 36);
          if (!isNaN(idx) && idx >= 0 && idx < objs.length) {
            return objs[idx];
          }
        }
        return val;
      }

      for (const item of objs) {
        if (item && typeof item === 'object' && 'name' in item && 'slug' in item && 'cover' in item) {
          const name = resolve(item.name);
          const slug = resolve(item.slug);
          const cover = resolve(item.cover);
          if (name && cover && typeof name === 'string' && typeof cover === 'string') {
            const key = normalize(name);
            const isHighRes = cover.includes('300:400');
            const existing = catalog.get(key);
            // If already exists, prefer high res cover (300:400) over thumbnail (80:110)
            if (!existing || (!existing.cover.includes('300:400') && isHighRes)) {
              catalog.set(key, {
                title: name,
                slug,
                cover,
                link: `https://visualikigai.cmpunjabrashancard.pk/series/${slug}/`
              });
            }
          }
        }
      }
    } catch (e) {
      console.warn(`Error on page ${p}:`, e.message);
    } finally {
      completed++;
      if (completed % 50 === 0 || completed === TOTAL_PAGES) {
        console.log(`Progress: ${completed}/${TOTAL_PAGES} pages processed. Catalog size: ${catalog.size}`);
      }
    }
  }

  // Run in chunks
  for (let i = 0; i < pages.length; i += CONCURRENCY) {
    const chunk = pages.slice(i, i + CONCURRENCY);
    await Promise.all(chunk.map(p => fetchPage(p)));
  }

  console.log(`\nFinished live scraping! Total unique series from live site: ${catalog.size}`);

  // Merge with existing ikigaiFullCatalog.json
  const existingPath = './tracker-app/scripts/ikigaiFullCatalog.json';
  if (fs.existsSync(existingPath)) {
    try {
      const existingData = JSON.parse(fs.readFileSync(existingPath, 'utf-8'));
      let addedFromExisting = 0;
      for (const [key, item] of existingData) {
        if (!catalog.has(key) && item.cover) {
          catalog.set(key, item);
          addedFromExisting++;
        }
      }
      console.log(`Added ${addedFromExisting} additional series from existing ikigaiFullCatalog.json`);
    } catch (e) {
      console.warn('Error reading ikigaiFullCatalog.json:', e.message);
    }
  }

  // Merge with tramites_pdi2.json if available
  const pdiPath = 'c:/Users/maria/Documents/Textual_C1/Web Scrapping/Estudiar/Ikigai/data/tramites_pdi2.json';
  if (fs.existsSync(pdiPath)) {
    try {
      const raw = fs.readFileSync(pdiPath, 'utf-8').replace(/:\s*NaN/g, ': null');
      const pdiList = JSON.parse(raw);
      let addedPdi = 0;
      for (const p of pdiList) {
        if (p.titulo) {
          const key = normalize(p.titulo);
          if (!catalog.has(key)) {
            catalog.set(key, {
              title: p.titulo,
              link: p.link,
              cover: p.cover || ''
            });
            addedPdi++;
          }
        }
      }
      console.log(`Added ${addedPdi} series from local tramites_pdi2.json`);
    } catch (e) {
      console.warn('Error reading tramites_pdi2.json:', e.message);
    }
  }

  console.log(`Total combined Ikigai catalog entries: ${catalog.size}`);

  // Save to ikigaiFullCatalog.json and ikigaiCatalogMap.json
  const entries = [...catalog.entries()];
  fs.writeFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', JSON.stringify(entries, null, 2), 'utf-8');
  console.log('Saved to tracker-app/scripts/ikigaiFullCatalog.json');

  return catalog;
}

scrapeAllIkigaiPages().catch(console.error);
