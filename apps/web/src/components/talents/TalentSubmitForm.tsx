"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { CheckCircle2 } from "lucide-react";
import { AdminInput, AdminSelect, AdminButton, Banner, FieldGroup } from "@/components/admin/ui";
import { Link } from "@/i18n/navigation";
import {
  TARGET_COUNTRIES,
  TARGET_COUNTRY_GROUPS,
  targetCountryFlagUrl,
  targetCountryName,
} from "@/lib/talents/target-countries";

const TALENT_POSITIONS = [
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
] as const;

const SITUATIONS = ["FREE_AGENT", "IN_CLUB", "SEEKING_CLUB", "CONTRACT_ENDING"] as const;

// wa.me attend des chiffres seuls, sans "+" (section 10 du plan : +34 615 355 769).
const WHATSAPP_NUMBER = "34615355769";
const MINOR_AGE_THRESHOLD = 18;

function computeAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const hasNotHadBirthdayYet = now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate());
  if (hasNotHadBirthdayYet) age -= 1;
  return age;
}

export function TalentSubmitForm() {
  const t = useTranslations("talents");
  const locale = useLocale();
  const formRef = useRef<HTMLFormElement>(null);
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [targetCountries, setTargetCountries] = useState<Set<string>>(new Set());
  const [openToAnyCountry, setOpenToAnyCountry] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);

  const age = useMemo(() => computeAge(dateOfBirth), [dateOfBirth]);
  const isMinor = age !== null && age < MINOR_AGE_THRESHOLD;

  function toggleTargetCountry(code: string) {
    setTargetCountries((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formRef.current) return;
    setError(null);

    const formData = new FormData(formRef.current);
    const consentGiven = formData.get("consentGiven") === "on";
    const parentConsentGiven = formData.get("parentConsentGiven") === "on";

    if (!consentGiven) {
      setError(t("form.error"));
      return;
    }
    if (targetCountries.size === 0 && !openToAnyCountry) {
      setError(t("form.requiredTargetCountry"));
      return;
    }

    const payload = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      dateOfBirth,
      nationality: String(formData.get("nationality") ?? "").trim(),
      currentCountry: String(formData.get("currentCountry") ?? "").trim(),
      city: String(formData.get("city") ?? "").trim() || undefined,
      position: formData.get("position"),
      secondaryPosition: formData.get("secondaryPosition") || undefined,
      preferredFoot: formData.get("preferredFoot") || undefined,
      heightCm: formData.get("heightCm") ? Number(formData.get("heightCm")) : undefined,
      situation: formData.get("situation"),
      currentClub: String(formData.get("currentClub") ?? "").trim() || undefined,
      targetCountries: Array.from(targetCountries),
      openToAnyCountry,
      whatsappNumber: String(formData.get("whatsappNumber") ?? "").trim(),
      contactConsentGiven: formData.get("contactConsentGiven") === "on",
      consentGiven,
      parentConsentGiven,
    };

    setSubmitting(true);
    const response = await fetch("/api/talents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      setError(body?.error ?? t("form.error"));
      setSubmitting(false);
      return;
    }

    const message = t("confirmation.whatsappMessageTemplate", {
      lastName: payload.lastName,
      firstName: payload.firstName,
      age: age ?? "",
      nationality: payload.nationality,
      currentCountry: payload.currentCountry,
      city: payload.city ?? "",
      position: t(`position.${payload.position}`),
      club: payload.currentClub ?? "",
      situation: t(`situation.${payload.situation}`),
      targetCountries: openToAnyCountry
        ? t("openToAny")
        : Array.from(targetCountries)
            .map((code) => targetCountryName(code, locale))
            .join(", "),
    });
    setWhatsappUrl(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`);
    setSubmitting(false);
  }

  if (whatsappUrl) {
    return (
      <div className="mx-auto max-w-lg space-y-5 px-4 py-10 text-center">
        <CheckCircle2 size={40} className="mx-auto text-rf-success" />
        <h1 className="font-display text-2xl font-bold text-rf-fg">{t("confirmation.title")}</h1>
        <p className="text-base text-rf-fg-muted">{t("confirmation.body")}</p>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-rf-success px-6 py-3.5 text-base font-bold text-rf-bg transition-opacity hover:opacity-90"
        >
          {t("confirmation.whatsappCta")}
        </a>
        {/* La confusion réelle ("pas d'endroit pour la vidéo") vient de ce que
            le bouton ci-dessus ouvre juste WhatsApp avec un texte prérempli —
            joindre le fichier vidéo est une étape manuelle DANS WhatsApp,
            jamais évidente sans cette précision explicite. */}
        <p className="rounded-xl border border-rf-border bg-rf-bg-elevated p-3 text-sm font-medium text-rf-fg">{t("confirmation.attachHint")}</p>
        <p className="text-xs text-rf-fg-subtle">{t("confirmation.videoRules")}</p>
        <Link href="/talents" className="block text-sm font-semibold text-rf-orange">
          {t("confirmation.backHome")}
        </Link>
      </div>
    );
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-rf-fg">{t("form.title")}</h1>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("form.sectionPersonal")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label={t("form.firstName")} htmlFor="firstName">
            <AdminInput id="firstName" name="firstName" required />
          </FieldGroup>
          <FieldGroup label={t("form.lastName")} htmlFor="lastName">
            <AdminInput id="lastName" name="lastName" required />
          </FieldGroup>
        </div>
        <FieldGroup label={t("form.dateOfBirth")} htmlFor="dateOfBirth">
          <AdminInput
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            required
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
        </FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label={t("form.nationality")} htmlFor="nationality">
            <AdminInput id="nationality" name="nationality" required />
          </FieldGroup>
          <FieldGroup label={t("form.currentCountry")} htmlFor="currentCountry">
            <AdminInput id="currentCountry" name="currentCountry" required />
          </FieldGroup>
        </div>
        <FieldGroup label={t("form.city")} htmlFor="city">
          <AdminInput id="city" name="city" />
        </FieldGroup>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("form.sectionFootball")}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label={t("form.position")} htmlFor="position">
            <AdminSelect id="position" name="position" required defaultValue="">
              <option value="" disabled>
                —
              </option>
              {TALENT_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {t(`position.${p}`)}
                </option>
              ))}
            </AdminSelect>
          </FieldGroup>
          <FieldGroup label={t("form.secondaryPosition")} htmlFor="secondaryPosition">
            <AdminSelect id="secondaryPosition" name="secondaryPosition" defaultValue="">
              <option value="">—</option>
              {TALENT_POSITIONS.map((p) => (
                <option key={p} value={p}>
                  {t(`position.${p}`)}
                </option>
              ))}
            </AdminSelect>
          </FieldGroup>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <FieldGroup label={t("form.preferredFoot")} htmlFor="preferredFoot">
            <AdminSelect id="preferredFoot" name="preferredFoot" defaultValue="">
              <option value="">—</option>
              <option value="LEFT">{t("foot.LEFT")}</option>
              <option value="RIGHT">{t("foot.RIGHT")}</option>
              <option value="BOTH">{t("foot.BOTH")}</option>
            </AdminSelect>
          </FieldGroup>
          <FieldGroup label={t("form.height")} htmlFor="heightCm">
            <AdminInput id="heightCm" name="heightCm" type="number" min={100} max={230} />
          </FieldGroup>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("form.sectionSituation")}</h2>
        <FieldGroup label={t("form.sectionSituation")} htmlFor="situation">
          <AdminSelect id="situation" name="situation" required defaultValue="">
            <option value="" disabled>
              —
            </option>
            {SITUATIONS.map((s) => (
              <option key={s} value={s}>
                {t(`situation.${s}`)}
              </option>
            ))}
          </AdminSelect>
        </FieldGroup>
        <FieldGroup label={t("form.currentClub")} htmlFor="currentClub">
          <AdminInput id="currentClub" name="currentClub" />
        </FieldGroup>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("form.sectionTarget")}</h2>
        {TARGET_COUNTRY_GROUPS.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold text-rf-fg-muted">{t(`countryGroup.${group}`)}</p>
            <div className="flex flex-wrap gap-2">
              {TARGET_COUNTRIES.filter((c) => c.group === group).map((c) => {
                const selected = targetCountries.has(c.code);
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => toggleTargetCountry(c.code)}
                    className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors ${
                      selected ? "border-rf-orange bg-rf-orange/15 text-rf-orange" : "border-rf-border text-rf-fg-muted"
                    }`}
                  >
                    <Image
                      src={targetCountryFlagUrl(c.code)}
                      alt=""
                      width={20}
                      height={14}
                      unoptimized
                      className="h-3.5 w-5 rounded-sm object-cover"
                    />
                    {targetCountryName(c.code, locale)}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <label className="flex items-center gap-2 text-sm font-medium text-rf-fg">
          <input
            type="checkbox"
            checked={openToAnyCountry}
            onChange={(e) => setOpenToAnyCountry(e.target.checked)}
            className="h-4 w-4 rounded border-rf-border accent-rf-orange"
          />
          {t("openToAny")}
        </label>
      </section>

      <section className="space-y-4">
        <FieldGroup label={t("form.whatsappNumber")} htmlFor="whatsappNumber" hint="Ex. +212 6 12 34 56 78">
          <AdminInput id="whatsappNumber" name="whatsappNumber" type="tel" required />
        </FieldGroup>
        <label className="flex items-center gap-2 text-sm font-medium text-rf-fg">
          <input type="checkbox" name="contactConsentGiven" className="h-4 w-4 rounded border-rf-border accent-rf-orange" />
          {t("form.contactConsent")}
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-rf-border bg-rf-bg-elevated p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-rf-fg-subtle">{t("form.sectionConsent")}</h2>
        <label className="flex items-start gap-2 text-sm text-rf-fg">
          <input type="checkbox" name="consentGiven" required className="mt-0.5 h-4 w-4 shrink-0 rounded border-rf-border accent-rf-orange" />
          {t("form.consentText")}
        </label>
        {isMinor && (
          <>
            <Banner kind="error">{t("form.minorNotice")}</Banner>
            <label className="flex items-start gap-2 text-sm text-rf-fg">
              <input
                type="checkbox"
                name="parentConsentGiven"
                required
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-rf-border accent-rf-orange"
              />
              {t("form.parentConsentText")}
            </label>
          </>
        )}
      </section>

      {error && <Banner kind="error">{error}</Banner>}

      <AdminButton type="submit" disabled={submitting} className="w-full sm:w-auto">
        {submitting ? t("form.submitting") : t("form.submit")}
      </AdminButton>
    </form>
  );
}
