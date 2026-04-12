import assert from "node:assert/strict";
import test from "node:test";

import {
  getRequestLocale,
  resolveAppLanguage,
} from "./appLanguage";

test("resolveAppLanguage normalizes Icelandic request languages", () => {
  assert.equal(resolveAppLanguage("is-IS,is;q=0.9,en-US;q=0.8"), "is");
});

test("resolveAppLanguage preserves explicit English requests", () => {
  assert.equal(resolveAppLanguage("en-US"), "en");
  assert.equal(resolveAppLanguage("en-US,en;q=0.9"), "en");
});

test("resolveAppLanguage respects quality weights for supported languages", () => {
  assert.equal(resolveAppLanguage("en-US;q=0.4,is-IS;q=0.9"), "is");
});

test("resolveAppLanguage falls back to Icelandic when request language is unsupported", () => {
  assert.equal(resolveAppLanguage("pl-PL,fr-FR;q=0.9"), "is");
});

test("resolveAppLanguage falls back to Icelandic when request language is missing", () => {
  assert.equal(resolveAppLanguage(undefined), "is");
});

test("getRequestLocale maps supported app languages to concrete locales", () => {
  assert.equal(getRequestLocale("is"), "is-IS");
  assert.equal(getRequestLocale("en"), "en-US");
});
