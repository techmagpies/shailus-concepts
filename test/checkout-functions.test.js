'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const checkoutService = require('../netlify/lib/checkout-service');
const createOrder = require('../netlify/functions/create-order');
const verifyPayment = require('../netlify/functions/verify-payment');
const syncPaymentStatus = require('../netlify/functions/sync-payment-status');
const adminAuthFunction = require('../netlify/functions/admin-auth');
const adminOrders = require('../netlify/functions/admin-orders');
const adminUpdateOrder = require('../netlify/functions/admin-update-order');
const razorpayWebhook = require('../netlify/functions/razorpay-webhook');
const {newestPayment} = require('../netlify/functions/sync-payment-status');
const ordersStore = require('../netlify/lib/orders-store');
const auth = require('../netlify/lib/admin-auth');
const adminHttp = require('../netlify/lib/admin-http');
const http = require('../netlify/lib/http');

const ORIGIN = 'http://localhost:8888';
const SECRET = 'test-razorpay-secret-only';
const ORDER_REF = 'SC-20261013-A1B2C3D4E5F60718293A4B5C';
const CUSTOMER = {
  name: 'Test Customer',
  contact: 'customer@example.com',
  phone: '9704123499',
  address: '1 Test Street',
  city: 'Proddatur',
  postalCode: '516360',
  state: 'Andhra Pradesh',
  country: 'India'
};

class MemoryBlobStore{
  constructor(){
    this.entries = new Map();
    this.revision = 0;
  }
  async get(key, options){
    const entry = this.entries.get(key);
    if(!entry) return null;
    return options && options.type === 'json' ? JSON.parse(entry.value) : entry.value;
  }
  async getWithMetadata(key, options){
    const entry = this.entries.get(key);
    if(!entry) return null;
    return {
      data: options && options.type === 'json' ? JSON.parse(entry.value) : entry.value,
      etag: entry.etag,
      metadata: {}
    };
  }
  async set(key, value, options){
    const current = this.entries.get(key);
    if(options && options.onlyIfNew && current) return {modified: false};
    if(options && options.onlyIfMatch && (!current || current.etag !== options.onlyIfMatch)){
      return {modified: false};
    }
    const etag = String(++this.revision);
    this.entries.set(key, {value: String(value), etag: etag});
    return {modified: true, etag: etag};
  }
  async delete(key){
    this.entries.delete(key);
  }
  async list(options){
    const prefix = options && options.prefix || '';
    return {blobs: Array.from(this.entries.entries())
      .filter(function(entry){ return entry[0].startsWith(prefix); })
      .map(function(entry){ return {key: entry[0], etag: entry[1].etag}; })};
  }
}

let memoryStore = new MemoryBlobStore();
ordersStore.setStoreProvider(function(){ return memoryStore; });

function resetStore(){
  memoryStore = new MemoryBlobStore();
  ordersStore.setStoreProvider(function(){ return memoryStore; });
}

function event(body, method, headers){
  return {
    httpMethod: method || 'POST',
    headers: Object.assign({origin: ORIGIN, 'x-nf-client-connection-ip': '127.0.0.1'}, headers || {}),
    body: body === undefined ? undefined : JSON.stringify(body)
  };
}

function response(status, value){
  return {
    ok: status >= 200 && status < 300,
    status: status,
    json: async function(){ return value; }
  };
}

function setPaymentEnvironment(){
  process.env.RAZORPAY_KEY_ID = 'rzp_test_public';
  process.env.RAZORPAY_KEY_SECRET = SECRET;
  process.env.CHECKOUT_ALLOWED_ORIGINS = ORIGIN;
}

function sign(orderId, paymentId){
  return crypto.createHmac('sha256', SECRET).update(orderId + '|' + paymentId).digest('hex');
}

function razorpayOrder(overrides){
  return Object.assign({
    id: 'order_test123',
    amount: 9600,
    currency: 'INR',
    receipt: ORDER_REF,
    notes: {source: 'shailus-concepts-netlify', order_reference: ORDER_REF},
    status: 'paid',
    amount_paid: 9600,
    amount_due: 0
  }, overrides || {});
}

