import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const fieldClass =
  "w-full rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-3 text-base text-rf-fg placeholder:text-rf-fg-subtle focus:border-rf-gold focus:outline-none focus:ring-2 focus:ring-rf-gold/30";

export function AdminInput(props: ComponentProps<"input">) {
  return <input {...props} className={cn(fieldClass, props.className)} />;
}

export function AdminTextarea(props: ComponentProps<"textarea">) {
  return <textarea {...props} className={cn(fieldClass, "resize-y", props.className)} />;
}

export function AdminSelect(props: ComponentProps<"select">) {
  return <select {...props} className={cn(fieldClass, props.className)} />;
}

interface FieldGroupProps {
  label: string;
  htmlFor?: string;
  hint?: string;
  children: ReactNode;
}

/** Bloc label + champ + astuce optionnelle — unité de base de tous les formulaires admin. */
export function FieldGroup({ label, htmlFor, hint, children }: FieldGroupProps) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold text-rf-fg">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1.5 text-xs text-rf-fg-subtle">{hint}</p>}
    </div>
  );
}

interface AdminButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "danger";
}

const BUTTON_VARIANTS: Record<NonNullable<AdminButtonProps["variant"]>, string> = {
  primary: "bg-rf-gold text-rf-bg hover:bg-rf-gold-soft",
  secondary: "border border-rf-border bg-transparent text-rf-fg hover:border-rf-gold/50",
  danger: "bg-rf-crimson text-white hover:bg-rf-crimson/90",
};

/** Bouton volontairement grand — le panel doit être utilisable sans connaissances techniques. */
export function AdminButton({ variant = "primary", className, ...props }: AdminButtonProps) {
  return (
    <button
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-base font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        BUTTON_VARIANTS[variant],
        className,
      )}
    />
  );
}

/** Message de confirmation/erreur après une action (sauvegarde, suppression…). */
export function Banner({ kind, children }: { kind: "success" | "error"; children: ReactNode }) {
  return (
    <div
      role={kind === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl border px-4 py-3 text-sm font-medium",
        kind === "success"
          ? "border-rf-success/30 bg-rf-success/10 text-rf-success"
          : "border-rf-live/30 bg-rf-live/10 text-rf-live",
      )}
    >
      {children}
    </div>
  );
}
