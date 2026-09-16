#!/usr/bin/env node
// PreToolUse hook (Bash) — ce repo n'a qu'une base Postgres (.env DATABASE_URL
// pointe directement sur Railway prod, pas de base de dev séparée). Une
// commande qui ressemble à `prisma migrate deploy` ou `prisma db push`
// s'appliquerait donc directement en production sans confirmation explicite.
// Ce hook ne bloque jamais silencieusement : il demande confirmation
// (permissionDecision "ask") plutôt que d'autoriser sans rien dire.
const DANGEROUS_PATTERN = /\bprisma\b[^|&;\n]*\b(migrate\s+deploy|db\s+push)\b/i;

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  let command = "";
  try {
    const payload = JSON.parse(input || "{}");
    command = payload?.tool_input?.command ?? "";
  } catch {
    process.exit(0);
  }

  if (DANGEROUS_PATTERN.test(command)) {
    console.log(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "ask",
          permissionDecisionReason:
            "Cette commande ressemble à une migration Prisma appliquée directement (migrate deploy / db push). " +
            "Ce repo n'a qu'une base Postgres — .env DATABASE_URL pointe sur la production Railway, pas de base de dev séparée. " +
            "Confirme que c'est bien voulu avant de continuer.",
        },
      }),
    );
  }
  process.exit(0);
});
