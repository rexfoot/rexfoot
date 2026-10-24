import { Alex_Brush } from "next/font/google";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

const alexBrush = Alex_Brush({ variable: "--font-signature", subsets: ["latin"], weight: "400" });

interface ArticleSignatureProps {
  name: string;
  label: string;
  /** Page auteur (/auteur/[slug]) : le nom devient un lien — renforce l'association nom ↔ RexFoot pour Google. */
  href?: string;
}

/** Signature manuscrite en fin d'article — identifie la personne qui a rédigé/validé le contenu. */
export function ArticleSignature({ name, label, href }: ArticleSignatureProps) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-rf-border pt-4">
      <span className="text-xs text-rf-fg-subtle">{label}</span>
      {href ? (
        <Link href={href} rel="author" className={cn(alexBrush.className, "text-3xl leading-none text-rf-fg hover:text-rf-gold")}>
          {name}
        </Link>
      ) : (
        <span className={cn(alexBrush.className, "text-3xl leading-none text-rf-fg")}>{name}</span>
      )}
    </div>
  );
}
