'use strict';

const auth = require('../lib/admin-auth');
const adminHttp = require('../lib/admin-http');
const ordersStore = require('../lib/orders-store');

const PAYMENT_STATUSES = new Set(['pending', 'authorized', 'captured', 'failed', 'cancelled']);
const ORDER_STATUSES = new Set(['new', 'processing', 'shipped', 'delivered', 'cancelled']);

function validDate(value){
  if(!value) return true;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(value + 'T00:00:00.000Z');
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function matchesFilters(order, query){
  const search = String(query.search || '').trim().toLowerCase();
  const customer = order.customer || {};
  const searchable = [order.orderRef, customer.name, customer.email, customer.contact, customer.phone]
    .filter(function(value){ return typeof value === 'string'; }).join(' ').toLowerCase();
  const date = String(order.createdAt || '').slice(0, 10);
  return (!search || searchable.includes(search)) &&
    (!query.dateFrom || date >= query.dateFrom) &&
    (!query.dateTo || date <= query.dateTo) &&
    (!query.paymentStatus || order.paymentStatus === query.paymentStatus) &&
    (!query.orderStatus || order.orderStatus === query.orderStatus);
}

exports.handler = async function(event){
  if(!adminHttp.trustedRequest(event)){
    return adminHttp.response(403, {error: 'Request origin is not allowed.'});
  }
  if(adminHttp.method(event) !== 'GET'){
    return adminHttp.response(405, {error: 'Method not allowed.'}, {Allow: 'GET'});
  }
  try{
    ordersStore.initialize(event);
    const user = await auth.authenticate(event);
    if(!user) return adminHttp.response(401, {error: 'Sign in to view orders.'});
    const query = event.queryStringParameters || {};
    if(!validDate(query.dateFrom) || !validDate(query.dateTo) ||
       (query.paymentStatus && !PAYMENT_STATUSES.has(query.paymentStatus)) ||
       (query.orderStatus && !ORDER_STATUSES.has(query.orderStatus)) ||
       (query.search && query.search.length > 160)){
      return adminHttp.response(400, {error: 'One or more order filters are invalid.'});
    }
    const storedOrders = await ordersStore.listOrders();
    if(!Array.isArray(storedOrders)) throw new TypeError('Stored orders are invalid.');
    const orders = storedOrders
      .filter(function(order){ return order && matchesFilters(order, query); })
      .sort(function(left, right){ return right.createdAt.localeCompare(left.createdAt); });
    const completeOrders = orders.map(function(order){
      const customer = order.customer || {};
      const email = typeof customer.email === 'string' && customer.email
        ? customer.email
        : (typeof customer.contact === 'string' &&
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.contact) ? customer.contact : '');
      return Object.assign({}, order, {
        customer: Object.assign({}, customer, {email: email}),
        paymentMethod: typeof order.paymentMethod === 'string' ? order.paymentMethod : null
      });
    });
    const limited = completeOrders.slice(0, 300);
    return adminHttp.response(200, {
      orders: limited,
      total: orders.length,
      truncated: orders.length > limited.length,
      viewer: {email: user.email, role: user.role}
    });
  } catch(error){
    console.error('Admin order list request failed.');
    return adminHttp.response(503, {error: 'Orders are temporarily unavailable.'});
  }
};

exports.matchesFilters = matchesFilters;
