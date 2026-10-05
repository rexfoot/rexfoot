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

// Web Push (alertes de buts) — affiche la notification envoyée par le worker
// et ouvre la page du match au clic. Toujours pas de cache applicatif.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "RexFoot" };
  }
  const title = data.title || "RexFoot";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      data: { url: data.url || "/" },
      tag: data.tag || "rexfoot-goal",
      renotify: true,
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
