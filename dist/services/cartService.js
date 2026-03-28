"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLock = createLock;
exports.releaseLock = releaseLock;
const database_1 = require("../config/database");
async function createLock(productConfigId, sessionId) {
    const { rows } = await database_1.pool.query(`INSERT INTO product_locks (product_config_id, session_id, quantity, expires_at)
     VALUES ($1, $2, 1, now() + INTERVAL '10 minutes')
     RETURNING id, product_config_id, session_id, quantity, expires_at::text, created_at::text`, [productConfigId, sessionId]);
    return rows[0];
}
async function releaseLock(lockId) {
    const { rowCount } = await database_1.pool.query(`DELETE FROM product_locks WHERE id = $1`, [lockId]);
    return (rowCount ?? 0) > 0;
}
//# sourceMappingURL=cartService.js.map