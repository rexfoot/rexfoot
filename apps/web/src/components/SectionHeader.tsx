import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  href?: string;
}

export function SectionHeader({ title, href }: SectionHeaderProps) {
  const t = useTranslations("common");

  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold text-rf-fg">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center text-sm font-medium text-rf-gold hover:text-rf-gold-soft">
          {t("seeAll")} <ChevronRight size={16} className="rtl:rotate-180" />
        </Link>
      )}
    </div>
  );
}
