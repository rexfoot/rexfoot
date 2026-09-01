import type { Metadata } from "next";
import { getTranslations, getLocale } from "next-intl/server";
import { buildAlternates } from "@/lib/seo/alternates";
import { LoginPageClient } from "./LoginPageClient";

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations("auth"), getLocale()]);
  return { title: t("login"), alternates: buildAlternates("/login", locale) };
}

export default function LoginPage() {
  return <LoginPageClient />;
}
