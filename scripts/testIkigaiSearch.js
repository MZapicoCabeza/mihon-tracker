import fs from 'fs';

const BASE_URL = 'https://visualikigai.cmpunjabrashancard.pk';

async function testSearch(query) {
  // Try several query parameters
  for (const param of ['buscar', 'q', 'search', 'nombre', 'title']) {
    try {
      const url = `${BASE_URL}/series?${param}=${encodeURIComponent(query)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        }
      });
      const html = await res.text();
      const hasMatch = html.toLowerCase().includes(query.toLowerCase());
      console.log(`Param "${param}": Status ${res.status}, Length ${html.length}, Contains "${query}": ${hasMatch}`);
    } catch (e) {
      console.error(param, e.message);
    }
  }
}

testSearch('Inso').catch(console.error);
