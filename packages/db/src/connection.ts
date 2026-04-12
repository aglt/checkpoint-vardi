import { readdirSync, readFileSync } from "node:fs";
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

function getMigrationsDirectory(): string {
  return join(dirname(fileURLToPath(import.meta.url)), "../migrations");
}

export function createDatabaseConnection(sqlite: Database.Database): DatabaseConnection {
  sqlite.pragma("foreign_keys = ON");

  return {
    sqlite,
    db: drizzle(sqlite, { schema }),
  };
}

export function applyMigrations(connection: DatabaseConnection): void {
  const migrationDirectory = getMigrationsDirectory();
  const migrationFiles = readdirSync(migrationDirectory)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const migrationFile of migrationFiles) {
    const migrationSql = readFileSync(join(migrationDirectory, migrationFile), "utf8");
    connection.sqlite.exec(migrationSql);
  }
}

export function createMigratedDatabaseConnection(
  sqlite: Database.Database,
): DatabaseConnection {
  const connection = createDatabaseConnection(sqlite);
  applyMigrations(connection);
  return connection;
}

export function closeDatabase(connection: DatabaseConnection): void {
  connection.sqlite.close();
}
