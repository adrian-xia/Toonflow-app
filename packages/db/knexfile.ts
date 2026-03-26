import path from "node:path";

import { buildKnexConfig, readDbConfig } from "./src";

const config = readDbConfig(process.env, { prefix: "DB" });

const knexConfig = buildKnexConfig(config, {
  migrationsDirectory: path.resolve(__dirname, "src/migrations"),
  migrationsExtension: "ts"
});

export default knexConfig;

module.exports = knexConfig;
