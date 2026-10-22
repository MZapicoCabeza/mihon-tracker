import fs from 'fs';
import { parseTachibkBuffer } from './processBackup.js';

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const buf2026 = fs.readFileSync('C:/Users/maria/Downloads/app.mihon_2026-10-22_20-18.tachibk');
const buf2023 = fs.readFileSync('C:/Users/maria/Downloads/tachiyomi_2026-10-22_20-45.proto.gz');

const res2026 = parseTachibkBuffer(buf2026);
const res2023 = parseTachibkBuffer(buf2023);

console.log('2026 backup:', res2026.mangas.length, 'mangas,', res2026.history.length, 'events');
console.log('2023 backup:', res2023.mangas.length, 'mangas,', res2023.history.length, 'events');

const map2026 = new Map();
res2026.mangas.forEach((m) => {
  map2026.set(normalize(m.title), m);
});

let matches = 0;
for (const m23 of res2023.mangas) {
  const norm = normalize(m23.title);
  let matchedManga = map2026.get(norm);

  // Partial match for things like "Operation Name Pure Love" vs "Operacion amor verdadero"
  if (!matchedManga) {
    if (norm.includes('purelove') || norm.includes('operationname')) {
      matchedManga = res2026.mangas.find((m) => normalize(m.title).includes('amorverdadero'));
    } else if (norm.includes('onepiece')) {
      matchedManga = res2026.mangas.find((m) => normalize(m.title).includes('onepiece'));
    }
  }

  if (matchedManga) {
    matches++;
    const s23 = new Date(m23.started_at);
    const end26 = new Date(matchedManga.last_read_at);
    const months = (end26.getFullYear() - s23.getFullYear()) * 12 + (end26.getMonth() - s23.getMonth());
    console.log(`✅ MATCH: "${m23.title}" -> "${matchedManga.title}"`);
    console.log(`   Iniciado en 2023: ${m23.started_at.slice(0, 10)} | Última lectura: ${matchedManga.last_read_at.slice(0, 10)} | ¡${months} meses leyendo!`);
  } else {
    console.log(`🆕 Solo en 2023: "${m23.title}" (${m23.started_at.slice(0, 10)})`);
  }
}

console.log(`\nTotal coincidentes: ${matches} de ${res2023.mangas.length}`);
