import Image from "next/image";
import { Shield } from "lucide-react";
import { cn } from "@/lib/cn";

const SIZES = { sm: 20, md: 28, lg: 48 } as const;

interface TeamCrestProps {
  crestUrl?: string | null;
  teamName: string;
  size?: keyof typeof SIZES;
  className?: string;
}

/** Wrapper de taille fixe pour un blason d'équipe — évite tout layout shift si l'image manque. */
export function TeamCrest({ crestUrl, teamName, size = "md", className }: TeamCrestProps) {
  const px = SIZES[size];

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: px, height: px }}
    >
      {crestUrl ? (
        <Image
          src={crestUrl}
          alt={teamName}
          width={px}
          height={px}
          className="h-full w-full object-contain"
          unoptimized
        />
      ) : (
        <Shield size={px * 0.8} className="text-rf-fg-subtle" strokeWidth={1.5} aria-label={teamName} />
      )}
    </span>
  );
}
