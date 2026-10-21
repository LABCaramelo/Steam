/**
 * WhatsApp number entry: a country picker (DDI) plus the national number, formatted as typed
 * and capped at the country's length. Brazil first; "Outro país" takes the full international number.
 */

export interface PhoneValue {
  /** ISO 3166 code of the chosen country, or INTL for another country. */
  iso: string;
  /** National number digits (with the country code, for INTL). */
  digits: string;
}

export interface Country {
  iso: string;
  name: string;
  ddi: string;
  /** Accepted national lengths. */
  lengths: number[];
  /** "#" is a digit; a function picks the mask from what was typed. */
  mask: string | ((digits: string) => string);
  example: string;
  /** Digits WhatsApp expects between the DDI and the national number (Argentine mobiles: 9). */
  whatsappPrefix?: string;
}

export const INTL = "INTL";

const brazilMask = (digits: string) => (digits.length > 2 && digits[2] !== "9" ? "(##) ####-####" : "(##) #####-####");

/** Brasil primeiro; os demais em ordem alfabética. Celulares, sem o 0 de discagem nacional. */
export const COUNTRIES: Country[] = [
  { iso: "BR", name: "Brasil", ddi: "55", lengths: [10, 11], mask: brazilMask, example: "(31) 98765-4321" },
  { iso: "DE", name: "Alemanha", ddi: "49", lengths: [10, 11], mask: "#### #######", example: "1512 3456789" },
  { iso: "AO", name: "Angola", ddi: "244", lengths: [9], mask: "### ### ###", example: "923 123 456" },
  { iso: "AR", name: "Argentina", ddi: "54", lengths: [10], mask: "## ####-####", example: "11 2345-6789", whatsappPrefix: "9" },
  { iso: "AU", name: "Austrália", ddi: "61", lengths: [9], mask: "### ### ###", example: "412 345 678" },
  { iso: "CA", name: "Canadá", ddi: "1", lengths: [10], mask: "(###) ###-####", example: "(416) 555-0123" },
  { iso: "CL", name: "Chile", ddi: "56", lengths: [9], mask: "# #### ####", example: "9 1234 5678" },
  { iso: "CO", name: "Colômbia", ddi: "57", lengths: [10], mask: "### ### ####", example: "321 123 4567" },
  { iso: "ES", name: "Espanha", ddi: "34", lengths: [9], mask: "### ## ## ##", example: "612 34 56 78" },
  { iso: "US", name: "Estados Unidos", ddi: "1", lengths: [10], mask: "(###) ###-####", example: "(201) 555-0123" },
  { iso: "FR", name: "França", ddi: "33", lengths: [9], mask: "# ## ## ## ##", example: "6 12 34 56 78" },
  { iso: "NL", name: "Holanda", ddi: "31", lengths: [9], mask: "# ########", example: "6 12345678" },
  { iso: "IE", name: "Irlanda", ddi: "353", lengths: [9], mask: "## ### ####", example: "85 012 3456" },
  { iso: "IT", name: "Itália", ddi: "39", lengths: [9, 10], mask: "### ### ####", example: "312 345 6789" },
  { iso: "JP", name: "Japão", ddi: "81", lengths: [10], mask: "## #### ####", example: "90 1234 5678" },
  { iso: "MX", name: "México", ddi: "52", lengths: [10], mask: "## #### ####", example: "55 1234 5678" },
  { iso: "MZ", name: "Moçambique", ddi: "258", lengths: [9], mask: "## ### ####", example: "82 123 4567" },
  { iso: "PY", name: "Paraguai", ddi: "595", lengths: [9], mask: "### ######", example: "981 123456" },
  { iso: "PE", name: "Peru", ddi: "51", lengths: [9], mask: "### ### ###", example: "912 345 678" },
  { iso: "PT", name: "Portugal", ddi: "351", lengths: [9], mask: "### ### ###", example: "912 345 678" },
  { iso: "GB", name: "Reino Unido", ddi: "44", lengths: [10], mask: "#### ######", example: "7400 123456" },
  { iso: "CH", name: "Suíça", ddi: "41", lengths: [9], mask: "## ### ## ##", example: "78 123 45 67" },
  { iso: "UY", name: "Uruguai", ddi: "598", lengths: [8], mask: "## ### ###", example: "94 231 234" },
  // E.164 allows up to 15 digits with the country code.
  { iso: INTL, name: "Outro país", ddi: "", lengths: [8, 9, 10, 11, 12, 13, 14, 15], mask: "### ### ### ### ###", example: "DDI + número" },
];

