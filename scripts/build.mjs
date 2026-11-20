// Builds apps.json from the GVW Web Studio developer page on Google Play.
// Runs daily in GitHub Actions; only apps that are live on Play are listed.
import fs from 'node:fs';
const DEV_IDS = ['7947668601959974413'];
const UA = { 'User-Agent': 'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36', 'Accept-Language': 'en' };
const get = async (u) => { for (let i = 0; i < 4; i++) { try { const r = await fetch(u, { headers: UA }); if (r.ok) return await r.text(); } catch {} await new Promise((r) => setTimeout(r, 3000 * (i + 1))); } return null; };
const dec = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const meta = (h, p) => { const m = h.match(new RegExp(`<meta[^>]+(?:property|name)="${p}"[^>]+content="([^"]*)"`)); return m ? dec(m[1]) : undefined; };

const TOPICS = [
  ['card', /\b(card|cards|solitaire|patience|callbreak|call break|twenty ?nine|\b29\b|tash|taas)\b/i],
  ['big-cards', /\b(big|large|huge) cards?\b/i],
  ['trick-taking', /\b(trick|tricks|callbreak|call break|twenty ?nine|bid|bidding)\b/i],
  ['board', /\b(board game|ludo|guti|bagh|chess|checkers|carrom)\b/i],
  ['traditional', /\b(traditional|bengali|bangla|desi|deshi|sholo|bagh|nepal|heritage)\b/i],
  ['strategy', /\b(strategy|war|fort|tower defen[cs]e|battle)\b/i],
  ['word', /\b(word|words|wordle|spelling)\b/i],
  ['puzzle', /\b(puzzle|puzzles|riddle)\b/i],
  ['islamic', /\b(islamic|quran|qur'an|prayer|salah|namaz|azan|adhan|qibla|ramadan|sehri|iftar)\b/i],
  ['alarm', /\b(alarm|wake up)\b/i],
  ['clock', /\b(clock|time widget|world time|timezone)\b/i],
  ['pet', /\b(pet|pets|vet|dog|cat)\b/i],
  ['local', /\b(directory|local news|city guide|habiganj|tuition|rent)\b/i],
];
const topicsOf = (text) => TOPICS.filter(([, rx]) => rx.test(text)).map(([t]) => t);

const ids = new Set();
for (const dev of DEV_IDS) {
  const html = await get(`https://play.google.com/store/apps/dev?id=${dev}&hl=en`);
  if (!html) continue;
  for (const m of html.matchAll(/\/store\/apps\/details\?id=([\w.]+)/g)) ids.add(m[1]);
}
const over = JSON.parse(fs.readFileSync('overrides.json', 'utf8'));
const old = fs.existsSync('apps.json') ? JSON.parse(fs.readFileSync('apps.json', 'utf8')).apps : [];
const apps = [];
for (const id of ids) {
  const h = await get(`https://play.google.com/store/apps/details?id=${id}&hl=en`);
  const prev = old.find((a) => a.id === id) ?? {};
  if (!h) { if (prev.id) apps.push(prev); continue; }
  let ld = {};
  for (const m of h.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) { try { const j = JSON.parse(m[1]); if (j['@type'] === 'SoftwareApplication') ld = j; } catch {} }
  const title = ld.name ?? meta(h, 'og:title')?.replace(/ - Apps on Google Play$/, '') ?? prev.title ?? id;
  const desc = meta(h, 'description') ?? ld.description ?? '';
  const genre = ld.applicationCategory ?? prev.genre;
  const img = ld.image ?? meta(h, 'og:image');
  const icon = img ? img.replace(/=[swh]\d+.*$/, '') + '=s128' : prev.icon;
  const short = desc.split(/(?<=[.!?])\s/)[0].slice(0, 110);
  const langs = /[\u0980-\u09ff]/.test(title + desc) || /\bbangla|bengali\b/i.test(title + desc) ? ['bn', 'en'] : ['en'];
  apps.push({ id, title, short, icon, genre, game: /^GAME/.test(genre ?? ''), topics: topicsOf(`${title} ${desc}`), langs, ...(over[id] ?? {}) });
}
if (apps.length === 0) { console.error('No apps found; keeping old apps.json'); process.exit(0); }
apps.sort((a, b) => a.title.localeCompare(b.title));
fs.writeFileSync('apps.json', JSON.stringify({ updated: new Date().toISOString().slice(0, 10), apps }, null, 1) + '\n');
console.log(`apps.json: ${apps.length} apps`, apps.map((a) => a.id).join(', '));
