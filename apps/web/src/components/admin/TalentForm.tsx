"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { TalentModerationStatus, TalentPosition, TalentSituation, PreferredFoot } from "@rexfoot/db";
import { AdminInput, AdminTextarea, AdminSelect, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";
import { TalentVideoUpload } from "@/components/admin/TalentVideoUpload";
import { TARGET_COUNTRIES, TARGET_COUNTRY_GROUPS } from "@/lib/talents/target-countries";

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

const POSITION_LABELS: Record<TalentPosition, string> = {
  GOALKEEPER: "Gardien",
  CENTRE_BACK: "Défenseur central",
  RIGHT_BACK: "Latéral droit",
  LEFT_BACK: "Latéral gauche",
  DEFENSIVE_MIDFIELDER: "Milieu défensif",
  CENTRE_MIDFIELDER: "Milieu central",
  ATTACKING_MIDFIELDER: "Milieu offensif",
  RIGHT_WINGER: "Ailier droit",
  LEFT_WINGER: "Ailier gauche",
  STRIKER: "Attaquant",
};

const SITUATIONS: TalentSituation[] = ["FREE_AGENT", "IN_CLUB", "SEEKING_CLUB", "CONTRACT_ENDING"];
const SITUATION_LABELS: Record<TalentSituation, string> = {
  FREE_AGENT: "Sans club",
  IN_CLUB: "En club",
  SEEKING_CLUB: "Recherche un club",
  CONTRACT_ENDING: "Fin de contrat",
};

const STATUSES: TalentModerationStatus[] = ["PENDING", "APPROVED", "REJECTED", "HIDDEN"];
const STATUS_LABELS: Record<TalentModerationStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Validé",
  REJECTED: "Refusé",
  HIDDEN: "Masqué",
};

interface TalentFormInitial {
  firstName: string;
  lastName: string;
  dateOfBirth: string; // yyyy-mm-dd
  nationality: string;
  currentCountry: string;
  city: string | null;
  position: TalentPosition;
  secondaryPosition: TalentPosition | null;
  preferredFoot: PreferredFoot | null;
  heightCm: number | null;
  situation: TalentSituation;
  currentClub: string | null;
  targetCountries: string[];
  openToAnyCountry: boolean;
  about: string | null;
  photoUrl: string | null;
  contactConsentGiven: boolean;
  status: TalentModerationStatus;
  videoId: string | null;
}

interface TalentFormProps {
  talentId: string;
  initial: TalentFormInitial;
}

