"use client";

import { useEffect, useRef, useState } from "react";

// Film d'ouverture de l'application (but dans un stade, foule), genere sur Higgsfield.
const INTRO_VIDEO_URL = "https://d8j0ntlcm91z4.cloudfront.net/user_3LCdkAhIwSRrWprhjeFFfSONXjJ/hf_20261025_230635_e9fd1027-ac5f-4e39-b188-90b9352b09d4.mp4";

/** Shows the real logo (never AI-drawn) over the last moment of the film, then opens the site. */
export function VideoIntro({ onDismiss }: { onDismiss: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showLogo, setShowLogo] = useState(false);
  const [fading, setFading] = useState(false);
  const closing = useRef(false);

  const close = (delay: number) => {
    if (closing.current) return;
    closing.current = true;
    setFading(true);
    window.setTimeout(onDismiss, delay);
  };

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    // A film that never starts (offline, blocked host) must not hide the site.
    const guard = window.setTimeout(() => close(250), 12000);
    v.muted = false;
    v.play().catch(() => {
      // Browsers usually refuse sound without a tap: start muted and offer the sound button.
      v.muted = true;
      setMuted(true);
      v.play().catch(() => close(250));
    });
    return () => window.clearTimeout(guard);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`rf-cinematic rf-video-intro ${playing ? "is-ready" : ""} ${fading ? "is-fading" : ""}`}
      aria-label="Introduction RexFoot"
      onClick={() => {
        const v = video.current;
        if (v && v.muted) {
          v.muted = false;
          setMuted(false);
        }
      }}
    >
      <video
        ref={video}
        className="rf-video-intro-film"
        src={INTRO_VIDEO_URL}
        playsInline
        preload="auto"
        onPlaying={() => setPlaying(true)}
        onTimeUpdate={(event) => {
          const v = event.currentTarget;
          if (!showLogo && v.duration && v.currentTime >= v.duration - 1.6) setShowLogo(true);
        }}
        onEnded={() => close(900)}
        onError={() => close(250)}
      />
      {showLogo && (
        <div className="rf-video-intro-logo">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-crown.png" alt="RexFoot" />
        </div>
      )}
      {playing && muted && (
        <button
          className="rf-cinematic-skip rf-video-intro-sound"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            const v = video.current;
            if (v) v.muted = false;
            setMuted(false);
          }}
        >
          🔊 Son
        </button>
      )}
      {playing && (
        <button
          className="rf-cinematic-skip"
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            close(250);
          }}
          aria-label="Passer l’introduction"
        >
          Passer
        </button>
      )}
    </div>
  );
}
