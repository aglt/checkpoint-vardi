import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";

import * as schema from "./schema.js";

export type VardiDatabase = BetterSQLite3Database<typeof schema>;

export interface DatabaseConnection {
  readonly sqlite: Database.Database;
  readonly db: VardiDatabase;
}

function getBootstrapSchemaPath(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../bootstrap/schema.sql");
}

export function createDatabaseConnection(sqlite: Database.Database): DatabaseConnection {
  sqlite.pragma("foreign_keys = ON");

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}

export function applyBootstrapSchema(connection: DatabaseConnection): void {
  const bootstrapSql = readFileSync(getBootstrapSchemaPath(), "utf8");
  connection.sqlite.exec(bootstrapSql);
}

export function createBootstrappedDatabaseConnection(
  sqlite: Database.Database,
): DatabaseConnection {
  const connection = createDatabaseConnection(sqlite);
  applyBootstrapSchema(connection);
  return connection;
}

export function closeDatabase(connection: DatabaseConnection): void {
  connection.sqlite.close();
}
