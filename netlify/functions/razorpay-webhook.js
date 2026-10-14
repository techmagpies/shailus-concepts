'use strict';

const crypto = require('node:crypto');
const ordersStore = require('../lib/orders-store');
const razorpay = require('../lib/razorpay-client');
const {savePaymentStatus} = require('./verify-payment');

const PAYMENT_EVENTS = new Set(['payment.authorized', 'payment.captured', 'payment.failed']);

function signatureMatches(rawBody, signature, secret){
  if(typeof signature !== 'string' || !/^[a-f\d]{64}$/i.test(signature) ||
     typeof secret !== 'string' || !secret) return false;
  const expected = crypto.createHmac('sha256', secret).update(rawBody).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

function getRawBody(event){
  if(typeof event.body !== 'string' || event.body.length > 20000){
    throw new TypeError('Webhook body is missing or too large.');
  }
  return Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8');
}

function header(event, name){
  const headers = event.headers || {};
  return headers[name.toLowerCase()] || headers[name] || '';
}

exports.handler = async function(event){
  if(String(event.httpMethod || '').toUpperCase() !== 'POST'){
    return {statusCode: 405, headers: {'Cache-Control': 'no-store', Allow: 'POST'}, body: ''};
  }
  try{
    ordersStore.initialize(event);
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if(!webhookSecret){
      return {statusCode: 503, headers: {'Cache-Control': 'no-store'}, body: 'Webhook is not configured.'};
    }
    const rawBody = getRawBody(event);
    if(!signatureMatches(rawBody, header(event, 'x-razorpay-signature'), webhookSecret)){
      return {statusCode: 401, headers: {'Cache-Control': 'no-store'}, body: 'Invalid webhook signature.'};
    }
    let body;
    try{
      body = JSON.parse(rawBody.toString('utf8'));
    } catch(error){
      return {statusCode: 400, headers: {'Cache-Control': 'no-store'}, body: 'Invalid webhook JSON.'};
    }
    if(!body || !PAYMENT_EVENTS.has(body.event)){
      return {statusCode: 200, headers: {'Cache-Control': 'no-store'}, body: 'Event ignored.'};
    }
    const payment = body.payload && body.payload.payment && body.payload.payment.entity;
    if(!payment || typeof payment.id !== 'string' || !/^pay_[A-Za-z0-9]+$/.test(payment.id) ||
       typeof payment.order_id !== 'string' || !/^order_[A-Za-z0-9]+$/.test(payment.order_id)){
      return {statusCode: 400, headers: {'Cache-Control': 'no-store'}, body: 'Payment reference is invalid.'};
    }
    const record = await ordersStore.getByRazorpayOrderId(payment.order_id);
    if(!record) return {statusCode: 200, headers: {'Cache-Control': 'no-store'}, body: 'Untracked order ignored.'};
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if(!keyId || !keySecret){
      return {statusCode: 503, headers: {'Cache-Control': 'no-store'}, body: 'Payment service is not configured.'};
    }
    const order = await razorpay.request('/orders/' + encodeURIComponent(payment.order_id), 'GET', keyId, keySecret);
    const confirmedPayment = await razorpay.request('/payments/' + encodeURIComponent(payment.id), 'GET', keyId, keySecret);
    if(!razorpay.matchesStoredOrder(order, record, payment.order_id) ||
       !razorpay.matchesStoredPayment(confirmedPayment, order, payment.id)){
      return {statusCode: 400, headers: {'Cache-Control': 'no-store'}, body: 'Payment does not match the saved order.'};
    }

    let status;
    if(body.event === 'payment.failed' && confirmedPayment.status === 'failed'){
      status = 'failed';
    } else if(body.event === 'payment.authorized' && confirmedPayment.status === 'authorized'){
      status = 'authorized';
    } else if(body.event === 'payment.captured' && confirmedPayment.status === 'captured' &&
      order.status === 'paid' && order.amount_paid === record.totalPaise && order.amount_due === 0){
      status = 'captured';
    } else {
      return {statusCode: 409, headers: {'Cache-Control': 'no-store'}, body: 'Payment status is not confirmed.'};
    }
    await savePaymentStatus(payment.order_id, status, payment.id, confirmedPayment.method);
    return {statusCode: 200, headers: {'Cache-Control': 'no-store'}, body: 'Payment status synchronized.'};
  } catch(error){
    if(error instanceof TypeError){
      return {statusCode: 400, headers: {'Cache-Control': 'no-store'}, body: 'Webhook payload is invalid.'};
    }
    console.error('Razorpay webhook processing failed:', error.message);
    return {statusCode: 503, headers: {'Cache-Control': 'no-store'}, body: 'Webhook processing is temporarily unavailable.'};
  }
};

exports.signatureMatches = signatureMatches;