function razorpayPayment(overrides){
  return Object.assign({
    id: 'pay_test123',
    order_id: 'order_test123',
    amount: 9600,
    currency: 'INR',
    status: 'captured',
    created_at: 1
  }, overrides || {});
}

function record(overrides){
  return Object.assign({
    orderRef: ORDER_REF,
    createdAt: '2026-10-13T10:00:00.000Z',
    updatedAt: '2026-10-13T10:00:00.000Z',
    customer: CUSTOMER,
    items: [{
      id: '4', name: 'Elegant Red Vacuum Water Bottle', quantity: 1,
      unitPricePaise: 12000, discountPercentage: 20, discountPaise: 2400,
      discountedUnitPricePaise: 9600, lineTotalPaise: 9600
    }],
    combinedQuantity: 1,
    subtotalPaise: 12000,
    discountPercentage: 20,
    discountPaise: 2400,
    totalPaise: 9600,
    currency: 'INR',
    razorpayOrderId: 'order_test123',
    razorpayPaymentId: null,
    paymentStatus: 'pending',
    orderStatus: 'new',
    statusHistory: [{at: '2026-10-13T10:00:00.000Z', status: 'new', updatedBy: 'system'}]
  }, overrides || {});
}

async function seedOrder(overrides){
  return ordersStore.createOrder(record(overrides));
}

function cookieFrom(responseValue){
  const cookie = responseValue.headers['Set-Cookie'].split(';')[0];
  return {cookie: cookie};
}

async function setAdminEnvironment(){
  process.env.CONTEXT = 'dev';
  process.env.ADMIN_SESSION_SECRET = 'test-only-admin-session-secret-at-least-32-bytes';
  process.env.CHECKOUT_ALLOWED_ORIGINS = ORIGIN;
  const owner = await auth.makePasswordHash('Test-Owner-Password-123');
  const staff = await auth.makePasswordHash('Test-Staff-Password-456');
  process.env.ADMIN_USERS_JSON = JSON.stringify([
    {email: 'owner@example.test', role: 'owner', salt: owner.salt, passwordHash: owner.passwordHash},
    {email: 'staff@example.test', role: 'staff', salt: staff.salt, passwordHash: staff.passwordHash}
  ]);
}

test('product 4 uses the supplied local image and one canonical product name', function(){
  const catalog = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'giftcard.products.json'), 'utf8'));
  const product = catalog.find(function(item){ return item.productId === 4; });
  const resolver = fs.readFileSync(path.join(__dirname, '..', 'products-data.js'), 'utf8');
  assert.equal(product.name, 'Elegant Red Vacuum Water Bottle');
  assert.equal(product.image, 'assets/id4.png');
  assert.deepEqual(product.images, []);
  assert.match(resolver, /'id4\.png'/);
  assert.equal(fs.existsSync(path.join(__dirname, '..', 'assets', 'id4.png')), true);
});

test('combined-quantity discount boundaries and multiple products use one shared rate', function(){
  const products = [{productId: 1, name: 'A', price: 100}, {productId: 2, name: 'B', price: 100}];
  const cases = [
    {quantity: 1, discount: 20, unit: 8000},
    {quantity: 30, discount: 20, unit: 8000},
    {quantity: 31, discount: 0, unit: 10000},
    {quantity: 50, discount: 0, unit: 10000},
    {quantity: 51, discount: 30, unit: 7000}
  ];
  cases.forEach(function(entry){
    const order = checkoutService.calculateOrder([{id: '1', qty: entry.quantity}], products);
    assert.equal(order.discountPercentage, entry.discount);
    assert.equal(order.items[0].discountedUnitPricePaise, entry.unit);
  });
  const combined35 = checkoutService.calculateOrder([{id: '1', qty: 20}, {id: '2', qty: 15}], products);
  assert.equal(combined35.discountPercentage, 0);
  assert.deepEqual(combined35.items.map(function(item){ return item.discountedUnitPricePaise; }), [10000, 10000]);
  const combined55 = checkoutService.calculateOrder([{id: '1', qty: 30}, {id: '2', qty: 25}], products);
  assert.equal(combined55.discountPercentage, 30);
  assert.deepEqual(combined55.items.map(function(item){ return item.discountedUnitPricePaise; }), [7000, 7000]);
});

