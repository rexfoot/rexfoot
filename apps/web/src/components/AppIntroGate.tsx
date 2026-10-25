"use client";

import { useEffect, useState } from "react";

type IntroComponent = React.ComponentType<{ onDismiss: () => void }>;

/** Loads the cinematic only for a standalone launch on the home page. */
export function AppIntroGate() {
  const [Intro, setIntro] = useState<IntroComponent | null>(null);

  useEffect(() => {
    try {
      // ?intro=1 force l'intro (test sur n'importe quel navigateur, sans installer l'app).
      const forced = new URLSearchParams(window.location.search).get("intro") === "1";
      const isStandalone =
        window.matchMedia("(display-mode: standalone)").matches ||
        window.matchMedia("(display-mode: fullscreen)").matches ||
        window.matchMedia("(display-mode: minimal-ui)").matches ||
        // Application Play Store (TWA) : Chrome l'ouvre avec ce referrer.
        document.referrer.startsWith("android-app://");
      const isHome = /^\/(?:en|es)?\/?$/.test(window.location.pathname);
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (!forced && (!isStandalone || !isHome || prefersReducedMotion)) return;
      if (!forced && window.sessionStorage.getItem("rexfoot-cinematic-intro-seen")) return;

      // Mark before loading so failures and reloads never trap or replay the app.
      window.sessionStorage.setItem("rexfoot-cinematic-intro-seen", "1");
    } catch {
      // Storage or matchMedia can be unavailable in embedded browsers.
      return;
    }

    let mounted = true;
    void import("./CinematicIntro").then(
      (module) => {
        if (mounted) setIntro(() => module.CinematicIntro);
      },
      () => {
        // A missing chunk must leave the already-rendered homepage usable.
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  if (!Intro) return null;
  return <Intro onDismiss={() => setIntro(null)} />;
}
