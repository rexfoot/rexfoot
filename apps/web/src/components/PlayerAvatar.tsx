import Image from "next/image";
import { cn } from "@/lib/cn";

const SIZES = { sm: 32, md: 48, lg: 96 } as const;

interface PlayerAvatarProps {
  photoUrl?: string | null;
  displayName: string;
  size?: keyof typeof SIZES;
  className?: string;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return parts
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

/** Photo circulaire d'un joueur, avec repli sur les initiales si aucune photo. */
export function PlayerAvatar({ photoUrl, displayName, size = "md", className }: PlayerAvatarProps) {
  const px = SIZES[size];

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-rf-bg-card text-rf-fg-muted",
        className,
      )}
      style={{ width: px, height: px }}
    >
      {photoUrl ? (
        <Image src={photoUrl} alt={displayName} width={px} height={px} className="h-full w-full object-cover" unoptimized />
      ) : (
        <span className="font-display font-semibold" style={{ fontSize: px * 0.35 }}>
          {initials(displayName)}
        </span>
      )}
    </span>
  );
}