test('rejects unknown products, invalid quantities, and duplicate IDs', function(){
  const products = [{productId: 1, name: 'A', price: 100}];
  [
    [{id: '999', qty: 1}],
    [{id: '1', qty: 0}],
    [{id: '1', qty: 1.5}],
    [{id: '1', qty: Number.MAX_SAFE_INTEGER + 1}],
    [{id: '1', qty: 1}, {id: '1', qty: 2}]
  ].forEach(function(items){ assert.throws(function(){ checkoutService.calculateOrder(items, products); }); });
});

test('Netlify Blobs order records are unique, queryable, and updated with conditional writes', async function(){
  resetStore();
  await seedOrder();
  assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).orderRef, ORDER_REF);
  assert.equal((await ordersStore.getByReference(ORDER_REF)).totalPaise, 9600);
  assert.equal((await ordersStore.listOrders()).length, 1);
  await assert.rejects(function(){ return seedOrder(); }, /already exists/);
  const updated = await ordersStore.updateOrder('order_test123', function(current){
    return Object.assign({}, current, {paymentStatus: 'authorized'});
  });
  assert.equal(updated.paymentStatus, 'authorized');
});

test('create-order persists trusted product and customer snapshots before returning the Razorpay order', async function(){
  resetStore();
  setPaymentEnvironment();
  const previousFetch = global.fetch;
  let request;
  global.fetch = async function(url, options){
    request = {url: url, options: options, body: JSON.parse(options.body)};
    return response(200, {
      id: 'order_created123',
      amount: request.body.amount,
      currency: request.body.currency,
      receipt: request.body.receipt,
      status: 'created'
    });
  };
  try{
    const result = await createOrder.handler(event({
      items: [{id: '4', qty: 1}],
      customer: CUSTOMER,
      amount: 1,
      discountPercentage: 99
    }));
    assert.equal(result.statusCode, 200);
    const body = JSON.parse(result.body);
    assert.equal(body.amount, 9600);
    assert.equal(body.quote.discountPercentage, 20);
    assert.equal(body.orderRef, request.body.receipt);
    assert.match(body.orderRef, /^SC-\d{8}-[A-F\d]{24}$/);
    assert.equal(body.keyId, process.env.RAZORPAY_KEY_ID);
    assert.equal(JSON.stringify(body).includes(SECRET), false);
    assert.equal(request.body.amount, 9600);
    assert.equal(request.body.currency, 'INR');
    assert.deepEqual(Object.keys(request.body.notes).sort(),
      ['combined_quantity', 'discount_percentage', 'order_reference', 'source']);
    const saved = await ordersStore.getByRazorpayOrderId('order_created123');
    assert.equal(saved.paymentStatus, 'pending');
    assert.equal(saved.orderStatus, 'new');
    assert.equal(saved.items[0].name, 'Elegant Red Vacuum Water Bottle');
    assert.equal(saved.items[0].unitPricePaise, 12000);
    assert.equal(saved.items[0].discountedUnitPricePaise, 9600);
    assert.deepEqual(saved.customer, CUSTOMER);
  } finally{
    global.fetch = previousFetch;
  }
});

