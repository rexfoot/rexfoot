"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="fr">
      <body style={{ background: "#0a0b0d", color: "#f3f4f6", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "1rem", padding: "1.5rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.25rem", fontWeight: 700 }}>Une erreur est survenue</h1>
          <p style={{ color: "#9ca3af", fontSize: "0.875rem" }}>RexFoot a rencontré un problème inattendu.</p>
          <button
            onClick={reset}
            style={{ borderRadius: "9999px", background: "#d4af37", color: "#0a0b0d", padding: "0.5rem 1.25rem", fontWeight: 600, border: "none", cursor: "pointer" }}
          >
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