export const countryByIso = (iso: string) => COUNTRIES.find((country) => country.iso === iso) ?? COUNTRIES[0];

const maskOf = (country: Country, digits: string) =>
  typeof country.mask === "function" ? country.mask(digits) : country.mask;

/** Longest number this country takes, given what was typed (a Brazilian landline stops at 10). */
export const maxDigits = (country: Country, digits: string) => maskOf(country, digits).split("#").length - 1;

export const clampDigits = (country: Country, digits: string) => digits.slice(0, maxDigits(country, digits));

/** Separators appear only once the digit after them is typed: "(31", "(31) 9", "(31) 98765-4". */
export function formatPhone(country: Country, digits: string): string {
  const mask = maskOf(country, digits);
  let out = "";
  let next = 0;
  for (const char of mask) {
    if (next >= digits.length) break;
    out += char === "#" ? digits[next++] : char;
  }
  return out;
}

export function isCompletePhone({ iso, digits }: PhoneValue): boolean {
  const country = countryByIso(iso);
  // Brazil: area code without 0, then 9 digits for a mobile (starts with 9) or 8 for a landline.
  if (country.iso === "BR") return /^[1-9]{2}/.test(digits) && digits.length === maxDigits(country, digits);
  return country.lengths.includes(digits.length);
}

/** "+5531985869015": what the server and WhatsApp expect. */
export function toE164(value: PhoneValue): string {
  const country = countryByIso(value.iso);
  return `+${country.ddi}${country.whatsappPrefix ?? ""}${value.digits}`;
}

/** A pasted or autofilled "+55 31 98765-4321" picks its country; unknown codes go to "Outro país". */
export function parseInternational(text: string): PhoneValue {
  const digits = text.replace(/\D/g, "").replace(/^00/, "");
  const match = COUNTRIES
    .filter((country) => country.ddi && digits.startsWith(country.ddi))
    .sort((a, b) => b.ddi.length - a.ddi.length || (a.iso === "US" ? -1 : b.iso === "US" ? 1 : 0))[0];
  if (!match) return { iso: INTL, digits: clampDigits(countryByIso(INTL), digits) };
  let national = digits.slice(match.ddi.length);
  if (match.whatsappPrefix && national.startsWith(match.whatsappPrefix) && national.length > Math.max(...match.lengths)) {
    national = national.slice(match.whatsappPrefix.length);
  }
  return { iso: match.iso, digits: clampDigits(match, national) };
}

/** Caret index just after the n-th digit of a formatted number. */
export function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted[index]) && ++seen === count) return index + 1;
  }
  return formatted.length;
}

// ---------- remembered number ----------

/** O último WhatsApp usado neste navegador, para não digitar de novo. */
export const SAVED_PHONE_KEY = "lab:whatsapp";

export function loadSavedPhone(): PhoneValue | null {
  try {
    const saved = JSON.parse(localStorage.getItem(SAVED_PHONE_KEY) ?? "null");
    if (typeof saved?.iso !== "string" || typeof saved?.digits !== "string") return null;
    const country = countryByIso(saved.iso);
    return { iso: country.iso, digits: clampDigits(country, saved.digits.replace(/\D/g, "")) };
  } catch {
    return null;
  }
}

export function savePhone(value: PhoneValue) {
  try {
    localStorage.setItem(SAVED_PHONE_KEY, JSON.stringify({ iso: value.iso, digits: value.digits }));
  } catch {
    // localStorage restrito: o número só não fica lembrado
  }
}
