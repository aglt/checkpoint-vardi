import Database from "better-sqlite3";
import {
  applyBootstrapSchema,
  closeDatabase,
  createDatabaseConnection,
  createBootstrappedDatabaseConnection,
  type DatabaseConnection,
  type VardiDatabase,
} from "./connection.js";

export function openDatabase(databasePath = ":memory:"): DatabaseConnection {
  return createDatabaseConnection(new Database(databasePath));
}

export function createBootstrappedDatabase(databasePath = ":memory:"): DatabaseConnection {
  const connection = openDatabase(databasePath);
  applyBootstrapSchema(connection);
  return connection;
}

export {
  applyBootstrapSchema,
  closeDatabase,
  createBootstrappedDatabaseConnection,
  type DatabaseConnection,
  type VardiDatabase,
};
