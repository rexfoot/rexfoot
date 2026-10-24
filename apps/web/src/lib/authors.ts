/**
 * Auteurs identifiés de RexFoot, avec une page publique /auteur/[slug].
 *
 * But SEO : qu'une recherche Google sur le nom complet d'un auteur mène à
 * RexFoot (page auteur dont le <title> contient le nom, signature d'article
 * liée à cette page, données structurées Person/ProfilePage).
 *
 * `displayName` doit correspondre exactement à `User.displayName` en base :
 * c'est par lui qu'on relie un article (NewsArticle.author) à sa page auteur.
 * `sameAs` : profils publics de la même personne (YouTube, Facebook...) —
 * à compléter uniquement avec des liens confirmés par l'intéressé.
 */
export interface AuthorProfile {
  slug: string;
  displayName: string;
  jobTitle: Record<string, string>;
  bio: Record<string, string>;
  sameAs: string[];
}

export const AUTHORS: AuthorProfile[] = [
  {
    slug: "hicham-jikh-cheddad",
    displayName: "Hicham Jikh Cheddad",
    jobTitle: {
      fr: "Fondateur et directeur de la publication de RexFoot",
      en: "Founder and publication director of RexFoot",
      es: "Fundador y director de la publicación de RexFoot",
    },
    bio: {
      fr: "Hicham Jikh Cheddad est le fondateur de RexFoot, média consacré au football. Directeur de la publication, il est responsable de la ligne éditoriale et de l’ensemble des contenus publiés sur le site. Il signe des articles sur le football marocain, européen et international.",
      en: "Hicham Jikh Cheddad is the founder of RexFoot, a football media outlet. As publication director, he is responsible for the editorial line and all content published on the site. He writes about Moroccan, European and international football.",
      es: "Hicham Jikh Cheddad es el fundador de RexFoot, medio dedicado al fútbol. Como director de la publicación, es responsable de la línea editorial y de todos los contenidos publicados en el sitio. Escribe sobre fútbol marroquí, europeo e internacional.",
    },
    sameAs: ["https://www.youtube.com/@rexfootcom"],
  },
];

export function getAuthorBySlug(slug: string): AuthorProfile | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

export function getAuthorByName(name: string | null | undefined): AuthorProfile | undefined {
  if (!name) return undefined;
  return AUTHORS.find((a) => a.displayName === name);
}

export function pick(map: Record<string, string>, locale: string): string {
  return map[locale] ?? map.fr;
}
