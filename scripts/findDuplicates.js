import fs from 'fs';

const raw = fs.readFileSync('./tracker-app/seed-data.json', 'utf-8');
const data = JSON.parse(raw);

const normalize = (t) =>
  String(t || '')
    .toLowerCase()
    .replace(/\s*\(\s*\d{4}\s*\)/g, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

const ALIAS_CANONICAL = {
  // La Ley del Inso
  'laleydelinso': 'laleydelinso',
  'insoslaw': 'laleydelinso',
  'mylifeasaninternetnovel': 'laleydelinso',
  
  // Operación: Amor Verdadero
  'operationnamepurelove': 'operacionamorverdadero',
  'pureloveoperation': 'operacionamorverdadero',
  'operacionamorverdadero': 'operacionamorverdadero',

  // Cómo conquistar a mi Marido
  'comohacerquemimaridoestedemilado': 'comoconquistaramimarido',
  'comoponeramiesposodemilado': 'comoconquistaramimarido',
  'comoconquistaramimarido': 'comoconquistaramimarido',
  'howtogetmyhusbandonmyside': 'comoconquistaramimarido',
  'howtowinmyhusbandover': 'comoconquistaramimarido',

  // A la amante de mi esposo/marido
  'alaamantedemimarido': 'alaamantedemiesposo',
  'alaamantedemiesposo': 'alaamantedemiesposo',

  // El Único Final De La Villana Es La Muerte
  'elunicofinaldelavillanaeslamuerte': 'elunicofinaldelavillanaeslamuerte',
  'deathistheonlyendingforthevillainess': 'elunicofinaldelavillanaeslamuerte',
  'villainsaredestinedtodie': 'elunicofinaldelavillanaeslamuerte',

  // Cómo Esconder Al Hijo Del Emperador
  'howtohidetheemperorschild': 'comoesconderalhijodelemperador',
  'comoesconderalhijodelemperador': 'comoesconderalhijodelemperador',

  // Me Convertí En La Esposa Del Protagonista Masculino
  'meconvertienlaesposadelprotagonistamasculino': 'meconvertienlaesposadelprotagonistamasculino',
  'ibecamethewifeofthemalelead': 'meconvertienlaesposadelprotagonistamasculino',
  'authorofmyowndestiny': 'meconvertienlaesposadelprotagonistamasculino',

  // Raeliana
  'larazonporlaqueraelianaterminoenlamansiondelduque': 'larazonporlaqueraelianaterminoenlamansiondelduque',
  'thereasonwhyraelianaendedupatthedukesmansion': 'larazonporlaqueraelianaterminoenlamansiondelduque',
};

function getCanonical(t) {
  const norm = normalize(t);
  return ALIAS_CANONICAL[norm] || norm;
}

const map = new Map();
for (const m of data.mangas) {
  const key = getCanonical(m.title);
  if (!map.has(key)) {
    map.set(key, []);
  }
  map.get(key).push(m);
}

const duplicates = [];
for (const [k, list] of map.entries()) {
  if (list.length > 1) {
    duplicates.push({ key: k, titles: list.map(x => x.title), ids: list.map(x => x.id) });
  }
}

console.log('Total unique canonical titles:', map.size, 'out of', data.mangas.length);
console.log('Found duplicate groups:', duplicates.length);
for (const d of duplicates.slice(0, 15)) {
  console.log(`- Key: ${d.key} (${d.titles.length} entries):`);
  for (const t of d.titles) console.log(`    * "${t}"`);
}
