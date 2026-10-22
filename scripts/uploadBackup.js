import fs from 'fs';
import path from 'path';
import { parseTachibkBuffer } from './processBackup.js';

const BACKEND_URL = process.env.TRACKER_BACKEND_URL || 'https://mihon-tracker.onrender.com';
const API_KEY = process.env.TRACKER_API_KEY || null;

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error('Uso: node scripts/uploadBackup.js <ruta-al-archivo.tachibk>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: No se encontró el archivo: ${filePath}`);
    process.exit(1);
  }

  console.log(`\n======================================================`);
  console.log(`📦 Procesando respaldo de Mihon: ${path.basename(filePath)}`);
  console.log(`======================================================`);

  const buffer = fs.readFileSync(filePath);
  const result = parseTachibkBuffer(buffer);

  console.log(`\n✅ Mangas limpios encontrados: ${result.mangas.length}`);
  console.log(`🚫 Mangas filtrados por +18/Adult/Mature: ${result.filteredNsfw.length}`);
  if (result.filteredNsfw.length > 0) {
    console.log(`   Ejemplos filtrados:`, result.filteredNsfw.slice(0, 5).map(m => `${m.title} (${m.genres.join(', ')})`).join(' | '));
  }
  console.log(`📜 Eventos de historial leídos encontrados: ${result.history.length}`);

  if (result.mangas.length === 0) {
    console.warn('⚠️ No hay mangas válidos para subir.');
    return;
  }

  // Preview dates & duration
  const withMonths = result.mangas.filter(m => m.reading_months > 0);
  console.log(`⏳ Mangas con historial de lectura prolongado: ${withMonths.length}`);
  if (withMonths.length > 0) {
    console.log(`   Top ejemplos con más tiempo de lectura:`);
    withMonths
      .sort((a, b) => b.reading_months - a.reading_months)
      .slice(0, 5)
      .forEach(m => {
        console.log(`   - "${m.title}": iniciado el ${m.started_at.slice(0, 10)} (${m.reading_months} meses leyendo)`);
      });
  }

  console.log(`\n📡 Subiendo al servidor en la nube: ${BACKEND_URL}/api/sync/backup ...`);

  // Split history into chunks of 500 to avoid payload size limits if history is huge
  const CHUNK_SIZE = 500;
  const historyChunks = [];
  for (let i = 0; i < result.history.length; i += CHUNK_SIZE) {
    historyChunks.push(result.history.slice(i, i + CHUNK_SIZE));
  }

  // 1. Upload mangas with first history chunk
  const firstPayload = {
    backupManga: result.mangas,
    history: historyChunks.length > 0 ? historyChunks[0] : [],
  };

  const headers = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['X-API-KEY'] = API_KEY;

  const res1 = await fetch(`${BACKEND_URL}/api/sync/backup`, {
    method: 'POST',
    headers,
    body: JSON.stringify(firstPayload),
  });

  if (!res1.ok) {
    const errText = await res1.text();
    throw new Error(`Error en el servidor (${res1.status}): ${errText}`);
  }

  const json1 = await res1.json();
  console.log(`🎉 Biblioteca importada con éxito: ${json1.importedMangas} mangas.`);

  // 2. Upload remaining history chunks
  for (let i = 1; i < historyChunks.length; i++) {
    process.stdout.write(`   Subiendo bloque de historial ${i + 1}/${historyChunks.length}...\r`);
    await fetch(`${BACKEND_URL}/api/sync/backup`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        backupManga: [],
        history: historyChunks[i],
      }),
    });
  }

  console.log(`\n✨ ¡Todo el historial y la biblioteca han quedado guardados de forma persistente en la base de datos!`);
  console.log(`🌐 Puedes verlos ahora en: ${BACKEND_URL} y en tu APK móvil.`);
}

main().catch(err => {
  console.error('\n❌ Error al procesar:', err);
  process.exit(1);
});
