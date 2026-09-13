import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE_NAME } from "@rexfoot/config";
import { AddToHomeScreenButton } from "@/components/AddToHomeScreenButton";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-rf-fg-subtle">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rf-border pt-4">
        <span>
          © {year} {SITE_NAME}. {t("rights")}
        </span>
        <div className="flex flex-wrap items-center gap-4">
          <AddToHomeScreenButton />
          <Link href="/mentions-legales" className="underline hover:text-rf-fg">
            {t("legalLink")}
          </Link>
          <Link href="/confidentialite" className="underline hover:text-rf-fg">
            {t("privacyLink")}
          </Link>
        </div>
      </div>
    </footer>
  );
}
