'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const {newDb, DataType} = require('pg-mem');
const YAML = require('yaml');
const {createApp, routes, validateStartupConfig} = require('../render-server');
const {formatError} = require('../scripts/log-safe-error');
const postgresStore = require('../netlify/lib/render-postgres-store');
const {applySchema} = require('../scripts/migrate-render-db');
const {exportStore, assertPrivateOutputPath} = require('../scripts/export-netlify-blobs');
const {encryptSnapshot, decryptSnapshot} = require('../scripts/netlify-blobs-snapshot-crypto');
const {
  validateSnapshot,
  assertPrivateInputPath,
  importSnapshot
} = require('../scripts/import-netlify-blobs');

class FakeDatabase{
  constructor(){
    this.rows = new Map();
  }

  async query(sql, values){
    const args = values || [];
    if(sql.includes('INSERT INTO shailus_blob_store')){
      const current = this.rows.get(args[0]);
      if(current && sql.includes('DO NOTHING')) return {rowCount: 0, rows: []};
      const row = {key: args[0], value: JSON.parse(args[1]), etag: args[2]};
      this.rows.set(args[0], row);
      return {rowCount: 1, rows: [{etag: row.etag}]};
    }
    if(sql.includes('UPDATE shailus_blob_store')){
      const current = this.rows.get(args[0]);
      if(!current || current.etag !== args[3]) return {rowCount: 0, rows: []};
      const row = {key: args[0], value: JSON.parse(args[1]), etag: args[2]};
      this.rows.set(args[0], row);
      return {rowCount: 1, rows: [{etag: row.etag}]};
    }
    if(sql.includes('SELECT value, etag')){
      const row = this.rows.get(args[0]);
      return {rowCount: row ? 1 : 0, rows: row ? [{value: row.value, etag: row.etag}] : []};
    }
    if(sql.includes('SELECT value FROM')){
      const row = this.rows.get(args[0]);
      return {rowCount: row ? 1 : 0, rows: row ? [{value: row.value}] : []};
    }
    if(sql.includes('WHERE left(key, char_length($1)) = $1')){
      const prefix = args[0];
      const rows = Array.from(this.rows.values())
        .filter(function(row){ return row.key.startsWith(prefix); })
        .map(function(row){ return {key: row.key, etag: row.etag}; });
      return {rowCount: rows.length, rows: rows};
    }
    if(sql.includes('DELETE FROM shailus_blob_store')){
      return {rowCount: this.rows.delete(args[0]) ? 1 : 0, rows: []};
    }
    throw new Error('Unexpected SQL in fake database: ' + sql);
  }
}

function listen(app){
  return new Promise(function(resolve){
    const server = app.listen(0, '127.0.0.1', function(){
      resolve({server: server, origin: 'http://127.0.0.1:' + server.address().port});
    });
  });
}

function close(server){
  return new Promise(function(resolve, reject){
    server.close(function(error){ error ? reject(error) : resolve(); });
  });
}

test('PostgreSQL store preserves JSON values and atomic create/update conditions', async function(){
  const database = new FakeDatabase();
  const store = postgresStore.createStore(database);
  const first = await store.set('order:order_test', JSON.stringify({value: 1}), {onlyIfNew: true});
  assert.equal(first.modified, true);
  assert.deepEqual(await store.get('order:order_test', {type: 'json'}), {value: 1});
  assert.equal(await store.get('order:order_test'), '{"value":1}');

  const duplicate = await store.set('order:order_test', JSON.stringify({value: 2}), {onlyIfNew: true});
  assert.equal(duplicate.modified, false);
  const stale = await store.set('order:order_test', JSON.stringify({value: 3}), {onlyIfMatch: 'stale'});
  assert.equal(stale.modified, false);
  const updated = await store.set('order:order_test', JSON.stringify({value: 4}), {onlyIfMatch: first.etag});
  assert.equal(updated.modified, true);
  assert.deepEqual(await store.get('order:order_test', {type: 'json'}), {value: 4});
  assert.deepEqual(await store.getWithMetadata('missing:key', {type: 'json'}), null);
});

