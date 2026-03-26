import { Knex } from "knex";

import { DbConfig } from "../config/db-config";

export function buildKnexConfig(config: DbConfig): Knex.Config {
  return {
    client: "pg",
    connection: {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ssl: config.ssl
    },
    pool: {
      min: config.pool.min,
      max: config.pool.max,
      idleTimeoutMillis: config.pool.idleTimeoutMillis,
      acquireTimeoutMillis: config.pool.acquireTimeoutMillis
    },
    searchPath: config.schema,
    migrations: {
      schemaName: config.schema
    }
  };
}
