import { readFile, writeFile, cp, mkdir, rm, readdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = `${root}dist`;
const origin = new URL(process.env.SITE_URL || `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || 'dude-studios.vercel.app'}`).origin;
const email = 'sarthak.work7@gmail.com';
const title = 'Dude Studios — Video Editing & Media Production Agency';
const description = 'Video editing and media production for creators, brands and agencies. Reels, YouTube videos, ads, motion graphics, trailers and full campaigns. Working worldwide.';
const booking = `mailto:${email}?subject=Project%20enquiry%20for%20Dude%20Studios`;
const socialUrls = ['https://instagram.com/', 'https://youtube.com/', 'https://www.linkedin.com/'];
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });
for (const path of ['nx', 'work', 'icon.svg', 'apple-icon.png', 'og.png']) await cp(`${root}${path}`, `${out}/${path}`, { recursive: true });
let html = await readFile(`${root}index.html`, 'utf8');
const oldSchema = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
const services = [
  ['short-form', 'Short-form video editing', 'Instagram Reels, YouTube Shorts, TikToks and ads up to 90 seconds.'],
  ['long-form', 'YouTube and long-form video editing', 'YouTube videos, podcasts and courses up to 20 minutes.'],
  ['motion-graphics', 'Motion graphics and animation', 'Motion graphics, kinetic typography, illustrated animation and 3D scenes.'],
  ['campaigns', 'Video advertising and campaign production', 'Concept, script, storyboard, shoot direction, hero films and platform versions.'],
  ['agency', 'White-label editing for agencies', 'Overflow editing and ad versioning under an agency’s brand.'],
];
const orgId = `${origin}/#studio`;
const serviceNodes = services.map(([id, name, text]) => ({ '@type': 'Service', '@id': `${origin}/#service-${id}`, name, description: text, serviceType: name, provider: { '@id': orgId }, areaServed: 'Worldwide', url: `${origin}/#${id === 'agency' ? 'faq' : id === 'campaigns' ? 'pricing' : 'work'}` }));
const schema = JSON.stringify({ '@context': 'https://schema.org', '@graph': [
  { '@type': 'Organization', '@id': orgId, name: 'Dude Studios', url: `${origin}/`, email, description, logo: { '@type': 'ImageObject', url: `${origin}/apple-icon.png` }, contactPoint: { '@type': 'ContactPoint', email, contactType: 'Project enquiries' }, hasOfferCatalog: { '@type': 'OfferCatalog', name: 'Video editing and media production services', itemListElement: serviceNodes.map(s => ({ '@type': 'Offer', itemOffered: { '@id': s['@id'] } })) } },
  { '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`, name: 'Dude Studios', publisher: { '@id': orgId }, inLanguage: 'en' },
  { '@type': 'WebPage', '@id': `${origin}/#webpage`, url: `${origin}/`, name: title, description, isPartOf: { '@id': `${origin}/#website` }, about: { '@id': orgId }, primaryImageOfPage: { '@type': 'ImageObject', url: `${origin}/og.png`, width: 1200, height: 630 }, inLanguage: 'en' },
  ...serviceNodes,
  { ...oldSchema['@graph'].find(n => n['@type'] === 'FAQPage'), '@id': `${origin}/#faq`, url: `${origin}/#faq`, isPartOf: { '@id': `${origin}/#webpage` } },
] });

// Normalize the exporter’s nested document without changing its style cascade.
const wrapperStyle = html.match(/<style>(.*?)<\/style>/s)[1];
html = html.slice(html.indexOf('<!DOCTYPE html>')).replace(/\n<\/body><\/html>\s*$/, '');
html = html.replace('<head>', `<head><style>${wrapperStyle}</style>`);
html = html.replace('<title>Dude Studios Website</title>', `<title>${title}</title>`);
const oldDescription = oldSchema['@graph'][0].description;
function common(s) {
  return s.replaceAll('https://dudestudios.in', origin)
    .replaceAll('hello@dudestudios.in', email)
    .replaceAll('https://cal.com/your-handle/15min', booking)
    .replaceAll('Dude Studios — Video editing for creators and brands', title)
    .replaceAll("Dude Studios — We don't just cut. We craft.", title)
    .replaceAll('Dude Studios — We don&#x27;t just cut. We craft.', title)
    .replaceAll(oldDescription, description);
}
html = common(html);
html = html.replace(/<meta name="twitter:title" content="Dude Studios"\/>/, `<meta name="twitter:title" content="${title}"/>`);
html = html.replace(/<a([^>]*?) href="(https:\/\/instagram.com\/|https:\/\/youtube.com\/|https:\/\/www.linkedin.com\/)"([^>]*)>/g, '<a$1 aria-disabled="true" tabindex="-1"$3>');
html = html.replace(/<script type="application\/ld\+json">.*?<\/script>/s, `<script type="application/ld+json">${schema}</script>`);

// Next’s flight payload must match the initial HTML so hydration retains SEO.
html = html.replace(/<script>self\.__next_f\.push\((.*?)\)<\/script>/gs, (match, json) => {
  const args = JSON.parse(json);
  if (args[0] !== 1) return match;
  let data = args[1];
  if (data.startsWith('{"@context":"https://schema.org"')) data = schema;
  else {
    data = common(data).replace(/4:T[0-9a-f]+,/, `4:T${Buffer.byteLength(schema).toString(16)},`);
    for (const url of socialUrls) data = data.replaceAll(`"href":"${url}"`, '"aria-disabled":true,"tabIndex":-1');
    data = data.replace('"name":"twitter:title","content":"Dude Studios"', `"name":"twitter:title","content":"${title}"`);
  }
  args[1] = data;
  return `<script>self.__next_f.push(${JSON.stringify(args).replaceAll('<', '\\u003c')})</script>`;
});

// Offscreen hero clips wait for the existing visibility observer to start them.
html = html.replaceAll('preload="metadata"', 'preload="none"');
const pagePath = 'nx/static/chunks/app/page-4046aaae194bc1dd.js';
let page = common(await readFile(`${out}/${pagePath}`, 'utf8'));
page = page.replace('preload:r<n.length?"metadata":"none"', 'preload:"none"');
for (const url of socialUrls) page = page.replaceAll(`href:"${url}"`, 'href:void 0');
await writeFile(`${out}/${pagePath}`, page);
const cssPath = 'nx/static/css/a0772ffefcd6fb82.css';
let css = (await readFile(`${out}/${cssPath}`, 'utf8')).replace(/,url\([^)]*\.woff\) format\("woff"\)/g, '');
// These hashed names are content-addressed again after any change.
for (const [path, data] of [[pagePath, page], [cssPath, css]]) {
  const hash = createHash('sha256').update(data).digest('hex').slice(0,16);
  const revised = path.replace(/[0-9a-f]{16}(?=\.(js|css)$)/, hash);
  if (revised !== path) {
    await writeFile(`${out}/${revised}`, data);
    await rm(`${out}/${path}`);
    html = html.replaceAll(path.split('/').at(-1), revised.split('/').at(-1));
  }
}
const additions = `<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"/>`+
  `<meta property="og:locale" content="en_US"/><meta name="twitter:image:alt" content="Dude Studios video editing and media production"/>`+
  `<link rel="alternate" type="text/markdown" href="${origin}/llms.txt" title="Dude Studios information"/>`+
  `<link rel="preload" href="/nx/static/media/archivo-latin-wdth-normal.8eca89c0.woff2" as="font" type="font/woff2" crossorigin/>`+
  `<link rel="preload" href="/nx/static/media/jetbrains-mono-latin-400-normal.db9d659a.woff2" as="font" type="font/woff2" crossorigin/>`+
  `<noscript><style>.pre{display:none!important}</style></noscript>`;
