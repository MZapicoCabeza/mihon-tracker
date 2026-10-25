import fs from 'fs';

const BASE_URL = 'https://visualikigai.cmpunjabrashancard.pk';

async function checkInso() {
  const url = `${BASE_URL}/series?buscar=Inso`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const html = await res.text();

  const idx = html.toLowerCase().indexOf('inso');
  console.log('Index of inso:', idx);
  if (idx !== -1) {
    console.log(html.slice(Math.max(0, idx - 150), idx + 250));
  }
}

checkInso().catch(console.error);
