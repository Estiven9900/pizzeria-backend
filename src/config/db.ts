import { Pool } from "pg";

const postgresPort = Number(process.env.POSTGRES_PORT ?? 5432);

export const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: postgresPort,
});
