const fs = require('fs');
const path = require('path');

const root = process.cwd();
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const esc = s => String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const xml = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
const imageUrl = u => {
  u = String(u || '');
  return /^https?:\/\//i.test(u) ? u : 'https://manganewworld.github.io/' + u.replace(/^\/+/, '');
};
const dateOnly = value => {
  if (!value) return '';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};

const content = readJson('data/content.json');
const mangaList = Array.isArray(content.mangas) ? content.mangas : [];
const sources = [
  content.chapters || [],
  readJson('data/manual-chapters.json').chapters || [],
  readJson('data/upcoming-chapters.json').chapters || [],
  readJson('data/extra-chapters.json').chapters || []
];
const bySlug = new Map();
for (const list of sources) {
  for (const c of list) {
    if (!c || !String(c.slug || '').trim()) continue;
    const slug = String(c.slug).trim();
    // Prefer published/manual records over a duplicate placeholder record.
    if (!bySlug.has(slug) || c.pages?.length) bySlug.set(slug, c);
  }
}
const chapters = [...bySlug.values()].sort((a, b) =>
  Date.parse(b.updatedAt || b.updated_at || b.createdAt || b.created_at || 0) -
  Date.parse(a.updatedAt || a.updated_at || a.createdAt || a.created_at || 0)
);

fs.rmSync(path.join(root, 'chapters'), { recursive: true, force: true });

