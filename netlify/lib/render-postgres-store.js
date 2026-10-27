'use strict';

const crypto = require('node:crypto');
const {Pool} = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

function toStoredJson(value){
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  if(typeof serialized !== 'string') throw new TypeError('Stored values must be JSON serializable.');
  return JSON.parse(serialized);
}

function formatValue(value, options){
  return options && options.type === 'json' ? value : JSON.stringify(value);
}

function createStore(database){
  return {
    async get(key, options){
      const result = await database.query(
        'SELECT value FROM shailus_blob_store WHERE key = $1',
        [key]
      );
      return result.rowCount ? formatValue(result.rows[0].value, options) : null;
    },

    async getWithMetadata(key, options){
      const result = await database.query(
        'SELECT value, etag FROM shailus_blob_store WHERE key = $1',
        [key]
      );
      if(!result.rowCount) return null;
      return {
        data: formatValue(result.rows[0].value, options),
        etag: result.rows[0].etag,
        metadata: {}
      };
    },

    async set(key, value, conditions){
      const storedValue = toStoredJson(value);
      const etag = crypto.randomUUID();
      const options = conditions || {};
      let result;
      if(options.onlyIfNew){
        result = await database.query(
          `INSERT INTO shailus_blob_store (key, value, etag)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (key) DO NOTHING
           RETURNING etag`,
          [key, JSON.stringify(storedValue), etag]
        );
      } else if(options.onlyIfMatch){
        result = await database.query(
          `UPDATE shailus_blob_store
           SET value = $2::jsonb, etag = $3, updated_at = now()
           WHERE key = $1 AND etag = $4
           RETURNING etag`,
          [key, JSON.stringify(storedValue), etag, options.onlyIfMatch]
        );
      } else {
        result = await database.query(
          `INSERT INTO shailus_blob_store (key, value, etag)
           VALUES ($1, $2::jsonb, $3)
           ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value, etag = EXCLUDED.etag, updated_at = now()
           RETURNING etag`,
          [key, JSON.stringify(storedValue), etag]
        );
      }
      return {
        modified: result.rowCount > 0,
        etag: result.rowCount ? result.rows[0].etag : undefined
      };
    },

    async delete(key){
      await database.query('DELETE FROM shailus_blob_store WHERE key = $1', [key]);
    },

    async list(options){
      const prefix = options && options.prefix || '';
      const result = await database.query(
        `SELECT key, etag FROM shailus_blob_store
         WHERE left(key, char_length($1)) = $1
         ORDER BY key`,
        [prefix]
      );
      return {blobs: result.rows};
    }
  };
}

const store = createStore(pool);

async function healthCheck(){
  await pool.query('SELECT 1');
}

async function close(){
  await pool.end();
}

module.exports = {
  close: close,
  createStore: createStore,
  healthCheck: healthCheck,
  pool: pool,
  store: store
};
