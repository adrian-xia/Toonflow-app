import { Knex } from "knex";

import { DbConfig } from "../config/db-config";

export interface BuildKnexConfigOptions {
  migrationsDirectory?: string;
  migrationsExtension?: string;
}

export function buildKnexConfig(
  config: DbConfig,
  options: BuildKnexConfigOptions = {}
): Knex.Config {
  const migrations: Knex.MigratorConfig = {
    schemaName: config.schema
  };

  if (options.migrationsDirectory) {
    migrations.directory = options.migrationsDirectory;
  }

  if (options.migrationsExtension) {
    migrations.extension = options.migrationsExtension;
  }

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
    migrations
  };
}
