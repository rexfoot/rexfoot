import { cn } from "@/lib/cn";

const RESULT_STYLES: Record<string, string> = {
  W: "bg-rf-success/20 text-rf-success",
  D: "bg-rf-fg-subtle/20 text-rf-fg-muted",
  L: "bg-rf-live/20 text-rf-live",
};

/** Forme récente d'une équipe (ex. "WWDLW") en petits badges, du plus ancien au plus récent. */
export function FormBadge({ form }: { form: string | null }) {
  if (!form) return <span className="text-rf-fg-subtle">—</span>;

  return (
    <span className="flex items-center gap-1">
      {form.split("").map((letter, index) => (
        <span
          key={index}
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold",
            RESULT_STYLES[letter] ?? "bg-rf-fg-subtle/20 text-rf-fg-muted",
          )}
        >
          {letter}
        </span>
      ))}
    </span>
  );
}
