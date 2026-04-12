import { mkdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

function resolveAppRoot() {
  return join(dirname(fileURLToPath(import.meta.url)), "../..");
}

export function resolveE2eStateDirectory() {
  return join(resolveAppRoot(), ".e2e", "state");
}

export function resolveE2eDatabasePath() {
  return join(resolveE2eStateDirectory(), "checkpoint-vardi.e2e.db");
}

export function resetE2eStateDirectory() {
  const stateDirectory = resolveE2eStateDirectory();
  rmSync(stateDirectory, { force: true, recursive: true });
  mkdirSync(dirname(resolveE2eDatabasePath()), { recursive: true });
  return stateDirectory;
}