test('PostgreSQL store lists only the requested key prefix and deletes a named key', async function(){
  const database = new FakeDatabase();
  const store = postgresStore.createStore(database);
  await store.set('order:a', JSON.stringify({order: 'a'}));
  await store.set('order:b', JSON.stringify({order: 'b'}));
  await store.set('login-limit:abc', JSON.stringify({attempts: 1}));
  const listed = await store.list({prefix: 'order:'});
  assert.deepEqual(listed.blobs.map(function(entry){ return entry.key; }), ['order:a', 'order:b']);
  await store.delete('order:a');
  assert.equal(await store.get('order:a'), null);
});

test('Render PostgreSQL migration and storage adapter execute against a PostgreSQL-compatible engine', async function(){
  const database = newDb({noAstCoverageCheck: true});
  database.public.registerFunction({
    name: 'char_length',
    args: [DataType.text],
    returns: DataType.integer,
    implementation: function(value){ return value.length; }
  });
  database.public.registerFunction({
    name: 'left',
    args: [DataType.text, DataType.integer],
    returns: DataType.text,
    implementation: function(value, length){ return value.slice(0, length); }
  });
  const pg = database.adapters.createPg();
  const pool = new pg.Pool();
  try{
    await applySchema(pool);
    await applySchema(pool);
    const store = postgresStore.createStore(pool);
    const created = await store.set('order:order_livecheck', JSON.stringify({status: 'pending'}), {onlyIfNew: true});
    assert.equal(created.modified, true);
    assert.deepEqual(await store.get('order:order_livecheck', {type: 'json'}), {status: 'pending'});
    const listed = await store.list({prefix: 'order:'});
    assert.deepEqual(listed.blobs.map(function(entry){ return entry.key; }), ['order:order_livecheck']);
    const updated = await store.set('order:order_livecheck', JSON.stringify({status: 'captured'}),
      {onlyIfMatch: created.etag});
    assert.equal(updated.modified, true);
    assert.deepEqual(await store.getWithMetadata('order:order_livecheck', {type: 'json'}), {
      data: {status: 'captured'},
      etag: updated.etag,
      metadata: {}
    });
    await store.delete('order:order_livecheck');
    assert.equal(await store.get('order:order_livecheck'), null);
  } finally{
    await pool.end();
  }
});

test('Netlify snapshot import uses PostgreSQL transactions and is repeatable for identical data', async function(){
  const database = newDb({noAstCoverageCheck: true});
  const pg = database.adapters.createPg();
  const pool = new pg.Pool();
  try{
    await applySchema(pool);
    const records = [
      {key: 'order:order_imported', value: {razorpayOrderId: 'order_imported', paymentStatus: 'pending'}},
      {key: 'revoked-session:session_test', value: {revokedAt: 123}}
    ];
    assert.deepEqual(await importSnapshot(pool, records), {
      inserted: 2,
      alreadyPresent: 0,
      total: 2
    });
    assert.deepEqual(await importSnapshot(pool, records), {
      inserted: 0,
      alreadyPresent: 2,
      total: 2
    });
    await assert.rejects(importSnapshot(pool, [
      {key: 'order:order_imported', value: {razorpayOrderId: 'order_imported', paymentStatus: 'captured'}},
      records[1]
    ]), /conflicts/);
    const stored = await pool.query('SELECT value FROM shailus_blob_store WHERE key = $1', [
      'order:order_imported'
    ]);
    assert.deepEqual(stored.rows[0].value, records[0].value);
  } finally{
    await pool.end();
  }
});

test('Render API adapts all seven routes to their corresponding handlers', async function(){
  const received = [];
  const testHandlers = Object.fromEntries(routes.map(function(route){
    return [route.handler, {handler: async function(event){
      received.push({name: route.handler, event: event});
      return {
        statusCode: 200,
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({handler: route.handler})
      };
    }}];
  }));
  const app = createApp({handlers: testHandlers, allowedOrigins: ['https://shop.example']});
  const listening = await listen(app);
  try{
    for(const route of routes){
      const method = route.method === 'get' ? 'GET' : 'POST';
      const response = await fetch(listening.origin + route.path + (route.handler === 'admin-orders' ? '?search=one' : ''), {
        method: method,
        headers: {
          origin: 'https://shop.example',
          'content-type': 'application/json'
        },
        ...(method === 'POST' ? {body: '{"items":[]}'} : {})
      });
      assert.equal(response.status, 200, route.path);
      assert.equal(response.headers.get('access-control-allow-origin'), 'https://shop.example');
      assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
      assert.equal((await response.json()).handler, route.handler);
    }
    assert.equal(received.length, routes.length);
    assert.equal(received.find(function(entry){ return entry.name === 'create-order'; }).event.body, '{"items":[]}');
    assert.equal(received.find(function(entry){ return entry.name === 'admin-orders'; })
      .event.queryStringParameters.search, 'one');
    const authRead = await fetch(listening.origin + '/api/admin/auth', {
      headers: {origin: 'https://shop.example'}
    });
    assert.equal(authRead.status, 200);
    assert.equal((await authRead.json()).handler, 'admin-auth');
  } finally{
    await close(listening.server);
  }
});

