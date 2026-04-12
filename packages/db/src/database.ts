import Database from "better-sqlite3";
import {
  applyMigrations,
  closeDatabase,
  createDatabaseConnection,
  type DatabaseConnection,
  type VardiDatabase,
} from "./connection.js";

export function openDatabase(databasePath = ":memory:"): DatabaseConnection {
  return createDatabaseConnection(new Database(databasePath));
}

export function createMigratedDatabase(databasePath = ":memory:"): DatabaseConnection {
  const connection = openDatabase(databasePath);
  applyMigrations(connection);
  return connection;
}

export { applyMigrations, closeDatabase, type DatabaseConnection, type VardiDatabase };
