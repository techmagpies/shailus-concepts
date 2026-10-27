'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {Pool} = require('pg');

async function applySchema(database){
  const schema = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_render_storage.sql'), 'utf8');
  await database.query(schema);
}

async function main(){
  if(!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const pool = new Pool({connectionString: process.env.DATABASE_URL, max: 1});
  try{
    await applySchema(pool);
    console.log('Render PostgreSQL schema is ready.');
  } finally{
    await pool.end();
  }
}

if(require.main === module){
  main().catch(function(error){
    console.error('Render database migration failed:', error && error.name || 'Error');
    process.exitCode = 1;
  });
}

module.exports = {applySchema: applySchema, main: main};
