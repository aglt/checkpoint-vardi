// ── ARCHITECTURAL GUARDRAIL ──────────────────────────────────────
// Single source of truth for locale codes. The DB translation tables key on
// these values; UI dictionary keys resolve against them. Never hard-code a
// language string elsewhere — import from here.
// ─────────────────────────────────────────────────────────────────

export const SUPPORTED_LANGUAGES = ["is", "en", "pl"] as const;
export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number];

export const DEFAULT_LANGUAGE: LanguageCode = "is";

export function isSupportedLanguage(value: string): value is LanguageCode {
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(value);
}
