import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

function readSiblingFile(fileName: string): string {
  return readFileSync(new URL(fileName, import.meta.url), "utf8");
}

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const resolvedPath = `${directory}/${entry.name}`;

    if (entry.isDirectory()) {
      return listTypeScriptFiles(resolvedPath);
    }

    return resolvedPath.endsWith(".ts") || resolvedPath.endsWith(".tsx")
      ? [resolvedPath]
      : [];
  });
}

test("shared i18n modules stay free of Next and server-only imports", () => {
  const appLanguageSource = readSiblingFile("./appLanguage.ts");
  const mvpCopySource = readSiblingFile("./mvpCopy.ts");

  assert.doesNotMatch(appLanguageSource, /next\//);
  assert.doesNotMatch(appLanguageSource, /server-only/);
  assert.doesNotMatch(mvpCopySource, /next\//);
  assert.doesNotMatch(mvpCopySource, /server-only/);
});

test("request language resolution stays in the explicit server module", () => {
  const requestAppLanguageSource = readSiblingFile("./requestAppLanguage.server.ts");

  assert.doesNotMatch(requestAppLanguageSource, /from\s+["']next\/headers["']/);
});

test("client components do not import the request language server module", () => {
  const appRoot = fileURLToPath(new URL("../../", import.meta.url));
  const clientFiles = listTypeScriptFiles(appRoot).filter((filePath) => {
    const source = readFileSync(filePath, "utf8");
    return /^\s*["']use client["'];/.test(source);
  });

  assert.ok(clientFiles.length > 0);

  for (const filePath of clientFiles) {
    const source = readFileSync(filePath, "utf8");
    assert.doesNotMatch(
      source,
      /requestAppLanguage(?:\.server)?["']/,
      `${filePath} must not import requestAppLanguage.server`,
    );
  }
});