test('create-order rejects invalid input/origins and does not create an order when storage fails', async function(){
  resetStore();
  setPaymentEnvironment();
  const previousFetch = global.fetch;
  let calls = 0;
  global.fetch = async function(url, options){
    calls++;
    const body = JSON.parse(options.body);
    return response(200, {
      id: 'order_unstored123', amount: body.amount, currency: body.currency,
      receipt: body.receipt, status: 'created'
    });
  };
  try{
    for(const items of [[{id: 'not-a-product', qty: 1}], [{id: '4', qty: 0}], [{id: '4', qty: 1.2}]]){
      assert.equal((await createOrder.handler(event({items: items, customer: CUSTOMER}))).statusCode, 400);
    }
    const blocked = await createOrder.handler(event({items: [{id: '4', qty: 1}], customer: CUSTOMER}, 'POST',
      {origin: 'https://unapproved.example'}));
    assert.equal(blocked.statusCode, 403);
    const previousProvider = ordersStore.setStoreProvider;
    ordersStore.setStoreProvider(function(){ return {set: async function(){ throw new Error('storage unavailable'); }}; });
    const storageFailure = await createOrder.handler(event({items: [{id: '4', qty: 1}], customer: CUSTOMER}));
    ordersStore.setStoreProvider(function(){ return memoryStore; });
    assert.equal(storageFailure.statusCode, 503);
    assert.equal(JSON.parse(storageFailure.body).error.includes('storage unavailable'), false);
    assert.equal(calls, 1);
    assert.equal(typeof previousProvider, 'function');
  } finally{
    ordersStore.setStoreProvider(function(){ return memoryStore; });
    global.fetch = previousFetch;
  }
});

test('CORS permits localhost and only explicitly configured production origins', function(){
  process.env.CHECKOUT_ALLOWED_ORIGINS = ORIGIN + ',https://shop.example';
  assert.equal(http.getCorsHeaders(ORIGIN).allowed, true);
  assert.equal(http.getCorsHeaders('https://shop.example').allowed, true);
  assert.equal(http.getCorsHeaders('https://evil.example').allowed, false);
  assert.equal(http.getCorsHeaders('*').allowed, false);
});

test('verify-payment persists only the server-confirmed payment and rejects invalid signatures', async function(){
  resetStore();
  setPaymentEnvironment();
  await seedOrder();
  const previousFetch = global.fetch;
  const calls = [];
  global.fetch = async function(url, options){
    calls.push({url: url, method: options.method});
    return response(200, url.endsWith('/orders/order_test123') ? razorpayOrder() : razorpayPayment());
  };
  try{
    const payload = {
      razorpay_order_id: 'order_test123',
      razorpay_payment_id: 'pay_test123',
      razorpay_signature: sign('order_test123', 'pay_test123')
    };
    const valid = await verifyPayment.handler(event(payload));
    assert.equal(valid.statusCode, 200);
    const result = JSON.parse(valid.body);
    assert.equal(result.verified, true);
    assert.equal(result.orderRef, ORDER_REF);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'captured');

    resetStore();
    await seedOrder();
    calls.length = 0;
    const invalidSignature = await verifyPayment.handler(event(Object.assign({}, payload, {
      razorpay_signature: '0'.repeat(64)
    })));
    assert.equal(invalidSignature.statusCode, 400);
    assert.equal(calls.length, 0);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'pending');
  } finally{
    global.fetch = previousFetch;
  }
});

test('verify-payment rejects missing saved orders and mismatched amount or currency', async function(){
  resetStore();
  setPaymentEnvironment();
  const previousFetch = global.fetch;
  let payment = razorpayPayment({amount: 9500});
  global.fetch = async function(url){
    return response(200, url.endsWith('/orders/order_test123') ? razorpayOrder() : payment);
  };
  try{
    const payload = {
      razorpay_order_id: 'order_test123',
      razorpay_payment_id: 'pay_test123',
      razorpay_signature: sign('order_test123', 'pay_test123')
    };
    const absent = await verifyPayment.handler(event(payload));
    assert.equal(absent.statusCode, 404);

    await seedOrder();
    const mismatch = await verifyPayment.handler(event(payload));
    assert.equal(mismatch.statusCode, 400);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'pending');
    payment = razorpayPayment({currency: 'USD'});
    assert.equal((await verifyPayment.handler(event(payload))).statusCode, 400);
  } finally{
    global.fetch = previousFetch;
  }
});

