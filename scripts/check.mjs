import assert from 'node:assert/strict';
import { readFile, access, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = resolve(root, 'dist');
const html = await readFile(resolve(dist, 'index.html'), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
let checks = 0;
function check(condition, message) {
  assert.ok(condition, message);
  checks++;
}

for (const name of ['html', 'head', 'body', 'title']) {
  check([...html.matchAll(new RegExp(`<${name}(?=[\\s>])`, 'gi'))].length === 1,
    `Expected one ${name} element`);
}
check(/<html lang="en">/.test(html), 'Document language is missing');
check(/<noscript><style>\.pre\{display:none!important\}<\/style><\/noscript>/.test(html),
  'Preloader must not obscure the website without JavaScript');

const flight = [...html.matchAll(/<script>self\.__next_f\.push\((.*?)\)<\/script>/gs)]
  .map(match => JSON.parse(match[1]))
  .filter(args => args[0] === 1)
  .map(args => args[1]);
const flightSchema = flight.filter(chunk => chunk.startsWith('{"@context":"https://schema.org"'));
const schemaText = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1];
check(Boolean(schemaText), 'Structured data is missing');
check(flightSchema.length === 1 && flightSchema[0] === schemaText,
  'Initial structured data and Next.js hydration payload differ');
const schemaLength = flight.join('').match(/4:T([0-9a-f]+),/);
check(Boolean(schemaLength) && parseInt(schemaLength[1], 16) === Buffer.byteLength(schemaText),
  'Next.js text row advertises an incorrect UTF-8 byte length');
const schema = JSON.parse(schemaText);
const metadataChunk = flight.find(chunk => chunk.startsWith('1d:'));
check(Boolean(metadataChunk), 'Next.js metadata payload is missing');
const metadata = JSON.parse(metadataChunk.slice(3)).metadata;
const canonical = html.match(/<link rel="canonical" href="([^"]+)"\/>/)?.[1];
const origin = new URL(canonical).origin;
const title = html.match(/<title>(.*?)<\/title>/s)?.[1];
check(metadata.find(node => node[1] === 'title')?.[3].children === title,
  'Hydration would restore an outdated page title');
for (const key of ['description', 'twitter:title', 'twitter:description', 'twitter:image',
  'og:title', 'og:description', 'og:url', 'og:image']) {
  const node = metadata.find(item => item[3]?.name === key || item[3]?.property === key);
  const initial = html.match(new RegExp(`<meta (?:name|property)="${key}" content="([^"]*)"\\/>`));
  check(Boolean(initial) && initial[1] === node?.[3]?.content,
    `Initial ${key} metadata differs from hydration metadata`);
}
check(metadata.find(node => node[3]?.rel === 'canonical')?.[3].href === canonical,
  'Hydration would restore an outdated canonical URL');
check(schema['@graph'].find(node => node['@type'] === 'WebPage')?.url === canonical,
  'Structured data URL differs from the canonical URL');
const graphIds = new Set(schema['@graph'].map(node => node['@id']));
function verifyIds(value) {
  if (!value || typeof value !== 'object') return;
  if (value['@id']) check(graphIds.has(value['@id']), `Unresolved schema reference ${value['@id']}`);
  Object.values(value).forEach(verifyIds);
}
verifyIds(schema);

check([...html.matchAll(/<video\b/g)].length === 35, 'Original video layout has changed');
check([...html.matchAll(/data-card="true"/g)].length === 19, 'Original portfolio card count has changed');
check(!html.includes('preload="metadata"'), 'Offscreen video metadata preloading remains');
for (const placeholder of ['https://dudestudios.in', 'hello@dudestudios.in',
  'https://cal.com/your-handle/15min', 'https://instagram.com/', 'https://youtube.com/',
  'https://www.linkedin.com/']) {
  check(!html.includes(placeholder), `Obsolete placeholder remains: ${placeholder}`);
}
const localRefs = new Set([
  ...[...html.matchAll(/(?:src|poster|href)="([^"]+)"/g)].map(match => match[1]),
  ...[...html.matchAll(/background-image:url\(([^)]+)\)/g)].map(match => match[1]),
]);
for (const reference of localRefs) {
  if (reference.startsWith('#') || /^[a-z][a-z0-9+.-]*:/i.test(reference)) continue;
  const path = reference.split(/[?#]/)[0].replace(/^\//, '');
  await access(resolve(dist, path));
  checks++;
}
for (const reference of new Set([...flight.join('').matchAll(/static\/(?:chunks|css)\/[a-zA-Z0-9_/.-]+\.(?:js|css)/g)].map(m => m[0]))) {
  await access(resolve(dist, 'nx', reference));
  checks++;
}
const cssName = html.match(/href="\.\/nx\/static\/css\/([^"]+)"/)?.[1];
const css = await readFile(resolve(dist, 'nx/static/css', cssName), 'utf8');
check(cssName === `${digest(css).slice(0, 16)}.css`, 'Modified CSS filename is not content-addressed');
for (const match of css.matchAll(/url\(([^)]+)\)/g)) {
  const ref = match[1].replace(/^['"]|['"]$/g, '');
  if (/^(?:data:|#)/.test(ref)) continue;
  await access(resolve(dist, 'nx/static/css', ref));
  checks++;
}
check(!css.includes('.woff)'), 'Unavailable legacy font fallbacks remain');
const pageNames = (await readdir(resolve(dist, 'nx/static/chunks/app'))).filter(name => /^page-.*\.js$/.test(name));
check(pageNames.length === 1, 'Expected one page bundle');
const page = await readFile(resolve(dist, 'nx/static/chunks/app', pageNames[0]), 'utf8');
check(pageNames[0] === `page-${digest(page).slice(0, 16)}.js`, 'Modified page bundle filename is not content-addressed');
check(page.includes('preload:"none"') && !page.includes('preload:r<n.length?"metadata":"none"'),
  'Hydration would restore hero metadata preloading');
for (const name of await readdir(resolve(root, 'work'))) {
  if (!/\.(?:jpg|mp4)$/.test(name)) continue;
  const [original, built] = await Promise.all([
    readFile(resolve(root, 'work', name)), readFile(resolve(dist, 'work', name)),
  ]);
  check(digest(original) === digest(built), `Original portfolio media changed: ${name}`);
}
for (const name of ['robots.txt', 'sitemap.xml', 'llms.txt']) {
  const text = await readFile(resolve(dist, name), 'utf8');
  check(text.includes(origin), `${name} differs from the canonical origin`);
}
const originalCss = await readFile(resolve(root, 'nx/static/css/a0772ffefcd6fb82.css'), 'utf8');
check(css === originalCss.replace(/,url\([^)]*\.woff\) format\("woff"\)/g, ''),
  'CSS changed beyond removing unavailable font fallbacks');
console.log(`Passed ${checks} static checks: HTML, hydration metadata, structured data, assets, media, CSS and crawler files.`);
