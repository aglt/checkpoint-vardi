import assert from "node:assert/strict";
import test from "node:test";

import {
  DEFAULT_APP_LANGUAGE,
  getRequestLocale,
} from "./appLanguage";

test("DEFAULT_APP_LANGUAGE stays Icelandic", () => {
  assert.equal(DEFAULT_APP_LANGUAGE, "is");
});

test("getRequestLocale maps supported app languages to concrete locales", () => {
  assert.equal(getRequestLocale("is"), "is-IS");
  assert.equal(getRequestLocale("en"), "en-US");
});
