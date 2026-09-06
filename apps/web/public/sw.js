// Service worker minimal — présent uniquement pour la conformité PWA (requise
// par Bubblewrap/TWA), sans mise en cache applicative : le site reste servi
// normalement par le réseau, jamais depuis un cache qui pourrait figer des
// scores/compositions en direct.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Aucune interception : laisse le navigateur gérer la requête normalement.
});
