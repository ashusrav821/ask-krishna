var CACHE='askkeshava-v4';
var ASSETS=[
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/om.mp3'
];
// FIX: only cache known static asset paths at runtime — prevents caching
// OAuth callback URLs (/?code=...&state=...) and other dynamic/navigational
// responses that should never be served from cache.
var RUNTIME_CACHEABLE=/\.(?:png|jpe?g|gif|svg|ico|css|js|mp3|wav|woff2?|ttf|json|webmanifest)$/;
self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      // allSettled so a missing file doesn't abort the whole install
      return Promise.allSettled(ASSETS.map(function(a){return c.add(a)}));
    }).then(function(){return self.skipWaiting()})
  );
});
self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      // FIX: only delete caches with our own prefix — don't wipe caches
      // belonging to other apps that might share this origin.
      return Promise.all(keys.filter(function(k){return k!==CACHE&&k.indexOf('askkeshava-')===0}).map(function(k){return caches.delete(k)}));
    }).then(function(){return self.clients.claim()}).then(function(){
      // Notify all open tabs of update
      return self.clients.matchAll({type:'window'}).then(function(clients){
        clients.forEach(function(c){c.postMessage({type:'APP_UPDATED',version:'v4'});});
      });
    })
  );
});
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var url=new URL(e.request.url);
  // Don't intercept cross-origin requests (API calls, etc.)
  if(url.origin!==self.location.origin)return;
  // Don't cache navigations with query strings (OAuth callbacks, ?wisdom=1, etc.)
  var isNavigation=e.request.mode==='navigate';
  var hasQuery=url.search!=='';
  var isCacheableAsset=RUNTIME_CACHEABLE.test(url.pathname);
  if(isNavigation&&hasQuery){
    // Always fetch fresh — never cache OAuth/callback URLs
    e.respondWith(fetch(e.request).catch(function(){
      // Fallback to cached index.html if network fails
      return caches.match('/index.html');
    }));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(function(cached){
      // FIX: add network timeout so uncached requests don't hang indefinitely
      var ctrl=new AbortController();
      var tout=setTimeout(function(){ctrl.abort();},8000);
      var fresh=fetch(e.request,{signal:ctrl.signal}).then(function(resp){
        clearTimeout(tout);
        // FIX: only cache static assets (images, audio, scripts, styles, etc.)
        // — never dynamic pages, navigations, or API responses.
        if(resp&&resp.status===200&&resp.type==='basic'&&isCacheableAsset){
          var clone=resp.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,clone)});
        }
        return resp;
      }).catch(function(){
        clearTimeout(tout);
        return cached;
      });
      // FIX: if no cached response and network fails, return a proper fallback
      // instead of undefined (which causes "no Response" browser errors).
      if(cached)return cached||fresh;
      return fresh.catch(function(){
        // Last-resort: cached index.html for navigations, 504 for everything else
        if(isNavigation){
          return caches.match('/index.html').then(function(fallback){
            return fallback||new Response('Offline',{status:504,statusText:'Gateway Timeout'});
          });
        }
        return new Response('Offline',{status:504,statusText:'Gateway Timeout'});
      });
    })
  );
});
// ── Notification click → open/focus the app ──────────────────────────────
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var target=(e.notification.data&&e.notification.data.url)||'/?wisdom=1';
  // FIX: sanitize target to same-origin only — prevent openWindow to arbitrary URLs
  try{
    var targetUrl=new URL(target,self.location.origin);
    if(targetUrl.origin!==self.location.origin)target='/';
    else target=targetUrl.pathname+targetUrl.search;
  }catch(err){target='/';}
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      for(var i=0;i<list.length;i++){
        var c=list[i];
        // FIX: use origin comparison instead of hardcoded domain string
        try{
          if(new URL(c.url).origin===self.location.origin&&'focus' in c){
            c.focus();
            c.postMessage({type:'WISDOM_NOTIF_TAP'});
            return;
          }
        }catch(err){/* skip invalid URLs */}
      }
      if(clients.openWindow)return clients.openWindow(target);
    })
  );
});
// ── Message from page → show notification or skip waiting ────────────────
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SKIP_WAITING'){self.skipWaiting();return;}
  if(e.data&&e.data.type==='SHOW_NOTIF'){
    // FIX: wrap in waitUntil so the SW stays alive until notification is shown
    e.waitUntil(
      self.registration.showNotification(e.data.title||'Ask Krishna 🪷',{
        body:e.data.body||'Your daily wisdom from the Bhagavad Gita awaits.',
        icon:'/icon-192.png',
        badge:'/icon-192.png',
        tag:'daily-wisdom',
        renotify:true,
        data:{url:'/?wisdom=1'}
      })
    );
  }
});
