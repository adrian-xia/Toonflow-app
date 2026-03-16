import { readFile, writeFile } from "fs/promises";
import knex from "knex";
import initDB from "@/lib/initDB";
import fixDB from "@/lib/fixDB";
import type { DB } from "@/types/database";
import crypto from "crypto";

type TableName = keyof DB & string;
type RowType<TName extends TableName> = DB[TName];

// PostgreSQL 连接配置
const dbHost = process.env.DB_HOST || "192.168.1.100";
const dbPort = process.env.DB_PORT || "5432";
const dbUser = process.env.DB_USER || "postgres";
const dbPassword = process.env.DB_PASSWORD || "123456";
const dbName = process.env.DB_NAME || "toonflow";

console.log("数据库连接: PostgreSQL");

// 先连接到 postgres 默认数据库，检查并创建目标数据库
async function ensureDatabase() {
  const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/postgres`;

  const maintenanceDb = knex({
    client: "pg",
    connection: connectionString,
  });

  try {
    const result = await maintenanceDb.raw("SELECT 1 FROM pg_database WHERE datname = ?", [dbName]);
    if (result.rows.length === 0) {
      console.log(`数据库 ${dbName} 不存在，正在创建...`);
      await maintenanceDb.raw(`CREATE DATABASE "${dbName}"`);
      console.log(`数据库 ${dbName} 创建成功`);
    }
  } catch (err) {
    console.error("检查/创建数据库失败:", err);
    throw err;
  } finally {
    await maintenanceDb.destroy();
  }
}

// 主数据库连接字符串
const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

const db = knex({
  client: "pg",
  connection: connectionString,
  useNullAsDefault: true,
});

(async () => {
  try {
    // 确保数据库存在
    await ensureDatabase();

    // 测试连接
    await db.raw("SELECT 1");
    console.log("数据库连接成功");

    await initDB(db);
    await fixDB(db);
    if (process.env.NODE_ENV == "dev") initKnexType(db);
  } catch (err) {
    console.error("数据库初始化失败:", err);
    process.exit(1);
  }
})();

const dbClient = Object.assign(<TName extends TableName>(table: TName) => db<RowType<TName>, RowType<TName>[]>(table), db);
dbClient.schema = db.schema;
export default dbClient;

export { db };

async function initKnexType(knexDb: any) {
  const { Client } = await import("@rmp135/sql-ts");
  const outFile = "src/types/database.d.ts";
  const dbClient = Client.fromConfig({
    interfaceNameFormat: "${table}",
    typeMap: {
      number: ["bigint", "integer", "int4", "int8", "serial", "bigserial"],
      string: ["text", "varchar", "char", "character varying", "character"],
    },
  }).fetchDatabase(knexDb);
  const declarations = await dbClient.toTypescript();
  const dbObject = await dbClient.toObject();
  const customHeader = `//该文件由脚本自动生成，请勿手动修改`;
  // 清除上次的注释头
  let declBody = declarations.replace(/^\/\*[\s\S]*?\*\/\s*/, "");
  declBody = declBody.replace(/(\n\s*)\/\*([^*][\s\S]*?)\*\//g, "$1/**$2*/");
  const tableInterfaces = dbObject.schemas.flatMap((schema) => schema.tables.map((table) => table.interfaceName));
  const aggregateTypes = `
export interface DB {
${tableInterfaces.map((name) => `  ${JSON.stringify(name)}: ${name};`).join("\n")}
}
`;
  // 哈希仅基于结构化信息，header和空格不算
  const hashSource = JSON.stringify({
    tableInterfaces,
    declBody,
  });
  const hash = crypto.createHash("md5").update(hashSource).digest("hex");
  // 文件内容
  const content = `// @db-hash ${hash}\n${customHeader}\n\n` + declBody + aggregateTypes;
  let needWrite = true;
  try {
    const current = await readFile(outFile, "utf8");
    // 文件头已存在相同 hash，不需要写
    const match = current.match(/^\/\/\s*@db-hash\s*([a-zA-Z0-9]+)\n/);
    const currentHash = match ? match[1] : null;
    if (currentHash === hash) {
      needWrite = false;
    }
  } catch (err) {
    needWrite = true;
  }
  if (needWrite) await writeFile(outFile, content, "utf8");
}