test('Render API rejects unknown origins and supports credentialed preflight', async function(){
  const testHandlers = Object.fromEntries(routes.map(function(route){
    return [route.handler, {handler: async function(){
      return {statusCode: 200, headers: {}, body: ''};
    }}];
  }));
  const app = createApp({handlers: testHandlers, allowedOrigins: ['https://shop.example']});
  const listening = await listen(app);
  try{
    const rejected = await fetch(listening.origin + '/api/admin/orders', {
      headers: {origin: 'https://attacker.example'}
    });
    assert.equal(rejected.status, 403);

    const preflight = await fetch(listening.origin + '/api/admin/auth', {
      method: 'OPTIONS',
      headers: {origin: 'https://shop.example', 'access-control-request-method': 'POST'}
    });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    assert.match(preflight.headers.get('access-control-allow-methods'), /POST/);
  } finally{
    await close(listening.server);
  }
});

test('Render health endpoint reports availability and database failures', async function(){
  const healthy = await listen(createApp({
    handlers: {},
    allowedOrigins: [],
    healthCheck: async function(){}
  }));
  try{
    const response = await fetch(healthy.origin + '/healthz');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {status: 'ok'});
    assert.equal(response.headers.get('cache-control'), 'no-store');
  } finally{
    await close(healthy.server);
  }

  const unhealthy = await listen(createApp({
    handlers: {},
    allowedOrigins: [],
    healthCheck: async function(){ throw new Error('database unavailable'); }
  }));
  try{
    const response = await fetch(unhealthy.origin + '/healthz');
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {status: 'unavailable'});
  } finally{
    await close(unhealthy.server);
  }
});

test('Render startup validates required database and Render port configuration', function(){
  assert.throws(function(){
    validateStartupConfig({PORT: '10000'});
  }, /DATABASE_URL is required/);
  assert.throws(function(){
    validateStartupConfig({DATABASE_URL: 'https://database.example', PORT: '10000'});
  }, /PostgreSQL protocol/);
  assert.throws(function(){
    validateStartupConfig({DATABASE_URL: 'postgres://user:password@db.example/orders', PORT: '0'});
  }, /PORT must be an integer/);
  assert.equal(validateStartupConfig({
    DATABASE_URL: 'postgres://user:password@db.example/orders',
    PORT: '10000'
  }), 10000);
});

test('Startup error diagnostics include stacks and redact configured secrets', function(){
  const error = new Error('Connection to postgres://dbuser:dbpassword@database.example/orders failed');
  const log = formatError(error, {
    ADMIN_SESSION_SECRET: 'session-secret-value',
    ADMIN_USERS_JSON: '[{"passwordHash":"private-hash"}]',
    RAZORPAY_KEY_SECRET: 'razorpay-secret-value',
    RAZORPAY_WEBHOOK_SECRET: 'webhook-secret-value'
  });
  assert.match(log, /Connection to postgres:\/\/\[REDACTED\]@database\.example\/orders failed/);
  assert.match(log, /render-migration\.test\.js/);
  assert.doesNotMatch(log, /dbpassword|session-secret-value|private-hash|razorpay-secret-value|webhook-secret-value/);
  assert.match(formatError(new Error('cause message'), {}).split('\n')[0], /cause message/);
});

test('Render API preserves secure host-only SameSite=Strict admin cookies', async function(){
  const app = createApp({
    handlers: {
      'admin-auth': {handler: async function(){
        return {
          statusCode: 200,
          headers: {'Set-Cookie': 'sc_admin_session=token; Path=/; HttpOnly; SameSite=Strict; Secure'},
          body: '{"authenticated":true}'
        };
      }}
    },
    allowedOrigins: ['https://shop.example']
  });
  const listening = await listen(app);
  try{
    const response = await fetch(listening.origin + '/api/admin/auth', {
      headers: {origin: 'https://shop.example'}
    });
    const cookie = response.headers.get('set-cookie');
    assert.equal(response.status, 200);
    assert.match(cookie, /HttpOnly/);
    assert.match(cookie, /SameSite=Strict/);
    assert.match(cookie, /; Secure/);
    assert.doesNotMatch(cookie, /SameSite=None|Domain=/i);
    assert.equal(response.headers.get('access-control-allow-credentials'), 'true');
  } finally{
    await close(listening.server);
  }
});

