import fs from 'fs';

const BASE_URL = 'https://visualikigai.cmpunjabrashancard.pk';

async function testIkigai() {
  console.log('Testing Ikigai search/series on:', BASE_URL);

  // 1. Fetch homepage or search
  const res = await fetch(`${BASE_URL}/series?pagina=1`, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    }
  });

  console.log('Series page status:', res.status);
  const html = await res.text();
  console.log('Length of HTML:', html.length);

  // Look for series cards and image URLs
  const imgMatches = [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:jpg|jpeg|png|webp)/gi)].map(m => m[0]);
  console.log('Found image URLs on series page:', imgMatches.length);
  for (const img of imgMatches.slice(0, 5)) {
    console.log(' - Image:', img);
  }

  // Look for API calls or json endpoints in HTML
  const apiMatches = [...html.matchAll(/\/api\/[a-zA-Z0-9_/.-]+/gi)].map(m => m[0]);
  console.log('Found API endpoints in HTML:', apiMatches);
}

testIkigai().catch(console.error);
