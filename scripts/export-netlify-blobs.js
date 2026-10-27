'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {getStore} = require('@netlify/blobs');
const {encryptSnapshot} = require('./netlify-blobs-snapshot-crypto');

const STORE_NAME = 'shailus-concepts-orders';
const PROJECT_ROOT = path.resolve(__dirname, '..');

function assertPrivateOutputPath(outputPath){
  const resolved = path.resolve(outputPath);
  const relative = path.relative(PROJECT_ROOT, resolved);
  if(!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)){
    throw new Error('Choose an export path outside the project directory.');
  }
  return resolved;
}

async function exportStore(store){
  const records = [];
  for await (const page of store.list({paginate: true})){
    for(const entry of page.blobs){
      const value = await store.get(entry.key);
      if(typeof value !== 'string'){
        throw new TypeError('A Netlify Blobs record was missing or was not stored as JSON text.');
      }
      JSON.parse(value);
      records.push({key: entry.key, value: value});
    }
  }
  records.sort(function(left, right){ return left.key.localeCompare(right.key); });
  return {
    formatVersion: 1,
    storeName: STORE_NAME,
    exportedAt: new Date().toISOString(),
    recordCount: records.length,
    records: records
  };
}

async function main(){
  const outputArgument = process.argv[2];
  if(!outputArgument) throw new Error('Usage: node scripts/export-netlify-blobs.js <private-output-path>');
  const outputPath = assertPrivateOutputPath(outputArgument);
  const siteID = process.env.NETLIFY_SITE_ID;
  const token = process.env.NETLIFY_AUTH_TOKEN;
  const passphrase = process.env.MIGRATION_PASSPHRASE;
  if(!siteID || !token) throw new Error('NETLIFY_SITE_ID and NETLIFY_AUTH_TOKEN are required.');
  if(!passphrase || passphrase.length < 16){
    throw new Error('MIGRATION_PASSPHRASE must contain at least 16 characters.');
  }

  const store = getStore({name: STORE_NAME, siteID: siteID, token: token});
  const snapshot = await exportStore(store);
  const encryptedSnapshot = await encryptSnapshot(snapshot, passphrase);
  const file = fs.openSync(outputPath, 'wx', 0o600);
  try{
    fs.writeFileSync(file, JSON.stringify(encryptedSnapshot));
  } finally{
    fs.closeSync(file);
  }
  console.log('Exported and encrypted ' + snapshot.recordCount + ' records to the private snapshot path.');
}

if(require.main === module){
  main().catch(function(error){
    console.error('Netlify Blobs export failed:', error && error.name || 'Error');
    process.exitCode = 1;
  });
}

module.exports = {
  assertPrivateOutputPath: assertPrivateOutputPath,
  exportStore: exportStore
};
