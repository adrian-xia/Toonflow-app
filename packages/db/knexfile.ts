import path from "node:path";

import { buildKnexConfig } from "./src/client/knex-config";
import { readDbConfig } from "./src/config/read-db-config";

const config = readDbConfig(process.env, { prefix: "DB" });

const knexConfig = buildKnexConfig(config, {
  migrationsDirectory: path.resolve(__dirname, "src/migrations"),
  migrationsExtension: "ts"
});

// CommonJS bridge used by Knex tooling that looks for knexfile exports.
export = knexConfig;
