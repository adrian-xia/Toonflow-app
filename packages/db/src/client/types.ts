import { Knex } from "knex";

export type DbExecutor = Knex | Knex.Transaction;

export interface DbClient {
  executor: Knex;
  destroy: () => Promise<void>;
  transaction: <T>(fn: (trx: DbExecutor) => Promise<T>) => Promise<T>;
}
