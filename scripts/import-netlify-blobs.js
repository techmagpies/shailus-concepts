'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {isDeepStrictEqual} = require('node:util');
const crypto = require('node:crypto');
const {Pool} = require('pg');
const {decryptSnapshot} = require('./netlify-blobs-snapshot-crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const STORE_NAME = 'shailus-concepts-orders';

function assertPrivateInputPath(inputPath){
  const resolved = path.resolve(inputPath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if(!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)){
    throw new Error('Use a private snapshot located outside the project directory.');
  }
  return resolved;
}

function validateSnapshot(snapshot){
  if(!snapshot || snapshot.formatVersion !== 1 || snapshot.storeName !== STORE_NAME ||
     !Array.isArray(snapshot.records) || snapshot.records.length === 0 ||
     snapshot.recordCount !== snapshot.records.length){
    throw new TypeError('The Netlify Blobs snapshot is invalid or empty.');
  }
  const seen = new Set();
  const parsedRecords = snapshot.records.map(function(record){
    if(!record || typeof record.key !== 'string' || typeof record.value !== 'string' ||
       seen.has(record.key)){
      throw new TypeError('The snapshot contains an invalid or duplicate record.');
    }
    seen.add(record.key);
    const value = JSON.parse(record.value);
    if(record.key.startsWith('order:')){
      if(!value || typeof value.razorpayOrderId !== 'string' ||
         record.key !== 'order:' + value.razorpayOrderId ||
         !/^order_[A-Za-z0-9]+$/.test(value.razorpayOrderId)){
        throw new TypeError('The snapshot contains an invalid order record.');
      }
    } else if(!/^login-limit:[a-f\d]{64}$/.test(record.key) &&
              !/^revoked-session:[A-Za-z0-9_-]+$/.test(record.key)){
      throw new TypeError('The snapshot contains an unsupported storage key.');
    }
    return {key: record.key, value: value};
  });
  return parsedRecords;
}

async function importSnapshot(pool, records){
  const client = await pool.connect();
  let inserted = 0;
  let alreadyPresent = 0;
  try{
    await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');
    const currentResult = await client.query(
      'SELECT key, value FROM shailus_blob_store'
    );
    const current = new Map(currentResult.rows.map(function(row){
      return [row.key, row.value];
    }));
    const incoming = new Map(records.map(function(record){
      return [record.key, record.value];
    }));

    for(const entry of current){
      if(!incoming.has(entry[0])){
        throw new Error('Import stopped because the target contains records absent from the snapshot.');
      }
      if(!isDeepStrictEqual(entry[1], incoming.get(entry[0]))){
        throw new Error('Import stopped because a target record conflicts with the snapshot.');
      }
      alreadyPresent += 1;
    }

    for(const record of records){
      if(current.has(record.key)) continue;
      const result = await client.query(
        `INSERT INTO shailus_blob_store (key, value, etag)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING
         RETURNING key`,
        [record.key, JSON.stringify(record.value), crypto.randomUUID()]
      );
      if(result.rowCount !== 1){
        throw new Error('Import stopped because the target changed during the transaction.');
      }
      inserted += 1;
    }
    const countResult = await client.query(
      'SELECT count(*)::integer AS total FROM shailus_blob_store'
    );
    const total = Number(countResult.rows[0].total);
    if(total !== records.length || inserted + alreadyPresent !== records.length){
      throw new Error('Import verification failed; the target record count does not match the snapshot.');
    }
    await client.query('COMMIT');
    return {inserted: inserted, alreadyPresent: alreadyPresent, total: total};
  } catch(error){
    await client.query('ROLLBACK');
    throw error;
  } finally{
    client.release();
  }
}

async function main(){
  const inputArgument = process.argv[2];
  if(!inputArgument) throw new Error('Usage: node scripts/import-netlify-blobs.js <private-snapshot-path>');
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const inputPath = assertPrivateInputPath(inputArgument);
  const passphrase = process.env.MIGRATION_PASSPHRASE;
  if(!passphrase || passphrase.length < 16){
    throw new Error('MIGRATION_PASSPHRASE must contain at least 16 characters.');
  }
  const encryptedSnapshot = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const snapshot = await decryptSnapshot(encryptedSnapshot, passphrase);
  const records = validateSnapshot(snapshot);
  const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 1});
  try{
    const result = await importSnapshot(pool, records);
    const orderCount = records.filter(function(record){ return record.key.startsWith('order:'); }).length;
    console.log('Verified ' + result.total + ' snapshot records (' + orderCount + ' orders): ' +
      result.inserted + ' inserted, ' + result.alreadyPresent + ' already matched. ' +
      'The Netlify source records were not modified.');
  } finally{
    await pool.end();
  }
}

if(require.main === module){
  main().catch(function(error){
    console.error('Render database import failed:', error && error.name || 'Error');
    process.exitCode = 1;
  });
}

module.exports = {
  assertPrivateInputPath: assertPrivateInputPath,
  importSnapshot: importSnapshot,
  validateSnapshot: validateSnapshot
};
