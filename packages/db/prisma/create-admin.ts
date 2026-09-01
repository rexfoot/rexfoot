// Script d'exploitation ponctuel : crée ou réinitialise le mot de passe d'un
// compte admin du panel /admin. Usage :
//   npx dotenv -e ../../.env -- npx tsx prisma/create-admin.ts <email> [mot de passe] [nom affiché]
// Si le mot de passe est omis, un mot de passe aléatoire est généré et affiché.
import { randomBytes, scrypt } from "node:crypto";
import { promisify } from "node:util";
import { prisma } from "../src/index.js";

const scryptAsync = promisify(scrypt);

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

function generatePassword(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from(randomBytes(16))
    .map((byte) => alphabet[byte % alphabet.length])
    .join("");
}

async function main() {
  const email = process.argv[2];
  const providedPassword = process.argv[3];
  const displayName = process.argv[4] ?? "Admin RexFoot";

  if (!email) {
    console.error("Usage: create-admin.ts <email> [mot de passe] [nom affiché]");
    process.exit(1);
  }

  const password = providedPassword || generatePassword();
  const passwordHash = await hashPassword(password);

  const user = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: "ADMIN", status: "ACTIVE" },
    create: { email: email.toLowerCase(), passwordHash, displayName, role: "ADMIN", status: "ACTIVE" },
  });

  console.log(`Compte admin prêt : ${user.email} (id ${user.id})`);
  console.log(`Mot de passe : ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
