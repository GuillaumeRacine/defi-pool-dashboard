/**
 * Database Connection and Query Utils
 */

import pg from 'pg';
import { logger } from './logger.js';

const { Pool } = pg;

class Database {
  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    // Handle pool errors
    this.pool.on('error', (err) => {
      logger.error('Unexpected error on idle client', err);
    });
  }

  async query(text, params = []) {
    const start = Date.now();
    try {
      const res = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn(`Slow query (${duration}ms): ${text.substring(0, 100)}...`);
      }

      return res;
    } catch (error) {
      logger.error('Database query error:', {
        error: error.message,
        query: text.substring(0, 200),
        params: params?.slice(0, 5) // Don't log all params for security
      });
      throw error;
    }
  }

  async transaction(callback) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async upsert(table, data, conflictColumns, updateColumns = null) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');

    // If no updateColumns specified, update all columns except conflict ones
    const columnsToUpdate = updateColumns || columns.filter(col => !conflictColumns.includes(col));
    const updateSet = columnsToUpdate.map(col => `${col} = EXCLUDED.${col}`).join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (${conflictColumns.join(', ')})
      DO UPDATE SET ${updateSet}, updated_at = NOW()
      RETURNING *
    `;

    return this.query(query, values);
  }

  async bulkInsert(table, dataArray, onConflict = 'DO NOTHING') {
    if (dataArray.length === 0) return { rowCount: 0 };

    const columns = Object.keys(dataArray[0]);
    const valueRows = dataArray.map(data =>
      `(${Object.values(data).map(val => this.formatValue(val)).join(', ')})`
    ).join(', ');

    const query = `
      INSERT INTO ${table} (${columns.join(', ')})
      VALUES ${valueRows}
      ON CONFLICT ${onConflict}
    `;

    return this.query(query);
  }

  formatValue(value) {
    if (value === null || value === undefined) return 'NULL';
    if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
    if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    return value;
  }

  async getLastSyncTime(jobType) {
    const result = await this.query(`
      SELECT MAX(completed_at) as last_sync
      FROM sync_jobs
      WHERE job_type = $1 AND status = 'completed'
    `, [jobType]);

    return result.rows[0]?.last_sync || null;
  }

  async recordSyncJob(jobName, jobType, metadata = {}) {
    const result = await this.query(`
      INSERT INTO sync_jobs (job_name, job_type, status, started_at, source_endpoints)
      VALUES ($1, $2, 'running', NOW(), $3)
      RETURNING id
    `, [jobName, jobType, JSON.stringify(metadata.endpoints || [])]);

    return result.rows[0].id;
  }

  async updateSyncJob(jobId, updates) {
    const setClause = Object.keys(updates)
      .map((key, i) => `${key} = $${i + 2}`)
      .join(', ');

    const query = `
      UPDATE sync_jobs
      SET ${setClause}, completed_at = NOW()
      WHERE id = $1
      RETURNING *
    `;

    return this.query(query, [jobId, ...Object.values(updates)]);
  }

  async end() {
    await this.pool.end();
  }
}

export const db = new Database();