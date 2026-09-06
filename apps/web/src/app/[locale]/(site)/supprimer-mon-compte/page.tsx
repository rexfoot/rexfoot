import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { DeleteAccountButton } from "@/components/DeleteAccountButton";
import { buildAlternates } from "@/lib/seo/alternates";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("deleteAccount"), getLocale()]);
  return {
    title: t("title"),
    description: t("metaDescription"),
    alternates: buildAlternates("/supprimer-mon-compte", locale),
  };
}

/**
 * Page publique (jamais derriere une redirection login) exigee par la fiche
 * "Securite des donnees" du Play Store : un lien accessible sans compte qui
 * explique comment supprimer son compte et ses donnees. Si le visiteur est
 * deja connecte, la suppression se fait directement ici en un clic.
 */
export default async function DeleteAccountPage() {
  const t = await getTranslations("deleteAccount");
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("title")}</h1>

      <p className="text-[15px] leading-relaxed text-rf-fg-subtle">{t("dataDeleted")}</p>

      {user ? (
        <section className="space-y-2">
          <p className="text-sm text-rf-fg-subtle">{t("warning")}</p>
          <DeleteAccountButton />
        </section>
      ) : (
        <section className="space-y-3">
          <p className="text-[15px] leading-relaxed text-rf-fg-subtle">{t("loggedOutIntro")}</p>
          <Link
            href="/login?next=/supprimer-mon-compte"
            className="inline-block rounded-lg bg-rf-gold px-4 py-2 text-sm font-bold text-rf-bg"
          >
            {t("loginCta")}
          </Link>
        </section>
      )}

      <p className="text-sm text-rf-fg-muted">
        {t("cantLogin")} <span className="font-medium text-rf-fg">{t("contactEmail")}</span>
      </p>
    </div>
  );
}
