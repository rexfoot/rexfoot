import { Alex_Brush } from "next/font/google";
import { cn } from "@/lib/cn";

const alexBrush = Alex_Brush({ variable: "--font-signature", subsets: ["latin"], weight: "400" });

interface ArticleSignatureProps {
  name: string;
  label: string;
}

/** Signature manuscrite en fin d'article — identifie la personne qui a rédigé/validé le contenu. */
export function ArticleSignature({ name, label }: ArticleSignatureProps) {
  return (
    <div className="flex items-center justify-end gap-3 border-t border-rf-border pt-4">
      <span className="text-xs text-rf-fg-subtle">{label}</span>
      <span className={cn(alexBrush.className, "text-3xl leading-none text-rf-fg")}>{name}</span>
    </div>
  );
}
