import json, re, shutil, zipfile
from pathlib import Path

archive = Path("MangaGoAtlas-Site-No-Chapters (5).zip")
if not archive.is_file():
    raise SystemExit("Source ZIP not found")
tmp = Path(".mangogoatlas-extract")
shutil.rmtree(tmp, ignore_errors=True)
tmp.mkdir()
with zipfile.ZipFile(archive) as z:
    z.extractall(tmp)
source = tmp / "MangaGoAtlas"
if not source.is_dir():
    raise SystemExit("MangaGoAtlas folder missing from ZIP")
for item in source.iterdir():
    target = Path(item.name)
    if target.is_dir():
        if target.exists():
            shutil.rmtree(target)
        shutil.copytree(item, target)
    else:
        shutil.copy2(item, target)
shutil.rmtree(tmp)

p = Path("index.html")
s = p.read_text(encoding="utf-8")
s, n = re.subn(r'<main id="app" class="section">.*?</main>',
    '<main id="app" class="section"><div class="empty">No latest chapters found.</div></main>',
    s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("Homepage chapter block not found")
if ".empty{" not in s:
    s = s.replace("</style>", ".empty{padding:32px;border:1px dashed #303340;border-radius:12px;color:#9296a5;text-align:center}</style>", 1)
p.write_text(s, encoding="utf-8")

p = Path("latest-chapters.html")
s = p.read_text(encoding="utf-8")
s, n = re.subn(r'<div class="static-list" aria-label="Latest manga chapter links">.*?</div>',
    '<div class="static-list empty" aria-label="Latest manga chapter links">No chapters published yet. New listings will appear here when available.</div>',
    s, count=1, flags=re.S)
if n != 1:
    raise SystemExit("Latest-chapters block not found")
p.write_text(s, encoding="utf-8")

p = Path("data/ads-config.json")
ads = json.loads(p.read_text(encoding="utf-8"))
for section in ads.get("sections", []):
    section["enabled"] = False
p.write_text(json.dumps(ads, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

p = Path("seo-system.js")
p.write_text(p.read_text(encoding="utf-8").replace(
    "https://mangaatlas.github.io", "https://mangogoatlas.github.io"), encoding="utf-8")

p = Path("vercel.json")
config = json.loads(p.read_text(encoding="utf-8"))
config["rewrites"] = [r for r in config.get("rewrites", []) if r.get("source") != "/sitemap.xml"]
p.write_text(json.dumps(config, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

urls = [
    "https://mangogoatlas.github.io/",
    "https://mangogoatlas.github.io/latest-chapters.html",
    "https://mangogoatlas.github.io/manga.html",
    "https://mangogoatlas.github.io/country.html",
    "https://mangogoatlas.github.io/japan-blog.html",
    "https://mangogoatlas.github.io/blog.html",
]
xml = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
xml += "".join("  <url><loc>" + u + "</loc></url>\n" for u in urls)
Path("sitemap.xml").write_text(xml + "</urlset>\n", encoding="utf-8")

p = Path("scripts/build-chapter-pages.js")
s = p.read_text(encoding="utf-8")
old = "const readJson=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));"
new = """const readJson=(p,fallback={})=>{
  try { return JSON.parse(fs.readFileSync(path.join(root,p),'utf8')); }
  catch (err) { if (err && err.code === 'ENOENT') return fallback; throw err; }
};"""
if old in s:
    s = s.replace(old, new, 1)
elif "const readJson=(p,fallback={})=>" not in s:
    raise SystemExit("Could not safely patch JSON reader")
p.write_text(s, encoding="utf-8")

for name in ("manual-chapters.json", "upcoming-chapters.json", "extra-chapters.json"):
    p = Path("data") / name
    if not p.exists():
        p.write_text('{\n  "version": 1,\n  "chapters": []\n}\n', encoding="utf-8")

for name in ("admin/index.html", "admin/manga.html", "admin/chapters.html", "admin/ads-v3.html"):
    p = Path(name)
    s = p.read_text(encoding="utf-8")
    s = re.sub(r"\b(OWNER|O)='MangaGoAtlas'", r"\1='MangaNewWorld'", s)
    s = re.sub(r"\b(REPO|R)='MangaGoAtlas\.github\.io'", r"\1='MangaNewWorld.github.io'", s)
    p.write_text(s, encoding="utf-8")

for name in (".github/workflows/extract-nonimage-site.yml", ".github/workflows/fix-admin-ads.yml"):
    p = Path(name)
    if p.exists():
        p.rename(p.with_suffix(p.suffix + ".disabled"))

readme = """# MangaGoAtlas

A static manga discovery site built with HTML, CSS, JavaScript, and JSON data. This setup has no published chapter records, generated chapter pages, or chapter images. The manga catalog and cover images are retained.

## Project structure

- Public pages include homepage, manga/country pages, latest chapters, and blog pages.
- data/content.json retains the manga catalog with an empty chapter list.
- data/manual-chapters.json, data/upcoming-chapters.json, and data/extra-chapters.json are empty chapter sources.
- manga-covers/ contains retained covers.
- admin/ contains GitHub-backed manga, chapter, and ad management pages.
- data/ads-config.json retains nine ad sections, all disabled.
- scripts/build-chapter-pages.js generates pages when authorized chapter data is later added.
- supabase/schema.sql is retained as a schema reference; the current admin uses the GitHub Contents API.

## Checks

Use Node.js 20+: run node --check on the JavaScript files and node scripts/build-chapter-pages.js. With all chapter arrays empty, the build should create no chapter pages and a sitemap without chapter URLs.

## Deployment and domain

The Vercel rewrite to the missing /api/sitemap endpoint is removed. Canonical URLs still use https://mangogoatlas.github.io; verify that this remains the intended public domain. Some cover URLs point to a separate MangaAtlas repository and are preserved.

## Admin access

Admin pages are configured for MangaNewWorld/MangaNewWorld.github.io and the main branch. They require a GitHub token with repository contents read/write access and keep it in browser sessionStorage. Never commit a token. The target was updated but authenticated admin writes have not been tested.

## Adding chapters later

Authorized editors can add chapter records through Chapters Admin. Chapter images are not included in this cleanup. Run node scripts/build-chapter-pages.js after adding chapter records.
"""
Path("README.md").write_text(readme, encoding="utf-8")