for (const c of chapters) {
  const slug = String(c.slug).trim();
  const title = String(c.title || ('Chapter ' + (c.number ?? ''))).trim();
  const canonical = 'https://manganewworld.github.io/chapters/' + encodeURIComponent(slug) + '/';
  const imgs = (Array.isArray(c.pages) ? c.pages : [])
    .map(p => typeof p === 'string' ? p : (p?.url || p?.path || p?.src || ''))
    .filter(Boolean)
    .map(imageUrl);
  const body = imgs.length
    ? imgs.map((u, i) => '<img class="page" src="' + esc(u) + '" alt="' + esc(title) + ' page ' + (i + 1) + '" loading="' + (i < 2 ? 'eager' : 'lazy') + '" decoding="async">').join('')
    : '<div class="coming"><h1>' + esc(title) + '</h1><p>Chapter information is available on MangaGoAtlas.</p></div>';
  const firstImage = imgs[0] || '';
  const description = 'Read ' + title + ' on MangaGoAtlas. Chapter ' + (c.number ?? '') + ' with manga release details and page images.';
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: canonical,
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    publisher: { '@type': 'Organization', name: 'MangaGoAtlas', url: 'https://manganewworld.github.io/' }
  };
  if (firstImage) ld.image = [firstImage];
  const published = dateOnly(c.createdAt || c.created_at || c.publishedAt || c.published_at);
  const modified = dateOnly(c.updatedAt || c.updated_at || c.createdAt || c.created_at);
  if (published) ld.datePublished = published;
  if (modified) ld.dateModified = modified;

  const html = '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="' + canonical + '"><title>' + esc(title) + ' | MangaGoAtlas</title><meta name="description" content="' + esc(description) + '"><meta property="og:type" content="article"><meta property="og:site_name" content="MangaGoAtlas"><meta property="og:title" content="' + esc(title) + ' | MangaGoAtlas"><meta property="og:description" content="' + esc(description) + '"><meta property="og:url" content="' + canonical + '">' + (firstImage ? '<meta property="og:image" content="' + esc(firstImage) + '">' : '') + '<script type="application/ld+json">' + JSON.stringify(ld) + '</script><style>*{box-sizing:border-box}body{margin:0;background:#07080b;color:#f5f5f7;font-family:Arial,system-ui,sans-serif}.bar{padding:14px 5%;border-bottom:1px solid #222733;background:#0c0e13}.bar a{color:#b7bdc9;text-decoration:none}.copy{max-width:1000px;margin:auto;padding:30px 5% 18px}.copy h1{margin:0 0 10px;line-height:1.25}.copy p{color:#aeb6c4;line-height:1.7}.reader{max-width:1000px;margin:auto}.page{display:block;width:100%;height:auto;margin:0 auto}.coming{margin:50px 5%;padding:30px;border:1px solid #2d3a4d;border-radius:16px;text-align:center}.related{max-width:900px;margin:30px auto 70px;padding:24px 5%;color:#aeb6c4}</style><script src="/analytics.js"></script></head><body><header class="bar"><a href="/">← MangaGoAtlas</a></header><main><section class="copy"><h1>' + esc(title) + '</h1><p>' + esc(description) + '</p></section><div class="reader">' + body + '</div><section class="related">MangaGoAtlas chapter page · ' + esc(title) + '</section></main></body></html>';

  const dir = path.join(root, 'chapters', slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

const base = 'https://manganewworld.github.io';
const fixed = [
  base + '/',
  base + '/latest-chapters.html',
  base + '/manga.html',
  base + '/country.html',
  base + '/japan-blog.html',
  base + '/france-blog.html',
  base + '/blog.html'
];
const urlEntries = new Map();
for (const loc of fixed) urlEntries.set(loc, { loc });

for (const m of mangaList) {
  const slug = String(m.slug || m.id || '').trim();
  if (!slug) continue;
  const loc = base + '/manga.html?slug=' + encodeURIComponent(slug);
  const lastmod = dateOnly(m.updated_at || m.updatedAt || m.created_at || m.createdAt);
  urlEntries.set(loc, { loc, lastmod });
}
for (const c of chapters) {
  const slug = String(c.slug).trim();
  const loc = base + '/chapters/' + encodeURIComponent(slug) + '/';
  const lastmod = dateOnly(c.updatedAt || c.updated_at || c.createdAt || c.created_at || c.publishedAt || c.published_at);
  const imgs = (Array.isArray(c.pages) ? c.pages : [])
    .map(p => typeof p === 'string' ? p : (p?.url || p?.path || p?.src || ''))
    .filter(Boolean)
    .map(imageUrl);
  urlEntries.set(loc, { loc, lastmod, title: String(c.title || ('Chapter ' + (c.number ?? ''))), images: imgs });
}

const urls = [...urlEntries.values()].map(entry => {
  let out = '<url><loc>' + xml(entry.loc) + '</loc>';
  if (entry.lastmod) out += '<lastmod>' + entry.lastmod + '</lastmod>';
  for (const img of entry.images || []) {
    out += '<image:image><image:loc>' + xml(img) + '</image:loc>';
    if (entry.title) out += '<image:title>' + xml(entry.title) + '</image:title>';
    out += '</image:image>';
  }
  return out + '</url>';
});
fs.writeFileSync(path.join(root, 'sitemap.xml'),
  '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n  ' +
  urls.join('\n  ') + '\n</urlset>\n');

const latestPath = path.join(root, 'latest-chapters.html');
if (fs.existsSync(latestPath)) {
  let html = fs.readFileSync(latestPath, 'utf8');
  const published = chapters.filter(c => Array.isArray(c.pages) && c.pages.length);
  const staticLinks = published.length
    ? published.map(c => {
        const slug = String(c.slug).trim();
        const title = String(c.title || ('Chapter ' + (c.number ?? ''))).trim();
        const manga = String(c.mangaTitle || c.mangaName || c.manga || c.mangaId || 'Manga');
        return '<a href="/chapters/' + encodeURIComponent(slug) + '/">' + esc(title) + '<small>' + esc(manga) + ' · Open chapter</small></a>';
      }).join('')
    : 'No chapters published yet. New listings will appear here when available.';
  html = html.replace(/<div class="static-list(?: empty)?" aria-label="Latest manga chapter links">[\s\S]*?<\/div>/,
    '<div class="static-list' + (published.length ? '' : ' empty') + '" aria-label="Latest manga chapter links">' + staticLinks + '</div>');
  html = html.replace(/href="\/chapter\.html\?slug='([^"]*)'"/g, (match, slug) => 'href="/chapter.html?slug=' + slug + '"');
  fs.writeFileSync(latestPath, html);
}

console.log('Generated ' + chapters.length + ' static chapter pages and rebuilt sitemap with ' + urlEntries.size + ' URLs.');
