import { closeDatabase, createBootstrappedDatabase } from "@vardi/db/testing";

import {
  resetE2eStateDirectory,
  resolveE2eDatabasePath,
} from "../support/e2eDatabase.mjs";

resetE2eStateDirectory();

const connection = createBootstrappedDatabase(resolveE2eDatabasePath());
closeDatabase(connection);