test('Render webhook adapter preserves the raw JSON body', async function(){
  let received;
  const testHandlers = Object.fromEntries(routes.map(function(route){
    return [route.handler, {handler: async function(event){
      received = event;
      return {statusCode: 200, headers: {}, body: 'ok'};
    }}];
  }));
  const app = createApp({handlers: testHandlers, allowedOrigins: []});
  const listening = await listen(app);
  const rawBody = '{"event":"payment.captured","payload":{"id":"a b"}}';
  try{
    const result = await fetch(listening.origin + '/api/webhooks/razorpay', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: rawBody
    });
    assert.equal(result.status, 200);
    assert.equal(received.body, rawBody);
  } finally{
    await close(listening.server);
  }
});

test('Netlify Blobs export preserves stored JSON and importer validates records without allowing overwrites', async function(){
  const fakeStore = {
    async *list(){
      yield {blobs: [{key: 'order:order_test'}]};
    },
    async get(){
      return '{"razorpayOrderId":"order_test","orderRef":"SC-20261013-A1B2C3D4E5F60718293A4B5C"}';
    }
  };
  const snapshot = await exportStore(fakeStore);
  assert.equal(snapshot.recordCount, 1);
  const records = validateSnapshot(snapshot);
  assert.equal(records[0].key, 'order:order_test');
  assertPrivateInputPath(path.join(os.tmpdir(), 'private-snapshot.json'));
  assert.throws(function(){
    assertPrivateInputPath(path.join(__dirname, '..', 'snapshot.enc.json'));
  }, /outside the project/);
  assertPrivateOutputPath(path.join(os.tmpdir(), 'private-export.enc.json'));
  assert.throws(function(){
    assertPrivateOutputPath(path.join(__dirname, '..', 'private-export.enc.json'));
  }, /outside the project/);
  assert.throws(function(){
    validateSnapshot(Object.assign({}, snapshot, {
      records: snapshot.records.concat(snapshot.records),
      recordCount: 2
    }));
  }, /duplicate/);
});

test('Netlify Blobs snapshot importer rejects mismatched order keys and empty snapshots', function(){
  const mismatch = {
    formatVersion: 1,
    storeName: 'shailus-concepts-orders',
    recordCount: 1,
    records: [{key: 'order:order_other', value: JSON.stringify({razorpayOrderId: 'order_test'})}]
  };
  assert.throws(function(){ validateSnapshot(mismatch); }, /invalid order/);
  assert.throws(function(){
    validateSnapshot({formatVersion: 1, storeName: 'shailus-concepts-orders', recordCount: 0, records: []});
  }, /invalid or empty/);
});

test('Netlify Blobs snapshots are encrypted and authenticated before import', async function(){
  const snapshot = {
    formatVersion: 1,
    storeName: 'shailus-concepts-orders',
    recordCount: 0,
    records: []
  };
  const encrypted = await encryptSnapshot(snapshot, 'private-migration-passphrase');
  assert.equal(JSON.stringify(encrypted).includes('shailus-concepts-orders'), false);
  assert.deepEqual(await decryptSnapshot(encrypted, 'private-migration-passphrase'), snapshot);
  await assert.rejects(decryptSnapshot(encrypted, 'wrong-migration-passphrase'),
    /decryption failed/);
  await assert.rejects(decryptSnapshot(Object.assign({}, encrypted, {
    ciphertext: '%%%='
  }), 'private-migration-passphrase'), /decryption failed/);
});

