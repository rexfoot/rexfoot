import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { Globe2, Users } from "lucide-react";
import { getNationalityOptions, getPlayersByNationalityOnDate } from "@/lib/data/nationalities";
import { canonicalNationality } from "@/lib/nationality-flags";
import { NationalityPicker } from "@/components/NationalityPicker";
import { NationalityDateFilter, type NationalityDateOption } from "@/components/NationalityDateFilter";
import { NationalityPlayerCard } from "@/components/NationalityPlayerCard";
import { NationalityFlag } from "@/components/NationalityFlag";
import { EmptyState } from "@/components/EmptyState";
import { buildAlternates } from "@/lib/seo/alternates";

// Dynamique : évite tout appel Prisma au moment du `docker build` — voir
// page.tsx (accueil) pour le détail.
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("nationality"), getLocale()]);
  return { title: t("title"), description: t("metaDescription"), alternates: buildAlternates("/nationalite", locale) };
}

interface PageProps {
  searchParams: Promise<{ nationality?: string; date?: string }>;
}

function resolveDate(option: NationalityDateOption): Date {
  const date = new Date();
  if (option === "tomorrow") date.setDate(date.getDate() + 1);
  if (option === "dayAfterTomorrow") date.setDate(date.getDate() + 2);
  return date;
}

function isDateOption(value: string | undefined): value is NationalityDateOption {
  return value === "today" || value === "tomorrow" || value === "dayAfterTomorrow";
}

export default async function NationalityPage({ searchParams }: PageProps) {
  const { nationality: rawNationality, date: rawDate } = await searchParams;
  const t = await getTranslations("nationality");
  const dateOption: NationalityDateOption = isDateOption(rawDate) ? rawDate : "today";
  const nationality = rawNationality ? canonicalNationality(rawNationality) : undefined;

  const [options, entries] = await Promise.all([
    getNationalityOptions(),
    nationality ? getPlayersByNationalityOnDate(nationality, resolveDate(dateOption)) : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-5 px-4 py-6">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-rf-fg">
        <Globe2 className="text-rf-orange" size={22} />
        {t("title")}
      </h1>

      <NationalityPicker options={options} selected={nationality} date={dateOption} />

      {nationality && (
        <>
          <NationalityDateFilter nationality={nationality} selected={dateOption} />

          <h2 className="flex items-center gap-2 font-display text-base font-semibold text-rf-fg">
            <NationalityFlag url={options.find((o) => o.name === nationality)?.flagUrl ?? null} name={nationality} size={22} />
            {t("resultsTitle", { country: nationality })}
          </h2>

          {entries && entries.length === 0 ? (
            <EmptyState icon={Users} title={t("noPlayers")} />
          ) : (
            <div className="space-y-3">
              {entries?.map((entry) => (
                <NationalityPlayerCard key={`${entry.player.id}-${entry.match.id}`} entry={entry} />
              ))}
            </div>
          )}
        </>
      )}

      {!nationality && <EmptyState icon={Globe2} title={t("chooseCountry")} />}
    </div>
  );
}
