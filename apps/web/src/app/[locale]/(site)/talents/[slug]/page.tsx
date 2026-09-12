import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";
import { CheckCircle2, Clock, MapPin, User as UserIcon } from "lucide-react";
import { getApprovedTalentBySlug } from "@/lib/data/talents";
import { TrackView } from "@/components/TrackView";
import { TalentContactButton } from "@/components/talents/TalentContactButton";
import { targetCountryFlagUrl, targetCountryName } from "@/lib/talents/target-countries";
import { buildAlternates, localizedUrl } from "@/lib/seo/alternates";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const [talent, t, locale] = await Promise.all([
    getApprovedTalentBySlug(slug),
    getTranslations("talents"),
    getLocale(),
  ]);
  if (!talent) return {};
  return {
    title: `${talent.firstName} ${talent.lastName} — RexFoot Talents`,
    description: t("metaDescription", { name: `${talent.firstName} ${talent.lastName}`, nationality: talent.nationality, country: talent.currentCountry }),
    openGraph: talent.photoUrl ? { images: [{ url: talent.photoUrl }] } : undefined,
    alternates: buildAlternates(`/talents/${slug}`, locale),
  };
}

function computeAge(dateOfBirth: Date): number {
  const now = new Date();
  let age = now.getFullYear() - dateOfBirth.getFullYear();
  const hasNotHadBirthdayYet =
    now.getMonth() < dateOfBirth.getMonth() || (now.getMonth() === dateOfBirth.getMonth() && now.getDate() < dateOfBirth.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

export default async function TalentProfilePage({ params }: PageProps) {
  const { slug } = await params;
  const [talent, t, locale] = await Promise.all([
    getApprovedTalentBySlug(slug),
    getTranslations("talents"),
    getLocale(),
  ]);
  if (!talent) notFound();

  const fullName = `${talent.firstName} ${talent.lastName}`;
  const age = computeAge(talent.dateOfBirth);
  const profileUrl = localizedUrl(locale, `/talents/${slug}`);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: fullName,
    nationality: talent.nationality,
    image: talent.photoUrl ?? undefined,
    mainEntityOfPage: { "@type": "WebPage", "@id": profileUrl },
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <TrackView entityType="TALENT_PROFILE" entityId={talent.id} />

      <div className="flex items-center gap-4">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-rf-bg-elevated">
          {talent.photoUrl ? (
            <Image src={talent.photoUrl} alt={fullName} fill unoptimized className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <UserIcon size={28} className="text-rf-fg-subtle" />
            </div>
          )}
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-rf-fg">{fullName}</h1>
          <p className="text-sm text-rf-fg-muted">
            {talent.nationality} · {t("profile.age", { age })} · {t(`position.${talent.position}`)}
          </p>
          <p className="flex items-center gap-1 text-sm text-rf-fg-subtle">
            <MapPin size={13} />
            {talent.currentCountry}
            {talent.city ? `, ${talent.city}` : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-rf-success/15 px-3 py-1 text-xs font-semibold text-rf-success">
          <CheckCircle2 size={13} />
          {t("profile.verifiedBadge")}
        </span>
        <span className="rounded-full bg-rf-orange/15 px-3 py-1 text-xs font-semibold text-rf-orange">
          {t(`situation.${talent.situation}`)}
        </span>
      </div>
      <p className="text-xs text-rf-fg-subtle">{t("profile.verifiedNote")}</p>

      {talent.video?.playbackUrl ? (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("profile.video")}</h2>
          <div className="overflow-hidden rounded-2xl bg-rf-bg-card">
            <iframe
              src={talent.video.playbackUrl}
              title={fullName}
              allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;"
              allowFullScreen
              className="aspect-video w-full border-0"
            />
          </div>
        </section>
      ) : (
        <p className="flex items-center gap-2 rounded-xl border border-rf-border bg-rf-bg-elevated p-4 text-sm text-rf-fg-muted">
          <Clock size={16} />
          {t("profile.noVideo")}
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("profile.searchingFor")}</h2>
        <div className="flex flex-wrap gap-2">
          {talent.openToAnyCountry ? (
            <span className="rounded-full border border-rf-border px-3 py-1.5 text-sm text-rf-fg">{t("openToAny")}</span>
          ) : (
            talent.targetCountries.map((code) => (
              <span key={code} className="flex items-center gap-1.5 rounded-full border border-rf-border px-3 py-1.5 text-sm text-rf-fg">
                <Image src={targetCountryFlagUrl(code)} alt="" width={20} height={14} unoptimized className="h-3.5 w-5 rounded-sm object-cover" />
                {targetCountryName(code, locale)}
              </span>
            ))
          )}
        </div>
      </section>

      {talent.about && (
        <section className="space-y-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("profile.about")}</h2>
          <p className="text-sm leading-relaxed text-rf-fg-muted">{talent.about}</p>
        </section>
      )}

      <TalentContactButton
        slug={slug}
        whatsappNumber={talent.contactConsentGiven ? talent.whatsappNumber : null}
        whatsappLabel={t("profile.contactViaWhatsapp")}
        emailLabel={t("profile.contactViaEmail")}
        subject={`RexFoot Talents — ${fullName}`}
      />
    </div>
  );
}
