import fs from 'fs';
import path from 'path';

const ikigaiDir = 'c:/Users/maria/Documents/Textual_C1/Web Scrapping/Estudiar/Ikigai';
const htmlDir = path.join(ikigaiDir, 'html');
const dataFile = path.join(ikigaiDir, 'data', 'tramites_pdi2.json');

// 1. Load tramites_pdi2.json
let tramites = [];
if (fs.existsSync(dataFile)) {
  let raw = fs.readFileSync(dataFile, 'utf-8').replace(/:\s*NaN/g, ': null');
  try {
    tramites = JSON.parse(raw);
  } catch (e) {
    console.warn('Error parsing tramites_pdi2.json:', e.message);
  }
}
console.log('Loaded tramites:', tramites.length);

// 2. Scan HTML files for covers and descriptions
const htmlFiles = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));
const ikigaiCatalog = new Map();

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

for (const t of tramites) {
  if (t.titulo) {
    const key = normalize(t.titulo);
    ikigaiCatalog.set(key, {
      title: t.titulo,
      link: t.link,
      estado: t.estado,
      description: t.info?.descripcion || '',
      genres: t.info?.etiquetas || [],
      rating: t.info?.nota || '',
      cover: '',
    });
  }
}

// Extract covers from detail html files
for (const file of htmlFiles) {
  const content = fs.readFileSync(path.join(htmlDir, file), 'utf-8');

  // Title in card or h1
  const h1Match = content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const title = h1Match ? h1Match[1].replace(/<[^>]+>/g, '').trim() : '';

  // Cover image in card
  const imgMatch = content.match(/<img[^>]+src="([^"]+)"[^>]+(?:class="[^"]*rounded[^"]*"|alt="[^"]*")/i) ||
                   content.match(/<img[^>]+(?:class="[^"]*rounded[^"]*"|alt="[^"]*")[^>]+src="([^"]+)"/i);

  if (title && imgMatch && title !== 'Biblioteca') {
    const key = normalize(title);
    const existing = ikigaiCatalog.get(key) || { title };
    existing.cover = imgMatch[1];
    ikigaiCatalog.set(key, existing);
  }
}

console.log('Total series cataloged from Ikigai folder:', ikigaiCatalog.size);

// 3. Match against seed-data.json
const seedData = JSON.parse(fs.readFileSync('./tracker-app/seed-data.json', 'utf-8'));
let matchedCount = 0;

for (const m of seedData.mangas) {
  const normTitle = normalize(m.title);
  const matched = ikigaiCatalog.get(normTitle);
  if (matched && matched.cover) {
    matchedCount++;
  }
}

console.log(`Matched ${matchedCount} mangas from library with Ikigai covers.`);
