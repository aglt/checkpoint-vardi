import { cache } from "react";

import { DEFAULT_APP_LANGUAGE, type AppLanguage } from "./appLanguage";

// Keep one explicit server seam so a future opt-in override can land in one
// place, but default the current product to Icelandic for every request.
export const getRequestAppLanguage = cache(async (): Promise<AppLanguage> => {
  return DEFAULT_APP_LANGUAGE;
});
