import fs from 'fs';

const BASE_URL = 'https://visualikigai.cmpunjabrashancard.pk';

async function checkInso() {
  const url = `${BASE_URL}/series?buscar=Inso`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();

  // Find cards
  const cards = [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/gi)];
  console.log('Cards found:', cards.length);
  for (const c of cards) {
    if (c[1].includes('<h3') && c[1].toLowerCase().includes('inso')) {
      const title = c[1].match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]?.trim();
      const img = c[1].match(/<img[^>]+src="([^"]+)"/i)?.[1];
      const link = c[1].match(/<a[^>]+href="([^"]+)"/i)?.[1];
      console.log('Found Inso card:');
      console.log('  Title:', title);
      console.log('  Cover:', img);
      console.log('  Link:', link);
    }
  }
}

checkInso().catch(console.error);
