import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface SectionHeaderProps {
  title: string;
  href?: string;
}

export function SectionHeader({ title, href }: SectionHeaderProps) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 className="font-display text-lg font-bold text-rf-fg">{title}</h2>
      {href && (
        <Link href={href} className="flex items-center text-sm font-medium text-rf-gold hover:text-rf-gold-soft">
          Voir tout <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}
