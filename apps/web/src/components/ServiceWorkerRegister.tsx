import Script from "next/script";

/** Enregistre le service worker minimal (conformité PWA/TWA) — voir public/sw.js. */
export function ServiceWorkerRegister() {
  return (
    <Script id="sw-register" strategy="afterInteractive">
      {`
        if ('serviceWorker' in navigator) {
          navigator.serviceWorker.register('/sw.js');
        }
      `}
    </Script>
  );
}
