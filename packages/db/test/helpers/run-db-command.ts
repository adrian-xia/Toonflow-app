import assert from "node:assert/strict";
import { spawnSync, SpawnSyncReturns } from "node:child_process";

export type DbCommand = "db:migrate" | "db:rollback" | "db:types";

export function runDbCommandResult(
  command: DbCommand,
  env: NodeJS.ProcessEnv
): SpawnSyncReturns<string> {
  return spawnSync(
    "pnpm",
    ["--filter", "@toonflow/db", command],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: "utf8"
    }
  );
}

export function runDbCommand(
  command: DbCommand,
  env: NodeJS.ProcessEnv
) {
  const result = runDbCommandResult(command, env);

  assert.equal(
    result.status,
    0,
    `${command} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}
