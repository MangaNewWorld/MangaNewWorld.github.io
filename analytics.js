(function(){
  var MEASUREMENT_ID='G-DWTESS8CF2';
  window.dataLayer=window.dataLayer||[];
  window.gtag=window.gtag||function(){window.dataLayer.push(arguments)};
  gtag('js',new Date());
  gtag('config',MEASUREMENT_ID,{send_page_view:false});
  var ga=document.createElement('script');
  ga.async=true;
  ga.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(MEASUREMENT_ID);
  document.head.appendChild(ga);
  function pageView(){
    if(location.pathname==='/chapter.html'||location.pathname==='/chapter') return;
    gtag('event','page_view',{page_title:document.title,page_location:location.href,page_path:location.pathname+location.search});
  }
  function loadChapterNavigation(){
    if(location.pathname!=='/chapter.html'&&location.pathname!=='/chapter') return;
    if(document.querySelector('script[data-manga-atlas-navigation]')) return;
    var s=document.createElement('script');s.src='/chapter-navigation.js?v=1';s.async=false;s.setAttribute('data-manga-atlas-navigation','true');document.head.appendChild(s);
  }
  function loadSeoSystem(){
    if(document.querySelector('script[data-manga-atlas-seo]')) return;
    var s=document.createElement('script');s.src='/seo-system.js?v=1';s.async=true;s.setAttribute('data-manga-atlas-seo','true');document.head.appendChild(s);
  }
  function loadAdsSystem(){
    if(location.pathname.indexOf('/admin')===0)return;
    if(document.querySelector('script[data-manga-atlas-ads]'))return;
    var s=document.createElement('script');s.src='/ads-system.js?v=14';s.async=false;s.setAttribute('data-manga-atlas-ads','true');document.head.appendChild(s);
  }
  function boot(){loadSeoSystem();loadAdsSystem();pageView();loadChapterNavigation();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  window.mangaAtlasAnalytics={pageView:function(extra){var p={page_title:document.title,page_location:location.href,page_path:location.pathname+location.search};if(extra)for(var k in extra)p[k]=String(extra[k]);gtag('event','page_view',p)},event:function(name,params){gtag('event',name,params||{})}};
})();