test('failed and pending payments persist non-paid statuses only', async function(){
  resetStore();
  setPaymentEnvironment();
  await seedOrder();
  const previousFetch = global.fetch;
  let payment = razorpayPayment({status: 'failed'});
  global.fetch = async function(url){
    return response(200, url.endsWith('/orders/order_test123')
      ? razorpayOrder({status: 'attempted', amount_paid: 0, amount_due: 9600}) : payment);
  };
  try{
    const payload = {
      razorpay_order_id: 'order_test123',
      razorpay_payment_id: 'pay_test123',
      razorpay_signature: sign('order_test123', 'pay_test123')
    };
    const failed = await verifyPayment.handler(event(payload));
    assert.equal(failed.statusCode, 409);
    assert.equal(JSON.parse(failed.body).status, 'failed');
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'failed');

    resetStore();
    await seedOrder();
    payment = razorpayPayment({status: 'created'});
    const pending = await verifyPayment.handler(event(payload));
    assert.equal(pending.statusCode, 409);
    assert.equal(JSON.parse(pending.body).verified, false);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'pending');
  } finally{
    global.fetch = previousFetch;
  }
});

test('authorized Razorpay payments are captured once, then persisted as captured', async function(){
  resetStore();
  setPaymentEnvironment();
  await seedOrder();
  const previousFetch = global.fetch;
  let captured = false;
  let captureCalls = 0;
  global.fetch = async function(url){
    if(url.endsWith('/capture')){
      captureCalls++;
      captured = true;
      return response(200, razorpayPayment());
    }
    if(url.endsWith('/orders/order_test123')){
      return response(200, razorpayOrder(captured ? {} : {status: 'attempted', amount_paid: 0, amount_due: 9600}));
    }
    return response(200, razorpayPayment(captured ? {} : {status: 'authorized'}));
  };
  try{
    const payload = {
      razorpay_order_id: 'order_test123',
      razorpay_payment_id: 'pay_test123',
      razorpay_signature: sign('order_test123', 'pay_test123')
    };
    const first = await verifyPayment.handler(event(payload));
    const repeated = await verifyPayment.handler(event(payload));
    assert.equal(first.statusCode, 200);
    assert.equal(repeated.statusCode, 200);
    assert.equal(captureCalls, 1);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'captured');
  } finally{
    global.fetch = previousFetch;
  }
});

test('checkout closure marks cancellation only after Razorpay confirms no payment attempt', async function(){
  resetStore();
  setPaymentEnvironment();
  await seedOrder();
  const previousFetch = global.fetch;
  let payments = [];
  global.fetch = async function(url){
    if(url.endsWith('/payments')) return response(200, {items: payments});
    return response(200, payments.some(function(payment){ return payment.status === 'captured'; })
      ? razorpayOrder()
      : razorpayOrder({status: 'created', amount_paid: 0, amount_due: 9600}));
  };
  try{
    const closed = await syncPaymentStatus.handler(event({orderId: 'order_test123', checkoutClosed: true}));
    assert.equal(closed.statusCode, 200);
    assert.equal(JSON.parse(closed.body).status, 'cancelled');
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'cancelled');

    payments = [razorpayPayment({status: 'failed'})];
    const failed = await syncPaymentStatus.handler(event({orderId: 'order_test123'}));
    assert.equal(JSON.parse(failed.body).status, 'failed');
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'failed');

    payments = [razorpayPayment()];
    const paid = await syncPaymentStatus.handler(event({orderId: 'order_test123', checkoutClosed: true}));
    assert.equal(JSON.parse(paid.body).verified, true);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'captured');
  } finally{
    global.fetch = previousFetch;
  }
});

test('payment reconciliation chooses the most recent Razorpay payment attempt', function(){
  const latest = newestPayment([
    razorpayPayment({id: 'pay_older', status: 'failed', created_at: 100}),
    razorpayPayment({id: 'pay_newer', status: 'created', created_at: 200})
  ]);
  assert.equal(latest.id, 'pay_newer');
  assert.equal(latest.status, 'created');
});

