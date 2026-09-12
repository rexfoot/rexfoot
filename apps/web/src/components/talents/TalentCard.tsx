import Image from "next/image";
import { getTranslations, getLocale } from "next-intl/server";
import { User as UserIcon, MapPin } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { targetCountryFlagUrl, targetCountryName } from "@/lib/talents/target-countries";
import type { TalentPosition, TalentSituation } from "@rexfoot/db";

interface TalentCardProps {
  talent: {
    slug: string;
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    nationality: string;
    currentCountry: string;
    photoUrl: string | null;
    position: TalentPosition;
    situation: TalentSituation;
    targetCountries: string[];
    openToAnyCountry: boolean;
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

/** Server Component — appelée depuis decouvrir/page.tsx, elle-même déjà server. */
export async function TalentCard({ talent }: TalentCardProps) {
  const [t, locale] = await Promise.all([getTranslations("talents"), getLocale()]);
  const age = computeAge(talent.dateOfBirth);

  return (
    <Link
      href={`/talents/${talent.slug}`}
      className="group block overflow-hidden rounded-2xl border border-rf-border bg-rf-bg-card transition-colors hover:border-rf-orange/40"
    >
      <div className="relative aspect-square overflow-hidden bg-rf-bg-elevated">
        {talent.photoUrl ? (
          <Image src={talent.photoUrl} alt={`${talent.firstName} ${talent.lastName}`} fill unoptimized className="object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <UserIcon size={28} className="text-rf-fg-subtle" />
          </div>
        )}
      </div>
      <div className="space-y-1.5 p-4">
        <h3 className="font-medium text-rf-fg">
          {talent.firstName} {talent.lastName}
        </h3>
        <p className="text-sm text-rf-fg-muted">
          {talent.nationality} · {t("profile.age", { age })} · {t(`position.${talent.position}`)}
        </p>
        <p className="flex items-center gap-1 text-xs text-rf-fg-subtle">
          <MapPin size={12} />
          {talent.currentCountry}
        </p>
        <span className="inline-block rounded-full bg-rf-orange/15 px-2.5 py-0.5 text-xs font-semibold text-rf-orange">
          {t(`situation.${talent.situation}`)}
        </span>
        <div className="flex flex-wrap gap-1 pt-1">
          {talent.openToAnyCountry ? (
            <span className="text-xs text-rf-fg-subtle">{t("openToAny")}</span>
          ) : (
            talent.targetCountries.slice(0, 3).map((code) => (
              <Image
                key={code}
                src={targetCountryFlagUrl(code)}
                alt={targetCountryName(code, locale)}
                title={targetCountryName(code, locale)}
                width={18}
                height={13}
                unoptimized
                className="h-3 w-[18px] rounded-sm object-cover"
              />
            ))
          )}
        </div>
      </div>
    </Link>
  );
}
