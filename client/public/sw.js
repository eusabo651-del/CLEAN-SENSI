const CACHE_NAME = "clean-sensi-shell-v3";
const APP_SHELL = ["/", "/manifest.json", "/clean-sensi-logo.png", "/clean-sensi-icon-180.png", "/clean-sensi-icon-192.png", "/clean-sensi-icon-512.png", "/clean-sensi-icon-maskable-512.png", "/xm8-free-fire.webp"];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET" || event.request.url.includes("/api/")) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});
