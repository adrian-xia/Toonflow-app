import knex, { Knex } from "knex";

import { DbConfig } from "../config/db-config";
import { buildKnexConfig } from "./knex-config";
import { DbClient, DbExecutor } from "./types";

interface CreateDbClientDependencies {
  createExecutor?: (config: Knex.Config) => Knex;
}

export function createDbClient(
  config: DbConfig,
  dependencies: CreateDbClientDependencies = {}
): DbClient {
  const createExecutor = dependencies.createExecutor ?? knex;
  const executor = createExecutor(buildKnexConfig(config));

  return {
    executor,
    async destroy() {
      await executor.destroy();
    },
    async transaction<T>(fn: (trx: DbExecutor) => Promise<T>): Promise<T> {
      const trx = await executor.transaction();

      try {
        const result = await fn(trx);
        await trx.commit();
        return result;
      } catch (error) {
        try {
          await trx.rollback();
        } catch {
          // Preserve the original callback error as the transaction contract requires.
        }
        throw error;
      }
    }
  };
}
