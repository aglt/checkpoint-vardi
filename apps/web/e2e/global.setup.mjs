import { execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export default async function globalSetup() {
  const appRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

  execFileSync("pnpm", ["exec", "tsx", "e2e/scripts/resetE2eDatabase.ts"], {
    cwd: appRoot,
    env: process.env,
    stdio: "inherit",
  });
}
