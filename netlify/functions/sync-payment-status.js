'use strict';

const http = require('../lib/http');
const ordersStore = require('../lib/orders-store');
const razorpay = require('../lib/razorpay-client');
const savePaymentStatus = require('./verify-payment').savePaymentStatus;

const PAYMENT_PRIORITY = {created: 1, failed: 2, cancelled: 2, authorized: 3, captured: 4};

function newestPayment(payments){
  if(!Array.isArray(payments)) return null;
  return payments.filter(function(payment){
    return payment && payment.order_id && typeof payment.id === 'string' &&
      Object.prototype.hasOwnProperty.call(PAYMENT_PRIORITY, payment.status);
  }).sort(function(left, right){
    return Number(right.created_at || 0) - Number(left.created_at || 0) ||
      PAYMENT_PRIORITY[right.status] - PAYMENT_PRIORITY[left.status];
  })[0] || null;
}

exports.handler = async function(event){
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  const cors = http.getCorsHeaders(origin);
  if(!cors.allowed) return http.response(403, cors.headers, {error: 'Origin is not allowed.'});
  const methodResponse = http.handleMethod(event, cors);
  if(methodResponse) return methodResponse;

  try{
    ordersStore.initialize(event);
    const body = http.parseBody(event);
    const orderId = body.orderId;
    if(typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
       (body.checkoutClosed !== undefined && typeof body.checkoutClosed !== 'boolean')){
      throw Object.assign(new TypeError('Payment order reference is invalid.'), {statusCode: 400});
    }
    const record = await ordersStore.getByRazorpayOrderId(orderId);
    if(!record) throw Object.assign(new TypeError('The saved payment order could not be found.'), {statusCode: 404});
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if(!keyId || !keySecret) throw Object.assign(new Error('Payment service is not configured.'), {statusCode: 503});

    const order = await razorpay.request('/orders/' + encodeURIComponent(orderId), 'GET', keyId, keySecret);
    if(!razorpay.matchesStoredOrder(order, record, orderId)){
      throw Object.assign(new TypeError('Payment order does not match the saved order.'), {statusCode: 400});
    }
    const collection = await razorpay.request('/orders/' + encodeURIComponent(orderId) + '/payments',
      'GET', keyId, keySecret);
    const payment = newestPayment(collection && collection.items);
    let status = 'pending';
    let paymentId = null;
    if(payment){
      if(payment.order_id !== orderId || payment.amount !== record.totalPaise ||
         payment.currency !== record.currency){
        throw Object.assign(new TypeError('Payment attempt does not match the saved order.'), {statusCode: 400});
      }
      paymentId = payment.id;
      status = payment.status === 'captured' && order.status === 'paid' &&
        order.amount_paid === record.totalPaise && order.amount_due === 0
        ? 'captured'
        : (payment.status === 'authorized' ? 'authorized' :
          (payment.status === 'failed' ? 'failed' :
            (payment.status === 'cancelled' ? 'cancelled' : 'pending')));
    } else if(body.checkoutClosed === true && order.status === 'created'){
      status = 'cancelled';
    }

    const saved = await savePaymentStatus(orderId, status, paymentId, payment && payment.method);
    const finalStatus = saved ? saved.paymentStatus : (await ordersStore.getByRazorpayOrderId(orderId)).paymentStatus;
    const updatedRecord = saved || await ordersStore.getByRazorpayOrderId(orderId);
    return http.response(200, cors.headers, {
      verified: finalStatus === 'captured',
      status: finalStatus,
      orderId: orderId,
      orderRef: updatedRecord.orderRef,
      paymentId: updatedRecord.razorpayPaymentId,
      amount: finalStatus === 'captured' ? updatedRecord.totalPaise : undefined,
      currency: finalStatus === 'captured' ? updatedRecord.currency : undefined
    });
  } catch(error){
    const statusCode = error.statusCode || (error instanceof TypeError ? 400 : 502);
    if(statusCode >= 500) console.error('Payment status synchronization failed:', error.message);
    return http.response(statusCode, cors.headers, {error: error.message});
  }
};

exports.newestPayment = newestPayment;
