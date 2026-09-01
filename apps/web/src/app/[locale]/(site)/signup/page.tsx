import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { SignupPageClient } from "./SignupPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  return { title: t("signup"), alternates: buildAlternates("/signup", locale) };
}

export default function SignupPage() {
  return <SignupPageClient />;
}
