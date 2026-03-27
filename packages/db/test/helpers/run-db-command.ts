import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

export function runDbCommand(
  command: "db:migrate" | "db:rollback" | "db:types",
  env: NodeJS.ProcessEnv
) {
  const result = spawnSync(
    "pnpm",
    ["--filter", "@toonflow/db", command],
    {
      cwd: process.cwd(),
      env: { ...process.env, ...env },
      encoding: "utf8"
    }
  );

  assert.equal(
    result.status,
    0,
    `${command} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
  );
}
