export interface DbPoolConfig {
  min: number;
  max: number;
  idleTimeoutMillis: number;
  acquireTimeoutMillis: number;
}

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  schema: string;
  ssl: boolean;
  pool: DbPoolConfig;
}
