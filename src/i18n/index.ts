import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import en from "./locales/en.json";
import zhCN from "./locales/zh-CN.json";

export const APP_LANGUAGES = ["en", "zh-CN"] as const;
export type AppLanguage = (typeof APP_LANGUAGES)[number];
export const LANGUAGE_STORAGE_KEY = "morimens-language";

export function normalizeAppLanguage(language: string | null | undefined): AppLanguage | null {
  if (!language) return null;
  const normalized = language.toLowerCase();
  if (normalized.startsWith("zh")) return "zh-CN";
  if (normalized.startsWith("en")) return "en";
  return null;
}

export function resolveAppLanguage(
  storedLanguage: string | null,
  browserLanguages: readonly string[],
): AppLanguage {
  const stored = normalizeAppLanguage(storedLanguage);
  if (stored) return stored;
  for (const language of browserLanguages) {
    const resolved = normalizeAppLanguage(language);
    if (resolved) return resolved;
  }
  return "en";
}

function readInitialLanguage(): AppLanguage {
  if (typeof window === "undefined") return "en";
  let storedLanguage: string | null = null;
  try {
    storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in privacy-restricted contexts.
  }
  return resolveAppLanguage(storedLanguage, window.navigator.languages);
}

function applyDocumentLanguage(language: string) {
  const normalized = normalizeAppLanguage(language) ?? "en";
  if (typeof document !== "undefined") document.documentElement.lang = normalized;
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // Language switching still works when persistence is unavailable.
    }
  }
}

const initialLanguage = readInitialLanguage();

void i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    "zh-CN": { translation: zhCN },
  },
  supportedLngs: APP_LANGUAGES,
  load: "currentOnly",
  lng: initialLanguage,
  fallbackLng: "en",
  showSupportNotice: false,
  interpolation: { escapeValue: false },
});

applyDocumentLanguage(initialLanguage);
i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
