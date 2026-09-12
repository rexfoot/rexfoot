import { notFound } from "next/navigation";
import { getTalentByIdForAdmin } from "@/lib/data/talents-admin";
import { TalentForm } from "@/components/admin/TalentForm";
import { requireAdminPagePermission } from "@/lib/auth/admin-guard";

interface PageProps {
  params: Promise<{ id: string }>;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function AdminTalentEditPage({ params }: PageProps) {
  await requireAdminPagePermission("manageTalents");
  const { id } = await params;
  const talent = await getTalentByIdForAdmin(id);
  if (!talent) notFound();

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-rf-fg">
        {talent.firstName} {talent.lastName}
      </h1>
      <TalentForm
        talentId={talent.id}
        initial={{
          firstName: talent.firstName,
          lastName: talent.lastName,
          dateOfBirth: toDateInputValue(talent.dateOfBirth),
          nationality: talent.nationality,
          currentCountry: talent.currentCountry,
          city: talent.city,
          position: talent.position,
          secondaryPosition: talent.secondaryPosition,
          preferredFoot: talent.preferredFoot,
          heightCm: talent.heightCm,
          situation: talent.situation,
          currentClub: talent.currentClub,
          targetCountries: talent.targetCountries,
          openToAnyCountry: talent.openToAnyCountry,
          about: talent.about,
          photoUrl: talent.photoUrl,
          contactConsentGiven: talent.contactConsentGiven,
          status: talent.status,
          videoId: talent.videoId,
        }}
      />
    </div>
  );
}
