import type { Catalogue, LensOptions } from "@samply/lens";
import translationsEn from "../config/translations-en.json";

export type Language = "de" | "en";

const STORAGE_KEY = "ccp-explorer-language";

/**
 * The language is taken from the `lang` URL parameter, then from local
 * storage, and defaults to German.
 */
function detectLanguage(): Language {
  const param = new URLSearchParams(window.location.search).get("lang");
  if (param === "de" || param === "en") return param;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "de" || stored === "en") return stored;
  } catch {
    // Local storage may be unavailable, e.g. in private browsing mode
  }
  return "de";
}

export const language: Language = detectLanguage();

/**
 * Switch the language by reloading the page. Lens reads the language only
 * once when rendering, so a reload is the simplest way to update all texts.
 */
export function setLanguage(newLanguage: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, newLanguage);
  } catch {
    // Local storage may be unavailable, e.g. in private browsing mode
  }
  const url = new URL(window.location.href);
  url.searchParams.set("lang", newLanguage);
  translateQueryParam(url, newLanguage);
  window.location.href = url.toString();
}

const dictionaries: Record<Language, Record<string, string>> = {
  en: translationsEn,
  de: Object.fromEntries(
    Object.entries(translationsEn).map(([de, en]) => [en, de]),
  ),
};

/** Translate a German text to the current language (and back) */
function translateText(text: string, target: Language = language): string {
  return dictionaries[target][text] ?? text;
}

/** Pick the text for the current language */
export function t(texts: Record<Language, string>): string {
  return texts[language];
}

/**
 * Translate the catalogue texts to the current language. The catalogue is
 * maintained in German, `translations-en.json` maps German texts to English.
 * Only names, descriptions and info texts are translated, aggregated values
 * contain codes that are sent to the sites.
 */
export function translateCatalogue(catalogue: Catalogue): Catalogue {
  if (language === "de") return catalogue;
  return translateFields(structuredClone(catalogue)) as Catalogue;
}

function translateFields(node: unknown): unknown {
  if (Array.isArray(node)) {
    for (const child of node) translateFields(child);
  } else if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    for (const [field, value] of Object.entries(record)) {
      if (field === "aggregatedValue") continue;
      if (
        (field === "name" || field === "description") &&
        typeof value === "string"
      ) {
        record[field] = translateText(value);
      } else if (field === "infoButtonText" && Array.isArray(value)) {
        record[field] = value.map((text) =>
          typeof text === "string" ? translateText(text) : text,
        );
      } else {
        translateFields(value);
      }
    }
  }
  return node;
}

/**
 * Translate all texts in the options (chart hints, tooltips, legends, table
 * headers etc.) to the current language.
 */
export function translateOptions(options: LensOptions): LensOptions {
  if (language === "de") return options;
  const translated = translateStrings(structuredClone(options)) as LensOptions;
  translated.language = language;
  return translated;
}

function translateStrings(node: unknown): unknown {
  if (typeof node === "string") return translateText(node);
  if (Array.isArray(node)) return node.map(translateStrings);
  if (typeof node === "object" && node !== null) {
    return Object.fromEntries(
      Object.entries(node).map(([field, value]) => [
        field,
        translateStrings(value),
      ]),
    );
  }
  return node;
}

/**
 * The search bar stores the query including the display names of the
 * selected criteria in the URL. Translate those names so that the selected
 * criteria are shown in the new language after reloading.
 */
function translateQueryParam(url: URL, target: Language) {
  const queryParam = url.searchParams.get("query");
  if (queryParam === null) return;
  let query: unknown;
  try {
    query = JSON.parse(queryParam);
  } catch {
    return;
  }
  translateQueryNames(query, target);
  url.searchParams.set("query", JSON.stringify(query));
}

function translateQueryNames(node: unknown, target: Language) {
  if (Array.isArray(node)) {
    for (const child of node) translateQueryNames(child, target);
  } else if (typeof node === "object" && node !== null) {
    const record = node as Record<string, unknown>;
    for (const field of ["name", "description"]) {
      if (typeof record[field] === "string") {
        record[field] = translateText(record[field], target);
      }
    }
    if (Array.isArray(record.values)) {
      translateQueryNames(record.values, target);
    }
  }
}
