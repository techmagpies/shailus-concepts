'use strict';

const checkoutService = require('./checkout-service');

async function request(path, method, keyId, keySecret, body){
  let response;
  try{
    response = await fetch('https://api.razorpay.com/v1' + path, {
      method: method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000)
    });
  } catch(error){
    throw Object.assign(new Error('Razorpay is temporarily unavailable.'), {statusCode: 502});
  }
  const result = await response.json().catch(function(){ return null; });
  if(!response.ok || !result){
    const error = new Error('Razorpay payment status could not be confirmed.');
    error.statusCode = 502;
    throw error;
  }
  return result;
}

function matchesStoredOrder(order, record, orderId){
  return Boolean(order && record && order.id === orderId &&
    order.amount === record.totalPaise && order.currency === record.currency &&
    order.receipt === record.orderRef && order.notes &&
    order.notes.source === 'shailus-concepts-netlify' &&
    order.notes.order_reference === record.orderRef);
}

function matchesStoredPayment(payment, order, paymentId){
  return Boolean(payment && payment.id === paymentId &&
    payment.order_id === order.id && payment.amount === order.amount &&
    payment.currency === order.currency);
}

module.exports = {
  matchesStoredOrder: matchesStoredOrder,
  matchesStoredPayment: matchesStoredPayment,
  request: request
};
