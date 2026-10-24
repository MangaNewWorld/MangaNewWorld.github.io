const fs=require('fs');
const path=require('path');

const root=process.cwd();
const readJson=(p)=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const esc=(s)=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const imageUrl=(u)=>{
  u=String(u||'');
  return /^https?:\/\//i.test(u)?u:'https://manganewworld.github.io/'+u.replace(/^\/+/, '');
};

const sources=[
  readJson('data/content.json').chapters||[],
  readJson('data/manual-chapters.json').chapters||[],
  readJson('data/upcoming-chapters.json').chapters||[],
  readJson('data/extra-chapters.json').chapters||[]
];
const map=new Map();
for(const list of sources) for(const c of list) if(c&&c.slug) map.set(String(c.slug),c);
const chapters=[...map.values()];

fs.rmSync(path.join(root,'chapters'),{recursive:true,force:true});

for(const c of chapters){
  const slug=String(c.slug).trim();
  const title=String(c.title||('Chapter '+(c.number??''))).trim();
  const canonical='https://manganewworld.github.io/chapter.html?slug='+encodeURIComponent(slug);
  const imgs=(Array.isArray(c.pages)?c.pages:[]).map(p=>typeof p==='string'?p:(p?.url||p?.path||p?.src||'')).filter(Boolean);
  const body=imgs.length
    ? imgs.map((u,i)=>'<img class="page" src="'+esc(imageUrl(u))+'" alt="'+esc(title)+'" loading="'+(i<2?'eager':'lazy')+'" decoding="async">').join('')
    : '<div class="coming"><h1>'+esc(title)+'</h1><p>Chapter information is available on MangaGoAtlas.</p></div>';
  const firstImage=imgs.length?imageUrl(imgs[0]):'';
  const html='<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"><link rel="canonical" href="'+canonical+'"><title>'+esc(title)+' | MangaGoAtlas</title><meta name="description" content="'+esc('Read '+title+' on MangaGoAtlas. Chapter '+(c.number??'')+' with the latest manga release and page images.')+'"><meta property="og:type" content="article"><meta property="og:site_name" content="MangaGoAtlas"><meta property="og:title" content="'+esc(title)+' | MangaGoAtlas"><meta property="og:description" content="'+esc('Read '+title+' on MangaGoAtlas. Chapter '+(c.number??'')+' with the latest manga release and page images.')+'"><meta property="og:url" content="'+canonical+'">'+(firstImage?'<meta property="og:image" content="'+esc(firstImage)+'">':'')+'<script type="application/ld+json">'+JSON.stringify({'@context':'https://schema.org','@type':'Article',headline:title,description:'Read '+title+' on MangaGoAtlas.',url:canonical,image:firstImage?[firstImage]:undefined,datePublished:c.createdAt||undefined,dateModified:c.updatedAt||c.createdAt||undefined,mainEntityOfPage:{'@type':'WebPage','@id':canonical},publisher:{'@type':'Organization',name:'MangaGoAtlas',url:'https://manganewworld.github.io/'}})+'</script><style>*{box-sizing:border-box}body{margin:0;background:#07080b;color:#f5f5f7;font-family:Arial,system-ui,sans-serif}.bar{padding:14px 5%;border-bottom:1px solid #222733;background:#0c0e13}.bar a{color:#b7bdc9;text-decoration:none}.copy{max-width:1000px;margin:auto;padding:30px 5% 18px}.copy h1{margin:0 0 10px;line-height:1.25}.copy p{color:#aeb6c4;line-height:1.7}.reader{max-width:1000px;margin:auto}.page{display:block;width:100%;height:auto;margin:0 auto}.coming{margin:50px 5%;padding:30px;border:1px solid #2d3a4d;border-radius:16px;text-align:center}.related{max-width:900px;margin:30px auto 70px;padding:24px 5%;color:#aeb6c4}</style><script src="/analytics.js"></script></head><body><header class="bar"><a href="/">← MangaGoAtlas</a></header><main><section class="copy"><h1>'+esc(title)+'</h1><p>Read '+esc(title)+' on MangaGoAtlas. Chapter '+esc(c.number??'')+'.</p></section><div class="reader">'+body+'</div><section class="related">MangaGoAtlas chapter page · '+esc(title)+'</section></main></body></html>';
  const dir=path.join(root,'chapters',slug);
  fs.mkdirSync(dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'index.html'),html);
}

const fixed=[
  'https://manganewworld.github.io/',
  'https://manganewworld.github.io/latest-chapters.html',
  'https://manganewworld.github.io/manga.html',
  'https://manganewworld.github.io/country.html',
  'https://manganewworld.github.io/japan-blog.html',
  'https://manganewworld.github.io/blog.html'
];
const today=new Date().toISOString().slice(0,10);
const urls=fixed.map(u=>'<url><loc>'+u+'</loc></url>');
for(const c of chapters){
  const slug=String(c.slug).trim();
  urls.push('<url><loc>https://manganewworld.github.io/chapter.html?slug='+encodeURIComponent(slug)+'</loc><lastmod>'+today+'</lastmod></url>');
}
fs.writeFileSync(path.join(root,'sitemap.xml'),'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  '+urls.join('\n  ')+'\n</urlset>\n');

const latestPath=path.join(root,'latest-chapters.html');
if(fs.existsSync(latestPath)){
  let html=fs.readFileSync(latestPath,'utf8');
  html=html.replace(/\/chapters\/([^/"'<>]+)\/?/g,(_,s)=>'/chapter.html?slug='+encodeURIComponent(s));
  fs.writeFileSync(latestPath,html);
}
console.log('Generated '+chapters.length+' static chapter pages and rebuilt sitemap.');