test('signed Razorpay webhooks reconcile payment status server-side and safely handle retries', async function(){
  resetStore();
  setPaymentEnvironment();
  const previousWebhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = 'test-webhook-secret-only';
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  await seedOrder();
  const previousFetch = global.fetch;
  let confirmed = razorpayPayment();
  let calls = 0;
  global.fetch = async function(url){
    calls++;
    return response(200, url.endsWith('/orders/order_test123') ? razorpayOrder() : confirmed);
  };
  function webhookEvent(eventName, payment, raw){
    const body = raw || JSON.stringify({
      event: eventName,
      payload: {payment: {entity: payment}}
    });
    const signature = crypto.createHmac('sha256', webhookSecret)
      .update(body).digest('hex');
    return {httpMethod: 'POST', headers: {'x-razorpay-signature': signature}, body: body};
  }
  try{
    const payment = {id: 'pay_test123', order_id: 'order_test123'};
    const invalid = webhookEvent('payment.captured', payment);
    invalid.headers['x-razorpay-signature'] = '0'.repeat(64);
    assert.equal((await razorpayWebhook.handler(invalid)).statusCode, 401);
    assert.equal(calls, 0);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'pending');

    const capturedEvent = webhookEvent('payment.captured', payment);
    const first = await razorpayWebhook.handler(capturedEvent);
    const repeated = await razorpayWebhook.handler(capturedEvent);
    assert.equal(first.statusCode, 200);
    assert.equal(repeated.statusCode, 200);
    const saved = await ordersStore.getByRazorpayOrderId('order_test123');
    assert.equal(saved.paymentStatus, 'captured');
    assert.equal(saved.razorpayPaymentId, 'pay_test123');
    assert.equal(saved.paymentHistory.length, 1);

    resetStore();
    await seedOrder();
    confirmed = razorpayPayment({status: 'failed'});
    const failed = await razorpayWebhook.handler(webhookEvent('payment.failed', payment));
    assert.equal(failed.statusCode, 200);
    assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).paymentStatus, 'failed');

    delete process.env.RAZORPAY_WEBHOOK_SECRET;
    assert.equal((await razorpayWebhook.handler(webhookEvent('payment.failed', payment))).statusCode, 503);
  } finally{
    global.fetch = previousFetch;
    if(previousWebhookSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
    else process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhookSecret;
  }
});

test('admin login authenticates hashed credentials, protects APIs, expires and revokes sessions', async function(){
  resetStore();
  await setAdminEnvironment();
  const denied = await adminOrders.handler(event(undefined, 'GET'));
  assert.equal(denied.statusCode, 401);
  assert.equal(JSON.stringify(denied).includes(CUSTOMER.address), false);

  const bad = await adminAuthFunction.handler(event({action: 'login', email: 'owner@example.test', password: 'wrong'}));
  assert.equal(bad.statusCode, 401);
  for(let attempt = 0; attempt < 7; attempt++){
    const invalid = await adminAuthFunction.handler(event({
      action: 'login', email: 'owner@example.test', password: 'wrong'
    }));
    assert.equal(invalid.statusCode, 401);
  }
  const locked = await adminAuthFunction.handler(event({
    action: 'login', email: 'owner@example.test', password: 'Test-Owner-Password-123'
  }));
  assert.equal(locked.statusCode, 429);
  const login = await adminAuthFunction.handler(event({
    action: 'login', email: 'owner@example.test', password: 'Test-Owner-Password-123'
  }, 'POST', {'x-nf-client-connection-ip': '127.0.0.2'}));
  assert.equal(login.statusCode, 200);
  assert.match(login.headers['Set-Cookie'], /HttpOnly/);
  assert.match(login.headers['Set-Cookie'], /SameSite=Strict/);
  assert.doesNotMatch(login.headers['Set-Cookie'], /Domain=/);
  const cookie = cookieFrom(login);
  const session = await adminAuthFunction.handler(event(undefined, 'GET', cookie));
  assert.equal(JSON.parse(session.body).user.role, 'owner');

  const signedUser = auth.getUsers().find(function(user){ return user.email === 'owner@example.test'; });
  const expiredPayload = {
    sub: signedUser.email,
    role: signedUser.role,
    sid: 'expired-test-session',
    exp: Math.floor(Date.now() / 1000) - 1,
    credentialVersion: crypto.createHash('sha256').update(signedUser.passwordHash).digest('hex')
  };
  const encoded = Buffer.from(JSON.stringify(expiredPayload)).toString('base64url');
  const signature = crypto.createHmac('sha256', process.env.ADMIN_SESSION_SECRET)
    .update(encoded).digest('base64url');
  const expiredCookie = {cookie: 'sc_admin_session=' + encodeURIComponent(encoded + '.' + signature)};
  assert.equal(await auth.authenticate(event(undefined, 'GET', expiredCookie)), null);

  process.env.CONTEXT = 'production';
  const secureLogin = await adminAuthFunction.handler(event({
    action: 'login', email: 'owner@example.test', password: 'Test-Owner-Password-123'
  }, 'POST', {'x-nf-client-connection-ip': '127.0.0.3'}));
  assert.match(secureLogin.headers['Set-Cookie'], /; Secure/);
  process.env.CONTEXT = 'dev';

  const logout = await adminAuthFunction.handler(event({action: 'logout'}, 'POST', cookie));
  assert.equal(logout.statusCode, 200);
  assert.match(logout.headers['Set-Cookie'], /Max-Age=0/);
  const revoked = await adminOrders.handler(event(undefined, 'GET', cookie));
  assert.equal(revoked.statusCode, 401);

  const secureCookie = cookieFrom(secureLogin);
  ordersStore.setStoreProvider(function(){
    return {getWithMetadata: async function(){ throw new Error('storage unavailable'); }};
  });
  try{
    const unavailableLogout = await adminAuthFunction.handler(event({action: 'logout'}, 'POST', secureCookie));
    assert.equal(unavailableLogout.statusCode, 503);
    assert.match(unavailableLogout.headers['Set-Cookie'], /Max-Age=0/);
  } finally{
    ordersStore.setStoreProvider(function(){ return memoryStore; });
  }
});