export function TalentForm({ talentId, initial }: TalentFormProps) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState<string | null>(initial.photoUrl);
  const [targetCountries, setTargetCountries] = useState<Set<string>>(new Set(initial.targetCountries));
  const [openToAnyCountry, setOpenToAnyCountry] = useState(initial.openToAnyCountry);

  function toggleTargetCountry(code: string) {
    setTargetCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  function handlePhotoChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    if (!formRef.current) return;
    setError(null);
    setPending(true);

    const formData = new FormData(formRef.current);
    formData.delete("targetCountries");
    for (const code of targetCountries) formData.append("targetCountries", code);
    if (openToAnyCountry) formData.set("openToAnyCountry", "on");

    const response = await fetch(`/api/admin/talents/${talentId}`, { method: "PATCH", body: formData });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? "Une erreur est survenue, réessaie.");
      setPending(false);
      return;
    }

    router.push("/admin/talents?saved=1");
    router.refresh();
  }

  return (
    <form ref={formRef} className="max-w-2xl space-y-5">
      <FieldGroup label="Statut de modération" htmlFor="status">
        <AdminSelect id="status" name="status" defaultValue={initial.status}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </AdminSelect>
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Prénom" htmlFor="firstName">
          <AdminInput id="firstName" name="firstName" defaultValue={initial.firstName} required />
        </FieldGroup>
        <FieldGroup label="Nom" htmlFor="lastName">
          <AdminInput id="lastName" name="lastName" defaultValue={initial.lastName} required />
        </FieldGroup>
      </div>

      <FieldGroup label="Date de naissance" htmlFor="dateOfBirth">
        <AdminInput id="dateOfBirth" name="dateOfBirth" type="date" defaultValue={initial.dateOfBirth} required />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Nationalité" htmlFor="nationality">
          <AdminInput id="nationality" name="nationality" defaultValue={initial.nationality} required />
        </FieldGroup>
        <FieldGroup label="Pays actuel" htmlFor="currentCountry">
          <AdminInput id="currentCountry" name="currentCountry" defaultValue={initial.currentCountry} required />
        </FieldGroup>
      </div>

      <FieldGroup label="Ville" htmlFor="city">
        <AdminInput id="city" name="city" defaultValue={initial.city ?? ""} />
      </FieldGroup>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Poste principal" htmlFor="position">
          <AdminSelect id="position" name="position" defaultValue={initial.position} required>
            {TALENT_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABELS[p]}
              </option>
            ))}
          </AdminSelect>
        </FieldGroup>
        <FieldGroup label="Poste secondaire" htmlFor="secondaryPosition">
          <AdminSelect id="secondaryPosition" name="secondaryPosition" defaultValue={initial.secondaryPosition ?? ""}>
            <option value="">—</option>
            {TALENT_POSITIONS.map((p) => (
              <option key={p} value={p}>
                {POSITION_LABELS[p]}
              </option>
            ))}
          </AdminSelect>
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Pied fort" htmlFor="preferredFoot">
          <AdminSelect id="preferredFoot" name="preferredFoot" defaultValue={initial.preferredFoot ?? ""}>
            <option value="">—</option>
            <option value="LEFT">Gauche</option>
            <option value="RIGHT">Droit</option>
            <option value="BOTH">Les deux</option>
          </AdminSelect>
        </FieldGroup>
        <FieldGroup label="Taille (cm)" htmlFor="heightCm">
          <AdminInput id="heightCm" name="heightCm" type="number" defaultValue={initial.heightCm ?? ""} />
        </FieldGroup>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FieldGroup label="Situation" htmlFor="situation">
          <AdminSelect id="situation" name="situation" defaultValue={initial.situation} required>
            {SITUATIONS.map((s) => (
              <option key={s} value={s}>
                {SITUATION_LABELS[s]}
              </option>
            ))}
          </AdminSelect>
        </FieldGroup>
        <FieldGroup label="Club actuel" htmlFor="currentClub">
          <AdminInput id="currentClub" name="currentClub" defaultValue={initial.currentClub ?? ""} />
        </FieldGroup>
      </div>

      <FieldGroup label="Pays recherchés" hint="Modifiés depuis le formulaire du joueur — corrige ici si besoin.">
        <div className="space-y-3">
          {TARGET_COUNTRY_GROUPS.map((group) => (
            <div key={group}>
              <div className="flex flex-wrap gap-2">
                {TARGET_COUNTRIES.filter((c) => c.group === group).map((c) => {
                  const selected = targetCountries.has(c.code);
                  return (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => toggleTargetCountry(c.code)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                        selected ? "border-rf-orange bg-rf-orange/15 text-rf-orange" : "border-rf-border text-rf-fg-muted"
                      }`}
                    >
                      {c.code}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <label className="flex items-center gap-2 text-sm text-rf-fg">
            <input
              type="checkbox"
              checked={openToAnyCountry}
              onChange={(e) => setOpenToAnyCountry(e.target.checked)}
              className="h-4 w-4 rounded border-rf-border accent-rf-orange"
            />
            Ouvert à toutes les opportunités
          </label>
        </div>
      </FieldGroup>

      <FieldGroup label="À propos (optionnel)" htmlFor="about" hint="Court texte de présentation, repris de la vidéo/du message WhatsApp.">
        <AdminTextarea id="about" name="about" defaultValue={initial.about ?? ""} rows={3} />
      </FieldGroup>

      <FieldGroup label="Photo" htmlFor="photo" hint="JPG, PNG ou WebP, 8 Mo maximum.">
        <input
          id="photo"
          name="photo"
          type="file"
          accept="image/*"
          onChange={handlePhotoChange}
          className="block w-full text-sm text-rf-fg-muted file:mr-4 file:rounded-lg file:border-0 file:bg-rf-orange file:px-4 file:py-2 file:text-sm file:font-bold file:text-rf-bg file:cursor-pointer"
        />
        {preview && (
          <div className="relative mt-3 h-24 w-24 overflow-hidden rounded-full border border-rf-border bg-rf-bg-elevated">
            <Image src={preview} alt="Aperçu" fill unoptimized className="object-cover" />
          </div>
        )}
      </FieldGroup>

      <label className="flex items-center gap-2 text-sm font-medium text-rf-fg">
        <input
          type="checkbox"
          name="contactConsentGiven"
          defaultChecked={initial.contactConsentGiven}
          className="h-4 w-4 rounded border-rf-border accent-rf-orange"
        />
        Le joueur autorise l&apos;affichage d&apos;un bouton WhatsApp direct sur son profil
      </label>

      <TalentVideoUpload talentId={talentId} hasExistingVideo={Boolean(initial.videoId)} />

      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton type="button" disabled={pending} onClick={handleSave} className="w-full sm:w-auto">
        {pending ? "Enregistrement…" : "Enregistrer"}
      </AdminButton>
    </form>
  );
}
