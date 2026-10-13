'use strict';

const checkoutService = require('../lib/checkout-service');
const http = require('../lib/http');
const ordersStore = require('../lib/orders-store');
const razorpay = require('../lib/razorpay-client');

function paymentResponseIsValid(order, payment, record, orderId, paymentId){
  return razorpay.matchesStoredOrder(order, record, orderId) &&
    razorpay.matchesStoredPayment(payment, order, paymentId);
}

async function savePaymentStatus(orderId, status, paymentId){
  return ordersStore.updateOrder(orderId, function(order){
    if(order.paymentStatus === 'captured' && status !== 'captured') return null;
    if(order.paymentStatus === 'captured' && order.razorpayPaymentId !== paymentId){
      throw new Error('A different payment is already confirmed for this order.');
    }
    if(order.paymentStatus === status && order.razorpayPaymentId === (paymentId || null)) return null;
    const now = new Date().toISOString();
    const history = Array.isArray(order.paymentHistory) ? order.paymentHistory.slice(-29) : [];
    history.push({at: now, status: status, paymentId: paymentId || null});
    return Object.assign({}, order, {
      updatedAt: now,
      paymentStatus: status,
      razorpayPaymentId: paymentId || null,
      paymentHistory: history
    });
  });
}

exports.handler = async function(event){
  const origin = event.headers && (event.headers.origin || event.headers.Origin);
  const cors = http.getCorsHeaders(origin);
  if(!cors.allowed) return http.response(403, cors.headers, {error: 'Origin is not allowed.'});
  const methodResponse = http.handleMethod(event, cors);
  if(methodResponse) return methodResponse;

  try{
    const body = http.parseBody(event);
    const orderId = body.razorpay_order_id;
    const paymentId = body.razorpay_payment_id;
    const signature = body.razorpay_signature;
    if(typeof orderId !== 'string' || !/^order_[A-Za-z0-9]+$/.test(orderId) ||
       typeof paymentId !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(paymentId)){
      throw Object.assign(new TypeError('Payment identifiers are invalid.'), {statusCode: 400});
    }

    const record = await ordersStore.getByRazorpayOrderId(orderId);
    if(!record) throw Object.assign(new TypeError('The saved payment order could not be found.'), {statusCode: 404});
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if(!keyId || !keySecret) throw Object.assign(new Error('Payment service is not configured.'), {statusCode: 503});
    if(!checkoutService.verifySignature(orderId, paymentId, signature, keySecret)){
      throw Object.assign(new TypeError('Payment signature is invalid.'), {statusCode: 400});
    }
    if(record.paymentStatus === 'captured' && record.razorpayPaymentId !== paymentId){
      throw Object.assign(new Error('A different payment is already confirmed for this order.'), {statusCode: 409});
    }

    let order = await razorpay.request('/orders/' + encodeURIComponent(orderId), 'GET', keyId, keySecret);
    let payment = await razorpay.request('/payments/' + encodeURIComponent(paymentId), 'GET', keyId, keySecret);
    if(!paymentResponseIsValid(order, payment, record, orderId, paymentId)){
      throw Object.assign(new TypeError('Payment does not match the saved order amount and currency.'), {statusCode: 400});
    }

    if(payment.status === 'authorized'){
      if(record.paymentStatus === 'captured'){
        throw Object.assign(new Error('The confirmed payment status could not be reconciled.'), {statusCode: 409});
      }
      await savePaymentStatus(orderId, 'authorized', paymentId);
      try{
        await razorpay.request('/payments/' + encodeURIComponent(paymentId) + '/capture', 'POST',
          keyId, keySecret, {amount: record.totalPaise, currency: record.currency});
      } catch(error){
        const latestPayment = await razorpay.request('/payments/' + encodeURIComponent(paymentId),
          'GET', keyId, keySecret);
        if(latestPayment.status !== 'captured') throw error;
      }
      order = await razorpay.request('/orders/' + encodeURIComponent(orderId), 'GET', keyId, keySecret);
      payment = await razorpay.request('/payments/' + encodeURIComponent(paymentId), 'GET', keyId, keySecret);
      if(!paymentResponseIsValid(order, payment, record, orderId, paymentId)){
        throw Object.assign(new TypeError('Captured payment does not match the saved order.'), {statusCode: 400});
      }
    }

    if(payment.status === 'failed'){
      await savePaymentStatus(orderId, 'failed', paymentId);
      return http.response(409, cors.headers, {
        verified: false,
        status: 'failed',
        error: 'Payment failed. Please try again or choose another payment method.'
      });
    }

    if(payment.status !== 'captured' || order.status !== 'paid' ||
       order.amount_paid !== record.totalPaise || order.amount_due !== 0){
      await savePaymentStatus(orderId, payment.status === 'authorized' ? 'authorized' : 'pending', paymentId);
      return http.response(409, cors.headers, {
        verified: false,
        status: payment.status || order.status || 'pending',
        error: 'Payment is pending confirmation. Do not retry until the payment status is checked.'
      });
    }

    const saved = await savePaymentStatus(orderId, 'captured', paymentId);
    const persisted = saved || await ordersStore.getByRazorpayOrderId(orderId);
    if(!persisted || persisted.paymentStatus !== 'captured' ||
       persisted.razorpayPaymentId !== paymentId){
      throw Object.assign(new Error('Verified payment status could not be saved.'), {statusCode: 503});
    }
    return http.response(200, cors.headers, {
      verified: true,
      orderId: order.id,
      orderRef: record.orderRef,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status: 'captured'
    });
  } catch(error){
    const statusCode = error.statusCode || (error instanceof TypeError ? 400 : 502);
    if(statusCode >= 500) console.error('Razorpay payment verification failed:', error.message);
    return http.response(statusCode, cors.headers, {verified: false, error: error.message});
  }
};

exports.paymentResponseIsValid = paymentResponseIsValid;
exports.savePaymentStatus = savePaymentStatus;
