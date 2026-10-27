import { pool } from '../db.js';
import { invalidateDataCache } from './data-cache.js';

export async function transaction(fn, { readOnly = false } = {}) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    if (!readOnly) invalidateDataCache();
    return result;
  } catch (err) {
    if (client) await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally { client?.release(); }
}
export const httpError = (status, message, details) => Object.assign(new Error(message), { status, details });