test('Netlify Blobs import is atomic, idempotent for matching records, and rejects conflicts', async function(){
  const initial = new Map([
    ['order:order_existing', {razorpayOrderId: 'order_existing'}]
  ]);
  const rows = new Map(initial);
  let staged = null;
  const statements = [];
  const client = {
    async query(sql, values){
      statements.push(sql.trim().split(/\s+/)[0]);
      if(sql.startsWith('BEGIN')){
        staged = new Map(rows);
        return {rowCount: null, rows: []};
      }
      if(sql === 'COMMIT'){
        rows.clear();
        staged.forEach(function(value, key){ rows.set(key, value); });
        return {rowCount: null, rows: []};
      }
      if(sql === 'ROLLBACK'){
        staged = null;
        return {rowCount: null, rows: []};
      }
      if(sql.includes('SELECT key, value FROM shailus_blob_store')){
        return {
          rowCount: staged.size,
          rows: Array.from(staged, function(entry){ return {key: entry[0], value: entry[1]}; })
        };
      }
      if(sql.includes('SELECT count(*)::integer AS total')){
        return {rowCount: 1, rows: [{total: staged.size}]};
      }
      if(sql.includes('INSERT INTO shailus_blob_store')){
        const key = values[0];
        if(staged.has(key)) return {rowCount: 0, rows: []};
        staged.set(key, JSON.parse(values[1]));
        return {rowCount: 1, rows: [{key: key}]};
      }
      throw new Error('Unexpected import SQL: ' + sql);
    },
    release(){}
  };
  const database = {connect: async function(){ return client; }};
  const records = [
    {key: 'order:order_new', value: {razorpayOrderId: 'order_new'}},
    {key: 'order:order_existing', value: {razorpayOrderId: 'order_existing'}}
  ];
  const firstImport = await importSnapshot(database, records);
  assert.deepEqual(firstImport, {inserted: 1, alreadyPresent: 1, total: 2});
  assert.deepEqual(await importSnapshot(database, records), {
    inserted: 0,
    alreadyPresent: 2,
    total: 2
  });
  assert.deepEqual(Array.from(rows.keys()).sort(), ['order:order_existing', 'order:order_new']);

  const beforeConflict = new Map(rows);
  const conflicting = records.map(function(record){
    return record.key === 'order:order_existing'
      ? {key: record.key, value: {razorpayOrderId: 'different'}}
      : record;
  });
  await assert.rejects(importSnapshot(database, conflicting), /conflicts/);
  assert.deepEqual(Array.from(rows), Array.from(beforeConflict));
  assert.equal(statements.includes('ROLLBACK'), true);
  assert.equal(statements.includes('COMMIT'), true);
});

test('Netlify Blobs import refuses unrelated destination records without changing them', async function(){
  const rows = new Map([['order:order_unrelated', {razorpayOrderId: 'order_unrelated'}]]);
  let staged;
  const client = {
    async query(sql){
      if(sql.startsWith('BEGIN')){
        staged = new Map(rows);
        return {rows: []};
      }
      if(sql.includes('SELECT key, value FROM shailus_blob_store')){
        return {rows: Array.from(staged, function(entry){ return {key: entry[0], value: entry[1]}; })};
      }
      if(sql === 'ROLLBACK') return {rows: []};
      throw new Error('Unexpected import SQL: ' + sql);
    },
    release(){}
  };
  await assert.rejects(importSnapshot({connect: async function(){ return client; }}, [
    {key: 'order:order_snapshot', value: {razorpayOrderId: 'order_snapshot'}}
  ]), /absent from the snapshot/);
  assert.deepEqual(Array.from(rows.keys()), ['order:order_unrelated']);
});

test('Render SQL migration is additive and has a durable JSON record table', function(){
  const schema = fs.readFileSync(path.join(__dirname, '..', 'migrations', '001_render_storage.sql'), 'utf8');
  assert.match(schema, /CREATE TABLE IF NOT EXISTS shailus_blob_store/);
  assert.match(schema, /key text PRIMARY KEY/);
  assert.match(schema, /value jsonb NOT NULL/);
  assert.match(schema, /key text PRIMARY KEY/);
  assert.doesNotMatch(schema, /\bDROP\b|\bTRUNCATE\b|\bDELETE\b/i);
});

