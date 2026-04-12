import { cache } from "react";
import { headers } from "next/headers";

import {
  DEFAULT_APP_LANGUAGE,
  resolveAppLanguage,
  type AppLanguage,
} from "./appLanguage";

// Tests can render server components outside a real request context; default to
// Icelandic there so request-less render coverage stays deterministic.
export const getRequestAppLanguage = cache(async (): Promise<AppLanguage> => {
  try {
    const requestHeaders = await headers();
    return resolveAppLanguage(requestHeaders.get("accept-language"));
  } catch {
    return DEFAULT_APP_LANGUAGE;
  }
});