test('admin login initializes Netlify Blobs Lambda context before rate-limit storage', async function(){
  resetStore();
  await setAdminEnvironment();
  const previousContext = process.env.NETLIFY_BLOBS_CONTEXT;
  try{
    const request = event({
      action: 'login', email: 'owner@example.test', password: 'Test-Owner-Password-123'
    });
    request.blobs = Buffer.from(JSON.stringify({
      url: 'https://blobs.example.test',
      token: 'test-blobs-token'
    })).toString('base64');
    request.headers['x-nf-site-id'] = 'test-site-id';
    request.headers['x-nf-deploy-id'] = 'test-deploy-id';

    const login = await adminAuthFunction.handler(request);
    assert.equal(login.statusCode, 200);
    const context = JSON.parse(Buffer.from(process.env.NETLIFY_BLOBS_CONTEXT, 'base64').toString('utf8'));
    assert.equal(context.siteID, 'test-site-id');
    assert.equal(context.token, 'test-blobs-token');
    assert.doesNotThrow(function(){
      require('@netlify/blobs').getStore('configuration-test-store');
    });

    const session = await adminAuthFunction.handler(event(undefined, 'GET', cookieFrom(login)));
    assert.equal(session.statusCode, 200);
    assert.equal(JSON.parse(session.body).user.email, 'owner@example.test');
  } finally{
    if(previousContext === undefined) delete process.env.NETLIFY_BLOBS_CONTEXT;
    else process.env.NETLIFY_BLOBS_CONTEXT = previousContext;
  }
});

test('admin login logs storage exception details without credential values', async function(){
  resetStore();
  await setAdminEnvironment();
  const previousError = console.error;
  const messages = [];
  ordersStore.setStoreProvider(function(){
    throw Object.assign(new Error('Storage failed for token=private-value owner@example.test'), {
      name: 'StorageTestError'
    });
  });
  console.error = function(){ messages.push(Array.from(arguments).join(' ')); };
  try{
    const result = await adminAuthFunction.handler(event({
      action: 'login', email: 'owner@example.test', password: 'Test-Owner-Password-123'
    }));
    assert.equal(result.statusCode, 503);
    assert.match(messages.join('\n'), /StorageTestError/);
    assert.match(messages.join('\n'), /token=\[redacted\]/);
    assert.doesNotMatch(messages.join('\n'), /private-value|owner@example\.test|Test-Owner-Password-123/);
  } finally{
    console.error = previousError;
    ordersStore.setStoreProvider(function(){ return memoryStore; });
  }
});

