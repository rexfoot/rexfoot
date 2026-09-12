import Image from "next/image";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AccountMenuButton } from "./AccountMenuButton";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { CurrentUser } from "@/lib/auth/current-user";

/**
 * Barre du haut visible uniquement sur mobile — la nav de contenu vit dans
 * BottomNav, ceci ne sert qu'au compte/langue/recherche. Le raccourci Talents
 * est ajouté ici en plus de BottomNav (demandé par Hicham après test réel :
 * pas assez visible en bas d'écran seul) — juste à gauche du sélecteur de
 * langue, même taille/forme de bouton pour rester cohérent visuellement.
 */
export async function MobileHeader({ user }: { user: CurrentUser | null }) {
  const t = await getTranslations("nav");

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-rf-border bg-rf-bg/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-1.5 font-display text-lg font-extrabold tracking-tight">
        <span className="text-rf-gold">Rex</span>
        <span className="text-rf-fg">Foot</span>
        <Image src="/logo-crown.png" alt="RexFoot" width={32} height={32} className="rounded-full object-cover" />
      </Link>
      <div className="flex items-center gap-2">
        <Link
          href="/talents"
          title={t("talents")}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rf-bg-card text-rf-orange transition-colors hover:bg-rf-orange/15"
        >
          <Star size={18} />
          <span className="sr-only">{t("talents")}</span>
        </Link>
        <LanguageSwitcher />
        {user && <NotificationBell />}
        <AccountMenuButton user={user} />
      </div>
    </header>
  );
}
