export const APP_DISPLAY_LANGUAGES = ["is", "en"] as const;
export type AppLanguage = (typeof APP_DISPLAY_LANGUAGES)[number];

export const DEFAULT_APP_LANGUAGE: AppLanguage = "is";

export function resolveAppLanguage(
  acceptLanguageHeader: string | null | undefined,
): AppLanguage {
  if (!acceptLanguageHeader) {
    return DEFAULT_APP_LANGUAGE;
  }

  const languageTags = acceptLanguageHeader
    .split(",")
    .map((entry, index) => {
      const [rawTag, ...rawParameters] = entry
        .trim()
        .split(";")
        .map((part) => part.trim());
      const qParameter = rawParameters.find((parameter) =>
        parameter.startsWith("q="),
      );
      const parsedQuality = qParameter ? Number(qParameter.slice(2)) : 1;

      return {
        tag: rawTag?.toLowerCase() ?? "",
        quality:
          Number.isFinite(parsedQuality) && parsedQuality >= 0
            ? parsedQuality
            : 0,
        index,
      };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((left, right) =>
      left.quality === right.quality
        ? left.index - right.index
        : right.quality - left.quality,
    );

  for (const languageTag of languageTags) {
    const baseLanguage = languageTag.tag.split("-")[0];

    if (baseLanguage === "is" || baseLanguage === "en") {
      return baseLanguage;
    }
  }

  return DEFAULT_APP_LANGUAGE;
}

export function getRequestLocale(language: AppLanguage): string {
  return language === "is" ? "is-IS" : "en-US";
}
