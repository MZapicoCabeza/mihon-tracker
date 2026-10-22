import fs from 'fs';
import { parseTachibkBuffer } from './processBackup.js';

const buf = fs.readFileSync('C:/Users/maria/Downloads/app.mihon_2026-10-22_20-18.tachibk');
const res = parseTachibkBuffer(buf);
console.log('Total mangas parsed:', res.mangas.length);

const withMonths = res.mangas
  .filter(m => m.reading_months > 0)
  .sort((a,b) => b.reading_months - a.reading_months);

console.log('Mangas with reading duration > 0 months:', withMonths.length);
console.log('\nTop 20 reading duration:');
for (const m of withMonths.slice(0, 20)) {
  console.log(`- ${m.title}: ${m.reading_months} meses (Desde: ${m.started_at.slice(0, 10)} hasta ${m.last_read_at.slice(0, 10)}) [Cap actual: ${m.current_chapter}/${m.total_chapters}]`);
}
