import { cache } from "react";

import { DEFAULT_APP_LANGUAGE, type AppLanguage } from "./appLanguage";

// Keep one explicit server seam so future opt-in language overrides can land
// here without changing every page/layout consumer.
export const getRequestAppLanguage = cache(async (): Promise<AppLanguage> => {
  return DEFAULT_APP_LANGUAGE;
});