test('Render Blueprint defines persistent staging resources and required secrets', function(){
  const source = fs.readFileSync(path.join(__dirname, '..', 'render.yaml'), 'utf8');
  const blueprint = YAML.parse(source);
  assert.equal(blueprint.databases[0].name, 'shailus-concepts-orders-staging');
  assert.equal(blueprint.databases[0].plan, 'basic-256mb');
  assert.equal(blueprint.services[0].name, 'shailus-concepts-api-staging');
  assert.equal(blueprint.services[0].buildCommand, 'npm ci');
  assert.equal(blueprint.services[0].startCommand, 'npm start');
  assert.equal(blueprint.services[0].healthCheckPath, '/healthz');
  const env = Object.fromEntries(blueprint.services[0].envVars.map(function(item){
    return [item.key, item];
  }));
  ['DATABASE_URL', 'ADMIN_SESSION_SECRET', 'ADMIN_USERS_JSON', 'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET', 'CHECKOUT_ALLOWED_ORIGINS']
    .forEach(function(key){ assert.ok(env[key], key + ' must be configured'); });
  assert.equal(env.DATABASE_URL.fromDatabase.property, 'connectionString');
  assert.equal(env.ADMIN_SESSION_SECRET.sync, false);
  assert.equal(env.RAZORPAY_KEY_SECRET.sync, false);
});

test('API configuration keeps Netlify fallback and maps all Render endpoints', function(){
  const source = fs.readFileSync(path.join(__dirname, '..', 'api-config.js'), 'utf8');
  const legacyWindow = {};
  vm.runInNewContext(source, {window: legacyWindow, URL: URL});
  assert.equal(legacyWindow.ShailusApi.url('create-order'), '/.netlify/functions/create-order');

  const renderWindow = {SHAILUS_API_BASE_URL: 'https://shailus-concepts-api-staging.onrender.com'};
  vm.runInNewContext(source, {window: renderWindow, URL: URL});
  const expectedRoutes = {
    'admin-auth': '/api/admin/auth',
    'admin-orders': '/api/admin/orders',
    'admin-update-order': '/api/admin/orders/status',
    'create-order': '/api/payments/orders',
    'verify-payment': '/api/payments/verify',
    'sync-payment-status': '/api/payments/status',
    'razorpay-webhook': '/api/webhooks/razorpay'
  };
  assert.equal(routes.length, Object.keys(expectedRoutes).length);
  assert.deepEqual(routes.map(function(route){ return route.handler; }).sort(),
    Object.keys(expectedRoutes).sort());
  assert.deepEqual(routes.map(function(route){ return [route.method, route.path, route.handler]; }), [
    ['all', '/api/admin/auth', 'admin-auth'],
    ['get', '/api/admin/orders', 'admin-orders'],
    ['post', '/api/admin/orders/status', 'admin-update-order'],
    ['post', '/api/payments/orders', 'create-order'],
    ['post', '/api/payments/verify', 'verify-payment'],
    ['post', '/api/payments/status', 'sync-payment-status'],
    ['post', '/api/webhooks/razorpay', 'razorpay-webhook']
  ]);
  Object.entries(expectedRoutes).forEach(function(entry){
    assert.equal(renderWindow.ShailusApi.url(entry[0]),
      'https://shailus-concepts-api-staging.onrender.com' + entry[1]);
  });
  assert.throws(function(){ renderWindow.ShailusApi.url('unsupported'); }, /Unsupported/);
  renderWindow.SHAILUS_API_BASE_URL = 'file:///tmp/api';
  assert.throws(function(){ renderWindow.ShailusApi.url('admin-auth'); }, /invalid/);
  renderWindow.SHAILUS_API_BASE_URL = 'https://user:secret@example.com';
  assert.throws(function(){ renderWindow.ShailusApi.url('admin-auth'); }, /invalid/);
});

test('Removed Product 90 is absent from the catalog and image resolution', async function(){
  const root = path.join(__dirname, '..');
  const catalog = JSON.parse(fs.readFileSync(path.join(root, 'giftcard.products.json'), 'utf8'));
  const product90 = catalog.find(function(product){ return String(product.productId) === '90'; });
  assert.equal(product90, undefined);
  assert.doesNotMatch(fs.readFileSync(path.join(root, 'products-data.js'), 'utf8'), /productId\s*===?\s*90/);
  const frontendWindow = {dispatchEvent: function(){}};
  const source = fs.readFileSync(path.join(root, 'products-data.js'), 'utf8');
  vm.runInNewContext(source, {
    window: frontendWindow,
    document: {currentScript: {src: 'https://shop.example/products-data.js'}},
    URL: URL,
    fetch: async function(){ return {ok: true, json: async function(){ return catalog; }}; },
    CustomEvent: function(){}
  });
  const loadedProducts = await frontendWindow.productsReady;
  assert.equal(loadedProducts.some(function(product){ return String(product.id) === '90'; }), false);
});
