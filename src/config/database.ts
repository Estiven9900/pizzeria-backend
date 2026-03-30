import { Pool } from "pg";

const postgresPort = Number(process.env.POSTGRES_PORT ?? 5432);

export const pool = new Pool({
  user: process.env.POSTGRES_USER,
  host: process.env.POSTGRES_HOST,
  database: process.env.POSTGRES_DB,
  password: process.env.POSTGRES_PASSWORD,
  port: postgresPort,
});

export async function connectWithRetry(maxRetries = 5, delayMs = 3000): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query("SELECT 1");
      console.log("Conectado a PostgreSQL");
      return;
    } catch (err) {
      console.error(
        `Intento ${attempt}/${maxRetries} — Error conectando a PostgreSQL:`,
        err instanceof Error ? err.message : err,
      );
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, delayMs));
      }
    }
  }
  console.error("No se pudo conectar a PostgreSQL tras varios intentos. El servidor continuará, pero las queries fallarán.");
}
