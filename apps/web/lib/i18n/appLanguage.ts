export const APP_DISPLAY_LANGUAGES = ["is", "en"] as const;
export type AppLanguage = (typeof APP_DISPLAY_LANGUAGES)[number];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "is";

export function getRequestLocale(language: AppLanguage): string {
  return language === "is" ? "is-IS" : "en-US";
}
