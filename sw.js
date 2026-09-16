const CACHE_NAME = "my-app-v9";
const APP_SHELL = [
  "./",
  "./index.html",
  "./money-tracker.html",
  "./routine.html",
  "./styles.css",
  "./tracker.css",
  "./routine.css",
  "./script.js",
  "./access-credentials.js",
  "./access-lock.js",
  "./supabase-config.js",
  "./supabase-sync.js",
  "./money-tracker.js",
  "./routine.js",
  "./pwa.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.svg",
  "./icons/icon-512.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
    const appWindow = windows.find((window) => window.url.includes(self.registration.scope));
    return appWindow ? appWindow.focus() : clients.openWindow("./routine.html");
  }));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;
      return fetch(event.request).then((networkResponse) => {
        if (new URL(event.request.url).origin === self.location.origin) {
          const responseCopy = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        }
        return networkResponse;
      });
    })
  );
});
