import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Remplace next/link et next/navigation dans tout le site public (jamais dans
 * /admin, qui n'est pas localisé) : ces wrappers ajoutent/retirent le préfixe
 * de langue automatiquement, sinon un lien "en dur" ferait perdre la langue
 * courante à chaque clic pour un visiteur en/ar.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
