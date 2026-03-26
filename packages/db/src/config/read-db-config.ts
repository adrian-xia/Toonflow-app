import { DbConfig } from "./db-config";

export interface ReadDbConfigOptions {
  prefix: string;
}

type EnvMap = Record<string, string | undefined>;

const DEFAULT_PORT = 5432;
const DEFAULT_SSL = false;
const DEFAULT_POOL_MIN = 0;
const DEFAULT_POOL_MAX = 10;
const DEFAULT_POOL_IDLE_TIMEOUT_MS = 30000;
const DEFAULT_POOL_ACQUIRE_TIMEOUT_MS = 60000;

function requiredValue(env: EnvMap, key: string): string {
  const value = env[key];
  if (!value) {
    throw new Error(`Missing required database environment variable: ${key}`);
  }

  return value;
}

function parseNumber(env: EnvMap, key: string, fallback: number): number {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new Error(`Database environment variable must be a number: ${key}`);
  }

  return value;
}

function parseBoolean(env: EnvMap, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  if (raw === "true") {
    return true;
  }

  if (raw === "false") {
    return false;
  }

  throw new Error(`Database environment variable must be true or false: ${key}`);
}

export function readDbConfig(env: EnvMap, options: ReadDbConfigOptions): DbConfig {
  const { prefix } = options;
  const key = (name: string) => `${prefix}_${name}`;

  return {
    host: requiredValue(env, key("HOST")),
    port: parseNumber(env, key("PORT"), DEFAULT_PORT),
    user: requiredValue(env, key("USER")),
    password: requiredValue(env, key("PASSWORD")),
    database: requiredValue(env, key("NAME")),
    schema: requiredValue(env, key("SCHEMA")),
    ssl: parseBoolean(env, key("SSL"), DEFAULT_SSL),
    pool: {
      min: parseNumber(env, key("POOL_MIN"), DEFAULT_POOL_MIN),
      max: parseNumber(env, key("POOL_MAX"), DEFAULT_POOL_MAX),
      idleTimeoutMillis: parseNumber(
        env,
        key("POOL_IDLE_TIMEOUT_MS"),
        DEFAULT_POOL_IDLE_TIMEOUT_MS
      ),
      acquireTimeoutMillis: parseNumber(
        env,
        key("POOL_ACQUIRE_TIMEOUT_MS"),
        DEFAULT_POOL_ACQUIRE_TIMEOUT_MS
      )
    }
  };
}
