// Service worker: caches the app shell so the app still loads (and a
// workout already in progress keeps running) with no network connection —
// the normal case once you've left the house for a run.
//
// Strategy is cache-first with a network fallback, not "network-first" or
// "stale-while-revalidate": this app has no server/API calls at all, so
// there's nothing to keep fresh from minute to minute. The only time stale
// content matters is after *you* ship a code change, which is exactly what
// CACHE_NAME's version suffix is for (see activate below).
//
// Bump CACHE_NAME whenever any cached file's contents change. Anything
// requested that ISN'T in this list (there isn't anything else right now)
// just falls through to the network, uncached.
const CACHE_NAME = "c25k-shell-v1";

const SHELL_FILES = [
  "./",
  "./index.html",
  "./manifest.json",
  "./src/schedule.js",
  "./src/timerEngine.js",
  "./src/workoutClock.js",
  "./src/audioCues.js",
  "./src/cueController.js",
  "./src/progressStore.js",
  "./src/customSchedule.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  // Don't wait for the old service worker (if any) to stop controlling
  // open tabs before this one takes over installing the new shell.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  // Only handle simple GETs for our own origin's shell files. Anything
  // else (there isn't anything else today, but just in case) is left
  // alone and goes straight to the network.
  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).catch(() => {
        // Offline and not cached: for a navigation request, fall back to
        // the cached app shell itself rather than showing the browser's
        // own "no internet" page.
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return new Response("", { status: 504, statusText: "Offline" });
      });
    })
  );
});