html = html.replace('</head>', `${additions}</head>`);
await writeFile(`${out}/index.html`, html);
await writeFile(`${out}/robots.txt`, `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
await writeFile(`${out}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>\n`);
await writeFile(`${out}/llms.txt`, `# Dude Studios\n\n> Video editing and media production studio for creators, brands and agencies. Working worldwide.\n\n## Official source\n- [Website](${origin}/): Portfolio, services, process, pricing and FAQs.\n- [Work](${origin}/#work): 19 editing samples across short-form, advertising, trailers, motion graphics and YouTube.\n- [Process](${origin}/#process): Pick a plan, share footage and a brief, review the edit, receive platform exports.\n- [Pricing](${origin}/#pricing): Pack and monthly options. Prices on this website are drafts and must be confirmed with the studio.\n- [FAQs](${origin}/#faq): Revisions, turnaround, feedback, footage sharing and agency work.\n\n## Services and delivery\nShort-form edits cover Reels, Shorts, TikToks and ads up to 90 seconds. Long-form covers YouTube, podcasts and courses up to 20 minutes. Complex editing includes pacing and motion graphics. Full campaigns include concept, script, storyboard, shoot direction, hero films and platform versions. White-label agency work is available.\n\nShort-form first edits are listed at 48–72 hours. Simple long-form first edits are listed at 4–5 days. Two revision rounds are included per video; feedback is due within 14 days. Packs are valid for 60 days. Confirm project timing and prices directly.\n\n## Contact\nEmail: ${email}\nNo official social profiles are currently published.\n`);
console.log(`Built static site for ${origin}`);
