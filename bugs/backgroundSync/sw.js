var CACHE_NAME = 'dependencies-cache';
const REQUIRED_FILES = [
  "index.html"
];

self.addEventListener('install', function(event) {
  // Perform install step:  loading each required file into cache
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        // Add all offline dependencies to the cache
        return cache.addAll(REQUIRED_FILES);
      })
      .then(function() {
        // At this point everything has been cached
        return self.skipWaiting();
      })
  );
});

self.addEventListener('activate', function(event) {
  console.log('%cSW activate',"background-color: #4CAF50; color: white;");
  event.waitUntil(
    self.clients.claim()
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        // Cache hit - return the response from the cached version
        if (response) {
          console.log('%cSW fetch - in cache',"background-color: #4CAF50; color: white;", event.request.url);
          return response;
        }
        console.log('%cSW fetch - not in cache',"background-color: #4CAF50; color: white;", event.request.url);
        // Not in cache - return the result from the live server
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('sync', function(event) {
  console.log('%csync event',"background-color: #4CAF50; color: white;", event.tag, event);
  event.waitUntil(doStuff());
});

function doStuff(){
  return fetch("index.html")
    .then(function(){
      return self.clients.matchAll().then(function(clientList){
        clientList.forEach(function(client) {
          client.postMessage({
            tag: 'log',
            message: "Sync completed"
          });
        });

        return Promise.resolve();
      });
    })
    .catch(function(){
      return self.clients.matchAll().then(function(clientList){
        clientList.forEach(function(client) {
          client.postMessage({
            tag: 'log',
            message: "Sync failed"
          });
        });

        return Promise.reject();
      });
    });
}
