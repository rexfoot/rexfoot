import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";
import { isRtl } from "@/i18n/routing";

export const alt = "RexFoot";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * Satori (moteur de next/og) n'embarque qu'un jeu de glyphes latin de base —
 * ni accents français, ni script arabe. On récupère le fichier de police réel
 * via l'API CSS de Google Fonts, limité aux caractères effectivement utilisés
 * (`text=`) pour rester léger, plutôt que de livrer une police complète.
 */
async function loadGoogleFont(family: string, text: string): Promise<ArrayBuffer> {
  const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@700&text=${encodeURIComponent(text)}`;
  const css = await (await fetch(cssUrl)).text();
  const match = css.match(/src: url\(([^)]+)\)/);
  if (!match) throw new Error(`Police introuvable pour ${family}`);

  const response = await fetch(match[1]!);
  if (!response.ok) throw new Error(`Échec du téléchargement de la police ${family}`);
  return response.arrayBuffer();
}

export default async function OpengraphImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const rtl = isRtl(locale);

  // Satori (moteur de next/og) ne supporte pas le format de substitution de
  // glyphes ("lookupType 5 - substFormat 3") utilisé par les polices arabes
  // courantes (Noto Sans Arabic incluse) — tenter de dessiner du texte arabe
  // fait planter la génération. Pour l'arabe, on affiche donc uniquement le
  // wordmark "RexFoot" (toujours en latin, comme partout ailleurs sur le
  // site), sans le slogan traduit, plutôt que de risquer une image cassée.
  let tagline: string | null = null;
  if (!rtl) {
    const t = await getTranslations({ locale, namespace: "metadata" });
    tagline = t("title").split("—")[1]?.trim() ?? t("title");
  }

  const fontData = await loadGoogleFont("Inter", `RexFoot${tagline ?? ""}`);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0a0b0d",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", fontSize: 100, fontWeight: 700, letterSpacing: -2 }}>
          <span style={{ color: "#d4af37" }}>Rex</span>
          <span style={{ color: "#f3f4f6" }}>Foot</span>
        </div>
        {tagline && <div style={{ marginTop: 28, fontSize: 34, color: "#9ca3af" }}>{tagline}</div>}
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Inter", data: fontData, style: "normal", weight: 700 }],
    },
  );
}
