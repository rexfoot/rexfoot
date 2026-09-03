import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { AccountMenuButton } from "./AccountMenuButton";
import { NotificationBell } from "./NotificationBell";
import { LanguageSwitcher } from "./LanguageSwitcher";
import type { CurrentUser } from "@/lib/auth/current-user";

/** Barre du haut visible uniquement sur mobile — la nav de contenu vit dans BottomNav, ceci ne sert qu'au compte/langue/recherche. */
export function MobileHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-rf-border bg-rf-bg/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="flex items-center gap-1.5 font-display text-lg font-extrabold tracking-tight">
          <Image src="/logo-crown.png" alt="RexFoot" width={32} height={32} className="rounded-full object-cover" />
        <span className="text-rf-gold">Rex</span>
        <span className="text-rf-fg">Foot</span>
      </Link>
      <div className="flex items-center gap-2">
        <LanguageSwitcher />
        {user && <NotificationBell />}
        <AccountMenuButton user={user} />
      </div>
    </header>
  );
}
