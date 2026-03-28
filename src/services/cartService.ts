import { pool } from "../config/database";

interface LockResult {
  id: string;
  product_config_id: string;
  session_id: string;
  quantity: number;
  expires_at: string;
  created_at: string;
}

export async function createLock(
  productConfigId: string,
  sessionId: string,
): Promise<LockResult> {
  const { rows } = await pool.query<LockResult>(
    `INSERT INTO product_locks (product_config_id, session_id, quantity, expires_at)
     VALUES ($1, $2, 1, now() + INTERVAL '10 minutes')
     RETURNING id, product_config_id, session_id, quantity, expires_at::text, created_at::text`,
    [productConfigId, sessionId],
  );

  return rows[0]!;
}

export async function releaseLock(lockId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM product_locks WHERE id = $1`,
    [lockId],
  );

  return (rowCount ?? 0) > 0;
}
