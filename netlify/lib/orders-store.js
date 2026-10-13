'use strict';

const {getStore} = require('@netlify/blobs');

const STORE_NAME = 'shailus-concepts-orders';
let storeProvider = function(){ return getStore(STORE_NAME); };

function storage(){
  return storeProvider();
}

function orderKey(orderId){
  return 'order:' + orderId;
}

function validateOrderId(orderId){
  return typeof orderId === 'string' && /^order_[A-Za-z0-9]+$/.test(orderId);
}

async function createOrder(order){
  if(!validateOrderId(order.razorpayOrderId)) throw new TypeError('Razorpay order ID is invalid.');
  const result = await storage().set(orderKey(order.razorpayOrderId), JSON.stringify(order), {onlyIfNew: true});
  if(!result.modified) throw new Error('Order record already exists.');
  return order;
}

async function getByRazorpayOrderId(orderId){
  if(!validateOrderId(orderId)) return null;
  return storage().get(orderKey(orderId), {type: 'json'});
}

async function listOrders(){
  const result = await storage().list({prefix: 'order:'});
  return Promise.all(result.blobs.map(async function(blob){
    return storage().get(blob.key, {type: 'json'});
  })).then(function(orders){ return orders.filter(Boolean); });
}

async function getByReference(reference){
  const orders = await listOrders();
  return orders.find(function(order){ return order.orderRef === reference; }) || null;
}

async function updateOrder(razorpayOrderId, updater){
  if(!validateOrderId(razorpayOrderId)) return null;
  const key = orderKey(razorpayOrderId);
  for(let attempt = 0; attempt < 5; attempt++){
    const current = await storage().getWithMetadata(key, {type: 'json'});
    if(!current || !current.data) return null;
    const next = await updater(current.data);
    if(next === null) return current.data;
    const result = await storage().set(key, JSON.stringify(next), {onlyIfMatch: current.etag});
    if(result.modified) return next;
  }
  throw new Error('Order changed repeatedly while saving an update.');
}

async function updateAuxiliary(key, updater){
  for(let attempt = 0; attempt < 5; attempt++){
    const current = await storage().getWithMetadata(key, {type: 'json'});
    const next = await updater(current && current.data ? current.data : null);
    if(next === null) return null;
    const options = current && current.data
      ? {onlyIfMatch: current.etag}
      : {onlyIfNew: true};
    const result = await storage().set(key, JSON.stringify(next), options);
    if(result.modified) return next;
  }
  throw new Error('Stored security state changed repeatedly.');
}

function revokeSession(sessionId, expiresAt){
  return updateAuxiliary('revoked-session:' + sessionId, function(current){
    return current || {expiresAt: expiresAt};
  });
}

async function isSessionRevoked(sessionId, now){
  const value = await storage().get('revoked-session:' + sessionId, {type: 'json'});
  if(!value) return false;
  if(value.expiresAt <= now){
    await storage().delete('revoked-session:' + sessionId);
    return false;
  }
  return true;
}

module.exports = {
  createOrder: createOrder,
  getByRazorpayOrderId: getByRazorpayOrderId,
  getByReference: getByReference,
  isSessionRevoked: isSessionRevoked,
  listOrders: listOrders,
  revokeSession: revokeSession,
  updateAuxiliary: updateAuxiliary,
  updateOrder: updateOrder,
  setStoreProvider: function(provider){
    storeProvider = provider || function(){ return getStore(STORE_NAME); };
  }
};
