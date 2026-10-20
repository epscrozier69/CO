const CACHE_NAME = "co-cache-v1";
const APP_SHELL = ["CO.html"];

self.addEventListener("install", function(event){
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache){
      return cache.addAll(APP_SHELL).catch(function(){ /* hors connexion au premier chargement : pas grave, mise en cache au premier fetch */ });
    })
  );
});

self.addEventListener("activate", function(event){
  event.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){ return k!==CACHE_NAME; }).map(function(k){ return caches.delete(k); }));
    }).then(function(){ return self.clients.claim(); })
  );
});

/* Stale-while-revalidate : répond depuis le cache immédiatement si possible (rapide + hors ligne),
   tout en rafraîchissant le cache en arrière-plan dès que le réseau est disponible.
   Les requêtes vers d'autres origines (ex: Google Sheets) ne sont pas interceptées. */
self.addEventListener("fetch", function(event){
  const req = event.request;
  if(req.method !== "GET") return;
  let url;
  try{ url = new URL(req.url); }catch(e){ return; }
  if(url.origin !== self.location.origin) return;

  event.respondWith(
    caches.match(req).then(function(cached){
      const networkFetch = fetch(req).then(function(res){
        if(res && res.status===200){
          const resClone = res.clone();
          caches.open(CACHE_NAME).then(function(cache){ cache.put(req, resClone); });
        }
        return res;
      }).catch(function(){ return cached; });
      return cached || networkFetch;
    })
  );
});
