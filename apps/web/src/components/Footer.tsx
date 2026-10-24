import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { SITE_NAME } from "@rexfoot/config";
import { Facebook, Youtube, Mail } from "lucide-react";
import { AddToHomeScreenButton } from "@/components/AddToHomeScreenButton";
import { CONTACT_EMAIL, FACEBOOK_PAGE_URL, YOUTUBE_CHANNEL_URL } from "@/lib/social-links";

export async function Footer() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="mx-auto w-full max-w-6xl px-4 py-6 text-xs text-rf-fg-subtle">
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-rf-border pt-4">
        <div className="flex items-center gap-3">
          <span>
            © {year} {SITE_NAME}. {t("rights")}
          </span>
          <a href={FACEBOOK_PAGE_URL} target="_blank" rel="noopener noreferrer" aria-label="Facebook RexFoot" className="hover:text-rf-fg">
            <Facebook size={16} />
          </a>
          <a href={YOUTUBE_CHANNEL_URL} target="_blank" rel="noopener noreferrer" aria-label="YouTube RexFoot" className="hover:text-rf-fg">
            <Youtube size={16} />
          </a>
          <a href={`mailto:${CONTACT_EMAIL}`} aria-label="E-mail RexFoot" className="hover:text-rf-fg">
            <Mail size={16} />
          </a>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <AddToHomeScreenButton />
          <Link href="/light" className="underline hover:text-rf-fg">
            {t("lightLink")}
          </Link>
          <Link href="/redaction" className="underline hover:text-rf-fg">
            {t("editorialLink")}
          </Link>
          <Link href="/contact" className="underline hover:text-rf-fg">
            {t("contactLink")}
          </Link>
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
