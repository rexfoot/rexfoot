/**
 * football-data.org renvoie la nationalité d'un joueur en texte libre (nom de
 * pays en anglais), jamais un code ISO — donc pas d'image de drapeau fournie
 * comme pour les clubs/compétitions (crestUrl/logoUrl). On dérive nous-mêmes
 * un code à partir du nom, en couvrant large (tous les pays courants, pas
 * seulement ceux déjà en base) pour que la fonctionnalité reste générique
 * quand de nouvelles nationalités apparaissent.
 *
 * Volontairement une image (flagcdn.com, gratuit, sans clé) plutôt qu'un
 * emoji drapeau : Windows n'affiche pas les séquences d'indicateurs régionaux
 * comme un vrai drapeau (juste les deux lettres du code, ex. "MA") — vérifié
 * en testant la fonctionnalité, pas une hypothèse.
 */
const FLAGCDN_BASE = "https://flagcdn.com";

/**
 * Angleterre/Écosse/Pays de Galles/Irlande du Nord n'ont pas de code ISO 3166-1
 * propre (rattachés à GB) — flagcdn.com expose ces quatre-là via des codes
 * dédiés (gb-eng, gb-sct, gb-wls, gb-nir) plutôt qu'un ISO2 standard.
 */
const SPECIAL_CODES: Record<string, string> = {
  England: "gb-eng",
  Scotland: "gb-sct",
  Wales: "gb-wls",
  "Northern Ireland": "gb-nir",
  Kosovo: "xk",
};

/**
 * Variantes connues d'un même pays observées dans nos données (orthographes
 * différentes selon la page source synchronisée) — fusionnées sous un seul
 * nom canonique pour ne jamais dupliquer un pays dans le sélecteur.
 */
export const NATIONALITY_ALIASES: Record<string, string> = {
  USA: "United States",
  "Cote d'Ivoire": "Ivory Coast",
  "Côte d'Ivoire": "Ivory Coast",
  "DR Congo": "Congo DR",
  "Congo-Kinshasa": "Congo DR",
  "Congo-Brazzaville": "Congo",
  "Cape Verde": "Cape Verde Islands",
  "Korea Republic": "South Korea",
  "Korea, South": "South Korea",
};

/** Nom canonique tel qu'affiché/recherché — résout les variantes ci-dessus, sinon renvoie tel quel. */
export function canonicalNationality(raw: string): string {
  return NATIONALITY_ALIASES[raw] ?? raw;
}

