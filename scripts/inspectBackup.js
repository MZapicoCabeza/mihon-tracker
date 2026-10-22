import fs from 'fs';
import { parseTachibkBuffer } from './processBackup.js';

const filePath = process.argv[2] || 'C:/Users/maria/Downloads/app.mihon_2026-10-22_20-18.tachibk';

console.log('Reading file:', filePath);
const buffer = fs.readFileSync(filePath);
console.log('Size:', buffer.length, 'bytes');

const result = parseTachibkBuffer(buffer);

console.log('\n================ RESULTADOS ================');
console.log('✅ Mangas limpios permitidos:', result.mangas.length);
console.log('🚫 Mangas excluidos por +18 / Adult / Mature:', result.filteredNsfw.length);
console.log('📜 Total capítulos leídos en el historial:', result.history.length);

if (result.filteredNsfw.length > 0) {
  console.log('\n--- Ejemplos de mangas excluidos (+18/Mature) ---');
  result.filteredNsfw.slice(0, 10).forEach(m => {
    console.log(`- ${m.title} (Géneros: ${m.genres.join(', ')})`);
  });
}

if (result.mangas.length > 0) {
  console.log('\n--- Ejemplos de mangas limpios y tiempo de lectura ---');
  result.mangas
    .sort((a, b) => b.reading_months - a.reading_months)
    .slice(0, 10)
    .forEach(m => {
      console.log(`- "${m.title}": iniciado el ${m.started_at.slice(0, 10)} (${m.reading_months} meses leyendo, cap actual: ${m.current_chapter}/${m.total_chapters})`);
    });
}
