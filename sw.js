var CACHE='ask-krishna-v9';
var ASSETS=[
  '/ask-krishna/',
  '/ask-krishna/index.html',
  '/ask-krishna/manifest.json',
  '/ask-krishna/icon-192.png',
  '/ask-krishna/icon-512.png'
];

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS)}).then(function(){return self.skipWaiting()}));
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k!==CACHE}).map(function(k){return caches.delete(k)}));
    }).then(function(){return self.clients.claim()})
  );
});

self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(function(cached){
      var fresh=fetch(e.request).then(function(resp){
        if(resp&&resp.status===200&&resp.type==='basic'){
          var clone=resp.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,clone)});
        }
        return resp;
      }).catch(function(){return cached});
      return cached||fresh;
    })
  );
});

// ── Notification click → open/focus the app ──────────────────────────────
self.addEventListener('notificationclick',function(e){
  e.notification.close();
  var target=(e.notification.data&&e.notification.data.url)||'/ask-krishna/?wisdom=1';
  e.waitUntil(
    clients.matchAll({type:'window',includeUncontrolled:true}).then(function(list){
      // If app already open, focus it and send wisdom trigger
      for(var i=0;i<list.length;i++){
        var c=list[i];
        if(c.url.indexOf('/ask-krishna')!==-1&&'focus' in c){
          c.focus();
          c.postMessage({type:'WISDOM_NOTIF_TAP'});
          return;
        }
      }
      // Otherwise open fresh
      if(clients.openWindow)return clients.openWindow(target);
    })
  );
});

// ── Message from page → show notification (used by scheduleDailyNotification) ──
self.addEventListener('message',function(e){
  if(e.data&&e.data.type==='SHOW_NOTIF'){
    self.registration.showNotification(e.data.title||'Ask Krishna \uD83C\uDF38',{
      body:e.data.body||'Your daily wisdom from the Bhagavad Gita awaits.',
      icon:'/ask-krishna/icon-192.png',
      badge:'/ask-krishna/icon-192.png',
      tag:'daily-wisdom',
      renotify:true,
      data:{url:'/ask-krishna/?wisdom=1'}
    });
  }
});
