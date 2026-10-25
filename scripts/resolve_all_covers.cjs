const https = require('https');

function searchMangaDex(query) {
  return new Promise((resolve) => {
    const url = 'https://api.mangadex.org/manga?title=' + encodeURIComponent(query) + '&limit=3&includes[]=cover_art';
    const req = https.get(url, { headers: { 'User-Agent': 'MihonTracker/1.0' }, timeout: 8000 }, (res) => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => {
        try {
          const j = JSON.parse(d);
          if (!j.data || j.data.length === 0) return resolve(null);
          for (const item of j.data) {
            const coverRel = item.relationships?.find(r => r.type === 'cover_art');
            const file = coverRel?.attributes?.fileName;
            if (file) {
              return resolve({
                id: item.id,
                title: item.attributes?.title?.en || Object.values(item.attributes?.title || {})[0] || query,
                cover: `https://uploads.mangadex.org/covers/${item.id}/${file}`
              });
            }
          }
          resolve(null);
        } catch(e) { resolve(null); }
      });
    });
    req.on('error', () => resolve(null));
    req.on('timeout', () => { req.destroy(); resolve(null); });
  });
}

const titlesToSearch = [
  { original: 'Falle al divorciarme de mi esposo', queries: ['I Failed to Oust the Villain', 'I Failed to Divorce My Husband'] },
  { original: 'ONE PIECE - Digital Colored Comics', queries: ['One Piece Digital Colored', 'One Piece'] },
  { original: "President's contract lover", queries: ["President's Contract Lover"] },
  { original: 'Yubisaki to Renren', queries: ['Yubisaki to Renren', 'A Sign of Affection'] },
  { original: 'Mi primer amor regreso en un futuro', queries: ['My First Love Came Back', 'Mi primer amor regreso'] },
  { original: 'Elimina a la Dama Villana.', queries: ['Kill the Villainess'] },
  { original: 'Matrimonio Real', queries: ['Royal Marriage'] },
  { original: 'Las flores del cerezo después del invierno 2', queries: ['Cherry Blossoms After Winter'] },
  { original: 'Your wish is my command!', queries: ['Your Wish Is My Command'] },
  { original: 'GIVEN', queries: ['Given'] },
  { original: 'No Better Than Strangers', queries: ['No Better Than Strangers'] },
  { original: 'Cariño, hoy voy hacer huelga', queries: ['Honey, I\'m Going On Strike', 'Honey I Am On A Strike', 'Honey, I\'m On Strike'] },
  { original: 'LAS CIRCUNSTANCIAS DE JOOIN', queries: ['Jooin\'s Circumstances', 'The Circumstances of Jooin', 'Jooin'] },
  { original: 'La Autora Piensa Que La Villana Es Común', queries: ['The Author Thinks The Villainess Is Common', 'I Thought It Was a Common Possession'] },
  { original: 'Watashi No Cosmic Monster', queries: ['Watashi no Cosmic Monster'] },
  { original: 'Marido Villano, con la que estas obsesionado esta en otra parte', queries: ['Villainous Husband, the One You\'re Obsessed With Is Over There', 'Villainous Husband'] },
  { original: 'La prometida obsidiana', queries: ['Obsidian Bride', 'The Obsidian Bride'] },
  { original: 'Si besas a un dios con los ojos vendados', queries: ['If You Kiss a God While Blindfolded', 'Blindfolded God'] },
  { original: 'Una vez mas hacia luz', queries: ['Into the Light Once Again'] },
  { original: 'El héroe de la dama malvada', queries: ['The Evil Lady\'s Hero', 'Evil Lady\'s Hero'] },
  { original: 'La doble vida del Rey Demonio ( 2021 )', queries: ['The Double Life of the Demon King', 'Double Life of the Demon King'] },
  { original: 'EL REY DE LA TIERRA', queries: ['King the Land'] },
  { original: 'Couple Breaker', queries: ['Couple Breaker'] },
  { original: 'Vestir a Julieta ( 2023 )', queries: ['To Dress Up Him', 'Dressing Up Juliet'] },
  { original: 'Me Convertí En La Rival De Los Protagonistas', queries: ['I Became the Male Lead\'s Female Friend', 'I Became the Rival of the Male Lead'] }
];

(async () => {
  const results = {};
  for (const item of titlesToSearch) {
    let found = null;
    for (const q of item.queries) {
      found = await searchMangaDex(q);
      if (found) break;
      await new Promise(r => setTimeout(r, 200));
    }
    results[item.original] = found ? found.cover : null;
    console.log(`${item.original} => ${found ? found.cover : 'NOT FOUND'}`);
    await new Promise(r => setTimeout(r, 250));
  }
  require('fs').writeFileSync('c:/Users/maria/Documents/mihon/tracker-app/scripts/resolvedMangaDexCovers.json', JSON.stringify(results, null, 2));
})();