test('staff can list/update allowed order statuses but cannot set payment status or arbitrary totals', async function(){
  resetStore();
  await setAdminEnvironment();
  await seedOrder();
  const unauthenticatedUpdate = await adminUpdateOrder.handler(event({
    orderRef: ORDER_REF, orderStatus: 'processing'
  }));
  assert.equal(unauthenticatedUpdate.statusCode, 401);
  const login = await adminAuthFunction.handler(event({
    action: 'login', email: 'staff@example.test', password: 'Test-Staff-Password-456'
  }));
  const cookie = cookieFrom(login);
  const list = await adminOrders.handler(event(undefined, 'GET', cookie));
  assert.equal(list.statusCode, 200);
  const listed = JSON.parse(list.body);
  assert.equal(listed.orders[0].customer.address, CUSTOMER.address);
  const updated = await adminUpdateOrder.handler(event({
    orderRef: ORDER_REF,
    orderStatus: 'processing',
    paymentStatus: 'captured',
    totalPaise: 1
  }, 'POST', cookie));
  assert.equal(updated.statusCode, 200);
  assert.equal(JSON.parse(updated.body).order.paymentStatus, 'pending');
  assert.equal(JSON.parse(updated.body).order.totalPaise, 9600);
  assert.equal((await ordersStore.getByRazorpayOrderId('order_test123')).orderStatus, 'processing');

  const forbiddenTransition = await adminUpdateOrder.handler(event({
    orderRef: ORDER_REF, orderStatus: 'delivered'
  }, 'POST', cookie));
  assert.equal(forbiddenTransition.statusCode, 409);
  const invalidStatus = await adminUpdateOrder.handler(event({
    orderRef: ORDER_REF, orderStatus: 'paid'
  }, 'POST', cookie));
  assert.equal(invalidStatus.statusCode, 400);

  process.env.ADMIN_USERS_JSON = JSON.stringify(auth.getUsers().filter(function(user){
    return user.email !== 'staff@example.test';
  }));
  const revokedStaff = await adminOrders.handler(event(undefined, 'GET', cookie));
  assert.equal(revokedStaff.statusCode, 401);
});

test('admin APIs reject unauthorized origins and invalid filters', async function(){
  resetStore();
  await setAdminEnvironment();
  const blocked = await adminAuthFunction.handler(event({action: 'login'}, 'POST', {origin: 'https://evil.test'}));
  assert.equal(blocked.statusCode, 403);
  await seedOrder();
  const login = await adminAuthFunction.handler(event({
    action: 'login', email: 'owner@example.test', password: 'Test-Owner-Password-123'
  }));
  const invalidFilterEvent = event(undefined, 'GET', cookieFrom(login));
  invalidFilterEvent.queryStringParameters = {dateFrom: '2026-02-31'};
  const invalidDate = await adminOrders.handler(invalidFilterEvent);
  assert.equal(invalidDate.statusCode, 400);
  const wrongMethod = await adminOrders.handler(event(undefined, 'POST'));
  assert.equal(wrongMethod.statusCode, 405);
});

test('admin endpoints accept only an explicitly allowed same-site Origin or Referer', function(){
  process.env.CHECKOUT_ALLOWED_ORIGINS = ORIGIN + ',https://shop.example';
  assert.equal(adminHttp.trustedRequest(event(undefined, 'GET')), true);
  assert.equal(adminHttp.trustedRequest({
    httpMethod: 'GET', headers: {referer: 'https://shop.example/admin/orders.html'}
  }), true);
  assert.equal(adminHttp.trustedRequest({
    httpMethod: 'GET', headers: {referer: 'https://evil.example/admin/orders.html'}
  }), false);
  assert.equal(adminHttp.trustedRequest({
    httpMethod: 'GET', headers: {referer: 'https://shop.example.evil.test/admin/orders.html'}
  }), false);
});
