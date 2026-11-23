const CACHE_NAME = "shaafici-order-desk-v67";
const APP_SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=202611230014",
  "./supabase-config.js",
  "./products.js",
  "./vendor/pdfjs/pdf.min.js",
  "./vendor/pdfjs/pdf.worker.min.js",
  "./vendor/html2canvas/html2canvas.min.js",
  "./app.js?v=202611230023",
  "./manifest.webmanifest",
  "./shaafici-warehouse-200-logo.png",
  "./shaafici-warehouse-200-logo-dark.png",
  "./shaafici-app-icon.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(APP_SHELL.map(async (url) => {
      try {
        await cache.add(url);
      } catch (error) {
        console.warn(`Could not pre-cache ${url}.`, error);
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames
      .filter((name) => name.startsWith("shaafici-order-desk-") && name !== CACHE_NAME)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const scopePath = new URL(self.registration.scope).pathname;
  const cachedExternalScript = [
    "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2",
    "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js",
    "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
  ].includes(url.href);
  const withinAppScope = url.origin === self.location.origin
    && url.pathname.startsWith(scopePath)
    && !url.pathname.slice(scopePath.length).startsWith("api/");
  if (request.method !== "GET" || (!withinAppScope && !cachedExternalScript)) {
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    const update = fetch(request).then(async (response) => {
      if ((response.ok && response.type === "basic")
        || (cachedExternalScript && response.type === "opaque")) {
        try {
          await cache.put(request, response.clone());
        } catch (error) {
          console.warn(`Could not update the cached copy of ${request.url}.`, error);
        }
      }
      return response;
    }).catch((error) => {
      console.warn(`Could not fetch ${request.url}; using the cached copy if available.`, error);
      return null;
    });

    if (cached) {
      event.waitUntil(update.then(() => undefined));
      return cached;
    }

    const response = await update;
    if (response) return response;
    if (request.mode === "navigate") {
      const offlinePage = await cache.match("./index.html");
      if (offlinePage) return offlinePage;
    }
    return Response.error();
  })());
});
