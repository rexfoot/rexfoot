import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Search } from "lucide-react";
import { getApprovedTalents } from "@/lib/data/talents";
import { TalentCard } from "@/components/talents/TalentCard";
import { EmptyState } from "@/components/EmptyState";
import { TARGET_COUNTRIES, TARGET_COUNTRY_GROUPS, targetCountryName } from "@/lib/talents/target-countries";
import { buildAlternates } from "@/lib/seo/alternates";
import type { TalentPosition, TalentSituation } from "@rexfoot/db";

const TALENT_POSITIONS: TalentPosition[] = [
  "GOALKEEPER",
  "CENTRE_BACK",
  "RIGHT_BACK",
  "LEFT_BACK",
  "DEFENSIVE_MIDFIELDER",
  "CENTRE_MIDFIELDER",
  "ATTACKING_MIDFIELDER",
  "RIGHT_WINGER",
  "LEFT_WINGER",
  "STRIKER",
];

const SITUATIONS: TalentSituation[] = ["FREE_AGENT", "IN_CLUB", "SEEKING_CLUB", "CONTRACT_ENDING"];

// Dynamique : dépend des searchParams à chaque requête, pas de cache pertinent ici.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("talents.discover"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/talents/decouvrir", locale) };
}

interface PageProps {
  searchParams: Promise<Record<string, string | undefined>>;
}

export default async function TalentsDiscoverPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const [t, locale] = await Promise.all([getTranslations("talents"), getLocale()]);

  const talents = await getApprovedTalents({
    currentCountry: params.currentCountry || undefined,
    nationality: params.nationality || undefined,
    position: (params.position as TalentPosition) || undefined,
    situation: (params.situation as TalentSituation) || undefined,
    targetCountry: params.targetCountry || undefined,
    minAge: params.minAge ? Number(params.minAge) : undefined,
    maxAge: params.maxAge ? Number(params.maxAge) : undefined,
    search: params.search || undefined,
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("discover.title")}</h1>

      <form method="get" className="grid gap-3 rounded-2xl border border-rf-border bg-rf-bg-card p-4 sm:grid-cols-2 lg:grid-cols-4">
        <input
          type="text"
          name="search"
          defaultValue={params.search ?? ""}
          placeholder={t("discover.searchPlaceholder")}
          className="col-span-full rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-2.5 text-sm text-rf-fg placeholder:text-rf-fg-subtle"
        />
        <select
          name="position"
          defaultValue={params.position ?? ""}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-3 py-2.5 text-sm text-rf-fg"
        >
          <option value="">{t("discover.filterPosition")}</option>
          {TALENT_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {t(`position.${p}`)}
            </option>
          ))}
        </select>
        <select
          name="situation"
          defaultValue={params.situation ?? ""}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-3 py-2.5 text-sm text-rf-fg"
        >
          <option value="">{t("discover.filterSituation")}</option>
          {SITUATIONS.map((s) => (
            <option key={s} value={s}>
              {t(`situation.${s}`)}
            </option>
          ))}
        </select>
        <select
          name="targetCountry"
          defaultValue={params.targetCountry ?? ""}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-3 py-2.5 text-sm text-rf-fg"
        >
          <option value="">{t("discover.filterTargetCountry")}</option>
          {TARGET_COUNTRY_GROUPS.map((group) => (
            <optgroup key={group} label={t(`countryGroup.${group}`)}>
              {TARGET_COUNTRIES.filter((c) => c.group === group).map((c) => (
                <option key={c.code} value={c.code}>
                  {targetCountryName(c.code, locale)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <input
          type="text"
          name="currentCountry"
          defaultValue={params.currentCountry ?? ""}
          placeholder={t("discover.filterCurrentCountry")}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-2.5 text-sm text-rf-fg placeholder:text-rf-fg-subtle"
        />
        <input
          type="text"
          name="nationality"
          defaultValue={params.nationality ?? ""}
          placeholder={t("discover.filterNationality")}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-2.5 text-sm text-rf-fg placeholder:text-rf-fg-subtle"
        />
        <input
          type="number"
          name="minAge"
          defaultValue={params.minAge ?? ""}
          placeholder={t("discover.filterAgeMin")}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-2.5 text-sm text-rf-fg placeholder:text-rf-fg-subtle"
        />
        <input
          type="number"
          name="maxAge"
          defaultValue={params.maxAge ?? ""}
          placeholder={t("discover.filterAgeMax")}
          className="rounded-xl border border-rf-border bg-rf-bg-elevated px-4 py-2.5 text-sm text-rf-fg placeholder:text-rf-fg-subtle"
        />
        <button
          type="submit"
          className="col-span-full flex items-center justify-center gap-2 rounded-xl bg-rf-orange px-4 py-2.5 text-sm font-bold text-rf-bg transition-opacity hover:opacity-90 sm:col-span-1"
        >
          <Search size={16} />
          {t("discover.searchButton")}
        </button>
      </form>

      <p className="text-sm text-rf-fg-muted">{t("discover.resultsCount", { count: talents.length })}</p>

      {talents.length === 0 ? (
        <EmptyState icon={Search} title={t("discover.noResultsTitle")} description={t("discover.noResultsDescription")} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {talents.map((talent) => (
            <TalentCard key={talent.slug} talent={talent} />
          ))}
        </div>
      )}
    </div>
  );
}
