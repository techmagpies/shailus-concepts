'use strict';

const auth = require('../lib/admin-auth');
const adminHttp = require('../lib/admin-http');
const ordersStore = require('../lib/orders-store');

const TRANSITIONS = {
  new: new Set(['processing', 'cancelled']),
  processing: new Set(['shipped', 'cancelled']),
  shipped: new Set(['delivered']),
  delivered: new Set(),
  cancelled: new Set()
};

exports.handler = async function(event){
  if(!adminHttp.trustedRequest(event)){
    return adminHttp.response(403, {error: 'Request origin is not allowed.'});
  }
  if(adminHttp.method(event) !== 'POST'){
    return adminHttp.response(405, {error: 'Method not allowed.'}, {Allow: 'POST'});
  }
  try{
    ordersStore.initialize(event);
    const user = await auth.authenticate(event);
    if(!user) return adminHttp.response(401, {error: 'Sign in to update orders.'});
    const body = adminHttp.parseBody(event);
    if(typeof body.orderRef !== 'string' || !/^SC-\d{8}-[A-F\d]{24}$/.test(body.orderRef) ||
       typeof body.orderStatus !== 'string' ||
       !Object.prototype.hasOwnProperty.call(TRANSITIONS, body.orderStatus)){
      return adminHttp.response(400, {error: 'Order reference or status is invalid.'});
    }
    const order = await ordersStore.getByReference(body.orderRef);
    if(!order) return adminHttp.response(404, {error: 'Order was not found.'});
    if(!TRANSITIONS[order.orderStatus] || !TRANSITIONS[order.orderStatus].has(body.orderStatus)){
      return adminHttp.response(409, {error: 'That order-status transition is not allowed.'});
    }
    const updated = await ordersStore.updateOrder(order.razorpayOrderId, function(current){
      if(current.orderStatus !== order.orderStatus ||
         !TRANSITIONS[current.orderStatus] || !TRANSITIONS[current.orderStatus].has(body.orderStatus)){
        return null;
      }
      const at = new Date().toISOString();
      const history = Array.isArray(current.statusHistory) ? current.statusHistory.slice(-49) : [];
      history.push({at: at, status: body.orderStatus, updatedBy: user.email});
      return Object.assign({}, current, {
        orderStatus: body.orderStatus,
        updatedAt: at,
        statusHistory: history
      });
    });
    if(!updated) return adminHttp.response(404, {error: 'Order was not found.'});
    if(updated.orderStatus !== body.orderStatus){
      return adminHttp.response(409, {error: 'Order changed before the update could be saved. Refresh and try again.'});
    }
    return adminHttp.response(200, {order: updated});
  } catch(error){
    if(error instanceof TypeError){
      return adminHttp.response(400, {error: error.message});
    }
    console.error('Admin order-status update failed.');
    return adminHttp.response(503, {error: 'Order status could not be saved.'});
  }
};

exports.TRANSITIONS = TRANSITIONS;
