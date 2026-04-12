import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import Database from "better-sqlite3";
import {
  createBootstrappedDatabaseConnection,
  type DatabaseConnection,
  type VardiDatabase,
} from "@vardi/db/runtime";

function resolveDefaultDatabasePath(): string {
  return join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../data/checkpoint-vardi.db",
  );
}

function resolveDatabasePath(): string {
  return process.env.VARDI_DATABASE_PATH ?? resolveDefaultDatabasePath();
}

declare global {
  var __vardiDatabaseConnection: DatabaseConnection | undefined;
  var __vardiDatabasePath: string | undefined;
}

function initializeDatabaseConnection(): DatabaseConnection {
  const databasePath = resolveDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });
  return createBootstrappedDatabaseConnection(new Database(databasePath));
}

// Guarded one-time bootstrap for the shared SQLite file connection.
function getDatabaseConnection(): DatabaseConnection {
  const databasePath = resolveDatabasePath();

  if (
    !globalThis.__vardiDatabaseConnection ||
    globalThis.__vardiDatabasePath !== databasePath
  ) {
    globalThis.__vardiDatabaseConnection = initializeDatabaseConnection();
    globalThis.__vardiDatabasePath = databasePath;
  }

  return globalThis.__vardiDatabaseConnection;
}

export function getDatabase(): VardiDatabase {
  return getDatabaseConnection().db;
}
