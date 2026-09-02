import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";

interface SectionHeaderProps {
  title: string;
  href?: string;
  /** Couleur d'identité de la section (voir NAV_ACCENT) — "gold" par défaut. */
  accent?: "gold" | "matches" | "standings" | "mercato" | "video" | "news";
}

const ACCENT_TEXT: Record<NonNullable<SectionHeaderProps["accent"]>, string> = {
  gold: "text-rf-gold hover:text-rf-gold-soft",
  matches: "text-rf-matches hover:text-rf-matches/80",
  standings: "text-rf-standings hover:text-rf-standings/80",
  mercato: "text-rf-mercato hover:text-rf-mercato/80",
  video: "text-rf-video hover:text-rf-video/80",
  news: "text-rf-news hover:text-rf-news/80",
};

export function SectionHeader({ title, href, accent = "gold" }: SectionHeaderProps) {
  const t = useTranslations("common");

  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold text-rf-fg">{title}</h2>
      {href && (
        <Link href={href} className={cn("flex items-center text-sm font-medium transition-colors", ACCENT_TEXT[accent])}>
          {t("seeAll")} <ChevronRight size={16} className="rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}
