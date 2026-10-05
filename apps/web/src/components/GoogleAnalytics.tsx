import Script from "next/script";

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** No-op tant que NEXT_PUBLIC_GA_MEASUREMENT_ID n'est pas configuré (Railway) — jamais de faux tracking en local/preview. */
export function GoogleAnalytics() {
  if (!GA_MEASUREMENT_ID) return null;

  // lazyOnload : GA ne part qu'après le chargement complet de la page
  // (événement load navigateur), jamais en concurrence avec LCP/FCP.
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`} strategy="lazyOnload" />
      <Script id="google-analytics-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_MEASUREMENT_ID}');
        `}
      </Script>
    </>
  );
}
