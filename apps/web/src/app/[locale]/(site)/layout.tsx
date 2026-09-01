import { getCurrentUser } from "@/lib/auth/current-user";
import { getActiveBreakingNews } from "@/lib/data/news";
import { BottomNav } from "@/components/BottomNav";
import { Sidebar } from "@/components/Sidebar";
import { MobileHeader } from "@/components/MobileHeader";
import { BreakingNewsBanner } from "@/components/BreakingNewsBanner";
import { ChatWidget } from "@/components/ChatWidget";

/**
 * Chrome du site public (sidebar desktop, bottom nav + header mobile) —
 * scopé à ce groupe de routes pour ne jamais s'afficher autour du panel
 * /admin, qui a son propre AdminShell.
 */
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [user, breakingNews] = await Promise.all([getCurrentUser(), getActiveBreakingNews()]);

  return (
    <>
      <BreakingNewsBanner items={breakingNews} />
      <MobileHeader user={user} />
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar user={user} />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
      <BottomNav />
      <div className="rf-mobile-nav-spacer" aria-hidden />
      <ChatWidget />
    </>
  );
}