const ISO2_BY_NATIONALITY: Record<string, string> = {
  Afghanistan: "af", Albania: "al", Algeria: "dz", Andorra: "ad", Angola: "ao",
  Argentina: "ar", Armenia: "am", Australia: "au", Austria: "at", Azerbaijan: "az",
  Bahrain: "bh", Bangladesh: "bd", Belarus: "by", Belgium: "be", Belize: "bz",
  Benin: "bj", Bolivia: "bo", "Bosnia-Herzegovina": "ba", "Bosnia and Herzegovina": "ba",
  Botswana: "bw", Brazil: "br", Bulgaria: "bg", "Burkina Faso": "bf", Burundi: "bi",
  Cambodia: "kh", Cameroon: "cm", Canada: "ca", "Cape Verde Islands": "cv",
  "Central African Republic": "cf", Chad: "td", Chile: "cl", "China PR": "cn", China: "cn",
  Colombia: "co", Comoros: "km", Congo: "cg", "Congo DR": "cd", "Costa Rica": "cr",
  Croatia: "hr", Cuba: "cu", Curacao: "cw", Cyprus: "cy", "Czech Republic": "cz",
  Denmark: "dk", Djibouti: "dj", "Dominican Republic": "do", Ecuador: "ec",
  Egypt: "eg", "El Salvador": "sv", "Equatorial Guinea": "gq", Eritrea: "er",
  Estonia: "ee", Eswatini: "sz", Ethiopia: "et", Fiji: "fj", Finland: "fi",
  France: "fr", Gabon: "ga", Gambia: "gm", Georgia: "ge", Germany: "de",
  Ghana: "gh", Greece: "gr", Grenada: "gd", Guadeloupe: "gp", Guatemala: "gt",
  Guinea: "gn", "Guinea-Bissau": "gw", Guyana: "gy", Haiti: "ht", Honduras: "hn",
  Hungary: "hu", Iceland: "is", India: "in", Indonesia: "id", Iran: "ir",
  Iraq: "iq", Ireland: "ie", Israel: "il", Italy: "it", "Ivory Coast": "ci",
  Jamaica: "jm", Japan: "jp", Jordan: "jo", Kazakhstan: "kz", Kenya: "ke",
  Kuwait: "kw", Kyrgyzstan: "kg", Laos: "la", Latvia: "lv", Lebanon: "lb",
  Lesotho: "ls", Liberia: "lr", Libya: "ly", Liechtenstein: "li", Lithuania: "lt",
  Luxembourg: "lu", Madagascar: "mg", Malawi: "mw", Malaysia: "my", Mali: "ml",
  Malta: "mt", Martinique: "mq", Mauritania: "mr", Mauritius: "mu", Mexico: "mx",
  Moldova: "md", Monaco: "mc", Mongolia: "mn", Montenegro: "me", Morocco: "ma",
  Mozambique: "mz", Myanmar: "mm", Namibia: "na", Nepal: "np", Netherlands: "nl",
  "New Caledonia": "nc", "New Zealand": "nz", Nicaragua: "ni", Niger: "ne",
  Nigeria: "ng", "North Macedonia": "mk", Norway: "no", Oman: "om",
  Pakistan: "pk", Palestine: "ps", Panama: "pa", "Papua New Guinea": "pg",
  Paraguay: "py", Peru: "pe", Philippines: "ph", Poland: "pl", Portugal: "pt",
  "Puerto Rico": "pr", Qatar: "qa", Romania: "ro", Russia: "ru", Rwanda: "rw",
  "Saudi Arabia": "sa", Senegal: "sn", Serbia: "rs", "Sierra Leone": "sl",
  Singapore: "sg", Slovakia: "sk", Slovenia: "si", "South Africa": "za",
  "South Korea": "kr", "South Sudan": "ss", Spain: "es", "Sri Lanka": "lk",
  Sudan: "sd", Suriname: "sr", Sweden: "se", Switzerland: "ch", Syria: "sy",
  Taiwan: "tw", Tajikistan: "tj", Tanzania: "tz", Thailand: "th", Togo: "tg",
  "Trinidad and Tobago": "tt", Tunisia: "tn", Turkey: "tr", Turkmenistan: "tm",
  Uganda: "ug", Ukraine: "ua", "United Arab Emirates": "ae", "United States": "us",
  Uruguay: "uy", Uzbekistan: "uz", Vanuatu: "vu", Venezuela: "ve", Vietnam: "vn",
  Yemen: "ye", Zambia: "zm", Zimbabwe: "zw",
};

/** Code flagcdn.com (ISO2, ou l'un des codes spéciaux ci-dessus) — `null` si inconnu. */
export function nationalityCode(name: string): string | null {
  return SPECIAL_CODES[name] ?? ISO2_BY_NATIONALITY[name] ?? null;
}

/** URL d'image de drapeau (flagcdn.com) pour une nationalité déjà canonicalisée — `null` si inconnue (jamais de drapeau inventé). */
export function nationalityFlagUrl(name: string): string | null {
  const code = nationalityCode(name);
  return code ? `${FLAGCDN_BASE}/h40/${code}.png` : null;
}

/**
 * Code ISO 3166-1 "standard" pour Intl.DisplayNames — les quatre nations
 * britanniques n'en ont pas (rattachées à GB), donc pas de traduction FR/ES
 * automatique possible pour elles : la recherche reste alors limitée au nom
 * anglais pour ces quatre-là.
 */
function iso2ForDisplayNames(name: string): string | null {
  return ISO2_BY_NATIONALITY[name] ?? null;
}

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Termes de recherche pour cette nationalité : le nom anglais canonique (celui
 * affiché) + ses traductions français/espagnol via Intl.DisplayNames (aucune
 * table à maintenir à la main) — pour que taper "Maroc" ou "Marruecos" trouve
 * "Morocco" même si le nom affiché reste en anglais.
 */
export function nationalitySearchTerms(name: string): string[] {
  const terms = [name];
  const iso2 = iso2ForDisplayNames(name);
  if (iso2) {
    try {
      terms.push(new Intl.DisplayNames(["fr"], { type: "region" }).of(iso2.toUpperCase()) ?? name);
      terms.push(new Intl.DisplayNames(["es"], { type: "region" }).of(iso2.toUpperCase()) ?? name);
    } catch {
      // Intl.DisplayNames indisponible (environnement très ancien) : repli sur le seul nom anglais.
    }
  }
  return terms.map(stripDiacritics);
}
