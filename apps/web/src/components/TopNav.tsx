import Link from "next/link";
import { NAV_ITEMS } from "@/lib/nav";

/** Nav desktop — la nav mobile (BottomNav) prend le relais sous `md`. */
export function TopNav() {
  return (
    <header className="sticky top-0 z-40 hidden border-b border-rf-border bg-rf-bg/95 backdrop-blur md:block">
      <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4">
        <Link href="/" className="flex items-baseline gap-2 font-display text-xl font-extrabold tracking-tight">
          <span className="text-rf-gold">Rex</span>
          <span className="text-rf-fg">Foot</span>
        </Link>
        <nav aria-label="Navigation principale">
          <ul className="flex items-center gap-6 text-sm font-medium text-rf-fg-muted">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="transition-colors hover:text-rf-fg">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
