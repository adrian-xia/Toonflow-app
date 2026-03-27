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
  if (value === undefined) {
    throw new Error(`Missing required database environment variable: ${key}`);
  }

  return value;
}

function requiredNonEmptyValue(env: EnvMap, key: string): string {
  const value = requiredValue(env, key);
  if (value === "") {
    throw new Error(`Database environment variable cannot be empty: ${key}`);
  }

  return value;
}

interface ParseIntegerOptions {
  min?: number;
  max?: number;
}

function parseInteger(
  env: EnvMap,
  key: string,
  fallback: number,
  options: ParseIntegerOptions = {}
): number {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const value = Number(raw);
  if (!Number.isInteger(value)) {
    throw new Error(`Database environment variable must be an integer: ${key}`);
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(
      `Database environment variable must be >= ${options.min}: ${key}`
    );
  }

  if (options.max !== undefined && value > options.max) {
    throw new Error(
      `Database environment variable must be <= ${options.max}: ${key}`
    );
  }

  return value;
}

function parseBoolean(env: EnvMap, key: string, fallback: boolean): boolean {
  const raw = env[key];
  if (raw === undefined || raw === "") {
    return fallback;
  }

  const normalized = raw.trim().toLowerCase();
  if (normalized === "true" || normalized === "1") {
    return true;
  }

  if (normalized === "false" || normalized === "0") {
    return false;
  }

  throw new Error(
    `Database environment variable must be true/false or 1/0: ${key}`
  );
}

export function readDbConfig(env: EnvMap, options: ReadDbConfigOptions): DbConfig {
  const { prefix } = options;
  const key = (name: string) => `${prefix}_${name}`;
  const poolMin = parseInteger(env, key("POOL_MIN"), DEFAULT_POOL_MIN, { min: 0 });
  const poolMax = parseInteger(env, key("POOL_MAX"), DEFAULT_POOL_MAX, { min: 0 });

  if (poolMin > poolMax) {
    throw new Error(
      `Database environment variable DB_POOL_MIN must be <= DB_POOL_MAX`
    );
  }

  return {
    host: requiredNonEmptyValue(env, key("HOST")),
    port: parseInteger(env, key("PORT"), DEFAULT_PORT, { min: 1, max: 65535 }),
    user: requiredNonEmptyValue(env, key("USER")),
    password: requiredValue(env, key("PASSWORD")),
    database: requiredNonEmptyValue(env, key("NAME")),
    schema: requiredNonEmptyValue(env, key("SCHEMA")),
    ssl: parseBoolean(env, key("SSL"), DEFAULT_SSL),
    pool: {
      min: poolMin,
      max: poolMax,
      idleTimeoutMillis: parseInteger(
        env,
        key("POOL_IDLE_TIMEOUT_MS"),
        DEFAULT_POOL_IDLE_TIMEOUT_MS,
        { min: 0 }
      ),
      acquireTimeoutMillis: parseInteger(
        env,
        key("POOL_ACQUIRE_TIMEOUT_MS"),
        DEFAULT_POOL_ACQUIRE_TIMEOUT_MS,
        { min: 0 }
      )
    }
  };
}
