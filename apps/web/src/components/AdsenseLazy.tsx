import Script from "next/script";

const ADSENSE_CLIENT = "ca-pub-4763917863811490";

/**
 * Charge AdSense après le chargement de la page (idle navigateur), jamais en
 * bloquant : le script (~100 Ko + enchères) ne doit pas retarder LCP ni FCP.
 * Aucune unité pub n'est rendue pour l'instant — ce composant prépare le
 * terrain sans coûter une milliseconde au premier affichage.
 */
export function AdsenseLazy() {
  return (
    <Script
      src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
      strategy="lazyOnload"
      crossOrigin="anonymous"
    />
  );
}
