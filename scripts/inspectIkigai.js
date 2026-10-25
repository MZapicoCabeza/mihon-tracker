import fs from 'fs';
import path from 'path';

const htmlDir = 'c:/Users/maria/Documents/Textual_C1/Web Scrapping/Estudiar/Ikigai/html';
const files = fs.readdirSync(htmlDir).filter(f => f.endsWith('.html'));

console.log('Total HTML files in Ikigai folder:', files.length);

const foundCovers = [];

for (const file of files) {
  const fullPath = path.join(htmlDir, file);
  const content = fs.readFileSync(fullPath, 'utf-8');

  // Look for series cards or detail page header
  // 1. Detail page pattern:
  const titleMatch = content.match(/<h1[^>]*class=[^>]*>([\s\S]*?)<\/h1>/i) || content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const coverMatch = content.match(/<img[^>]+(?:class="[^"]*rounded[^"]*"|alt="[^"]*")[^>]+src="([^"]+)"/i) || content.match(/<img[^>]+src="([^"]+)"[^>]+(?:class="[^"]*rounded[^"]*"|alt="[^"]*")/i);

  if (titleMatch && coverMatch) {
    foundCovers.push({
      file,
      title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
      cover: coverMatch[1],
    });
  }
}

console.log('Found detail covers:', foundCovers.length);
for (const item of foundCovers.slice(0, 10)) {
  console.log(`- "${item.title}": ${item.cover}`);
}
