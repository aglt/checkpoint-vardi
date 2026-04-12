// @vardi/db/runtime — app-owned SQLite connection bootstrap helpers for the
// real server runtime. Keep this separate from the root package seam so the
// default @vardi/db API stays focused on schema and query ownership.
export {
  applyBootstrapSchema,
  closeDatabase,
  createDatabaseConnection,
  createBootstrappedDatabaseConnection,
  type DatabaseConnection,
  type VardiDatabase,
} from "./connection.js";
