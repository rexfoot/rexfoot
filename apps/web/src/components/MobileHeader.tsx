import Link from "next/link";
import { AccountMenuButton } from "./AccountMenuButton";
import type { CurrentUser } from "@/lib/auth/current-user";

/** Barre du haut visible uniquement sur mobile — la nav de contenu vit dans BottomNav, ceci ne sert qu'au compte. */
export function MobileHeader({ user }: { user: CurrentUser | null }) {
  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-b border-rf-border bg-rf-bg/95 px-4 py-2.5 backdrop-blur md:hidden">
      <Link href="/" className="font-display text-lg font-extrabold tracking-tight">
        <span className="text-rf-gold">Rex</span>
        <span className="text-rf-fg">Foot</span>
      </Link>
      <AccountMenuButton user={user} />
    </header>
  );
}
