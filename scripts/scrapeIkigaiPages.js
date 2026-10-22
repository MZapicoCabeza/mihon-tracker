import fs from 'fs';

const BASE_URL = 'https://visualikigai.cmpunjabrashancard.pk';

async function fetchIkigaiCatalog(maxPages = 30) {
  const catalog = new Map();

  for (let page = 1; page <= maxPages; page++) {
    const url = `${BASE_URL}/series?pagina=${page}`;
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        }
      });
      if (!res.ok) {
        console.warn(`Page ${page} status: ${res.status}`);
        break;
      }
      const html = await res.text();

      const cardRegex = /<li[^>]*>([\s\S]*?)<\/li>/gi;
      let count = 0;
      for (const m of html.matchAll(cardRegex)) {
        const block = m[1];
        if (block.includes('<h3')) {
          const title = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i)?.[1]?.replace(/<[^>]+>/g, '')?.trim();
          const cover = block.match(/<img[^>]+src="([^"]+)"/i)?.[1];
          const link = block.match(/<a[^>]+href="([^"]+)"/i)?.[1];

          if (title && cover) {
            const key = title.toLowerCase().replace(/[^a-z0-9]/g, '');
            catalog.set(key, {
              title,
              cover,
              link: link?.startsWith('http') ? link : `${BASE_URL}${link}`,
            });
            count++;
          }
        }
      }
      if (count === 0) {
        console.log(`Reached end of pages at page ${page}`);
        break;
      }
      console.log(`Page ${page}: +${count} series. Total: ${catalog.size}`);
    } catch (e) {
      console.error(`Page ${page} error:`, e.message);
      break;
    }
  }

  return catalog;
}

const cat = await fetchIkigaiCatalog(30);
console.log('Final full catalog size from visualikigai:', cat.size);
fs.writeFileSync('./tracker-app/scripts/ikigaiFullCatalog.json', JSON.stringify([...cat.entries()], null, 2));
