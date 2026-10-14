'use strict';

const crypto = require('node:crypto');
const checkoutService = require('../lib/checkout-service');
const http = require('../lib/http');
const ordersStore = require('../lib/orders-store');

function requiredText(value, label, maxLength){
  if(typeof value !== 'string') throw new TypeError(label + ' is required.');
  const normalized = value.trim();
  if(!normalized || normalized.length > maxLength) throw new TypeError(label + ' is invalid.');
  return normalized;
}

function normalizeCustomer(customer){
  if(!customer || typeof customer !== 'object' || Array.isArray(customer)){
    throw new TypeError('Customer and delivery details are required.');
  }
  const name = requiredText(customer.name, 'Customer name', 120);
  const contact = requiredText(customer.contact, 'Customer contact', 254);
  const phone = requiredText(customer.phone, 'Phone number', 32);
  const address = requiredText(customer.address, 'Delivery address', 256);
  const city = requiredText(customer.city, 'City', 100);
  const postalCode = requiredText(customer.postalCode, 'Postal code', 16);
  const state = requiredText(customer.state, 'State', 100);
  const country = requiredText(customer.country, 'Country', 100);
  if(!/^[6-9]\d{9}$/.test(phone.replace(/[\s()+-]/g, '').replace(/^91(?=\d{10}$)/, ''))){
    throw new TypeError('Phone number must be a valid Indian mobile number.');
  }
  if(!/^[1-9]\d{5}$/.test(postalCode)) throw new TypeError('Postal code must be a valid Indian PIN code.');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) &&
     !/^[6-9]\d{9}$/.test(contact.replace(/[\s()+-]/g, '').replace(/^91(?=\d{10}$)/, ''))){
    throw new TypeError('Customer contact must be a valid email or Indian mobile number.');
  }
  return {name: name, contact: contact, phone: phone, address: address, city: city,
    postalCode: postalCode, state: state, country: country};
}

function createOrderReference(){
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return 'SC-' + date + '-' + crypto.randomBytes(12).toString('hex').toUpperCase();
}

async function createRazorpayOrder(order, orderRef, keyId, keySecret){
  let response;
  try{
    response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(keyId + ':' + keySecret).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount: order.totalPaise,
        currency: order.currency,
        receipt: orderRef,
        notes: {
          source: 'shailus-concepts-netlify',
          order_reference: orderRef,
          combined_quantity: String(order.combinedQuantity),
          discount_percentage: String(order.discountPercentage)
        }
      }),
      signal: AbortSignal.timeout(15000)
    });
  } catch(error){
    throw Object.assign(new Error('Razorpay is temporarily unavailable.'), {statusCode: 502});
  }
  const result = await response.json().catch(function(){ return null; });
  if(!response.ok || !result || typeof result.id !== 'string' ||
     result.amount !== order.totalPaise || result.currency !== order.currency ||
     result.status !== 'created' || result.receipt !== orderRef){
    const error = new Error('Razorpay could not create the payment order.');
    error.statusCode = 502;
    throw error;
  }
  return result;
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
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if(!keyId || !keySecret) throw Object.assign(new Error('Payment service is not configured.'), {statusCode: 503});

    const order = checkoutService.calculateOrder(body.items);
    const customer = normalizeCustomer(body.customer);
    const orderRef = createOrderReference();
    const razorpayOrder = await createRazorpayOrder(order, orderRef, keyId, keySecret);
    const createdAt = new Date().toISOString();
    const storedOrder = {
      orderRef: orderRef,
      createdAt: createdAt,
      updatedAt: createdAt,
      customer: customer,
      items: order.items.map(function(item){
        const lineDiscountPaise = (item.unitPricePaise - item.discountedUnitPricePaise) * item.quantity;
        return {
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          unitPricePaise: item.unitPricePaise,
          discountPercentage: order.discountPercentage,
          discountPaise: lineDiscountPaise,
          discountedUnitPricePaise: item.discountedUnitPricePaise,
          lineTotalPaise: item.lineTotalPaise
        };
      }),
      combinedQuantity: order.combinedQuantity,
      subtotalPaise: order.subtotalPaise,
      discountPercentage: order.discountPercentage,
      discountPaise: order.discountPaise,
      totalPaise: order.totalPaise,
      currency: order.currency,
      razorpayOrderId: razorpayOrder.id,
      razorpayPaymentId: null,
      paymentStatus: 'pending',
      orderStatus: 'new',
      statusHistory: [{at: createdAt, status: 'new', updatedBy: 'system'}]
    };
    try{
      await ordersStore.createOrder(storedOrder);
    } catch(error){
      const storageError = new Error('The order could not be saved securely. Please try again.');
      storageError.statusCode = 503;
      throw storageError;
    }
    return http.response(200, cors.headers, {
      keyId: keyId,
      orderId: razorpayOrder.id,
      orderRef: orderRef,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      quote: {
        combinedQuantity: order.combinedQuantity,
        discountPercentage: order.discountPercentage,
        subtotalPaise: order.subtotalPaise,
        discountPaise: order.discountPaise,
        totalPaise: order.totalPaise,
        items: order.items
      }
    });
  } catch(error){
    const statusCode = error.statusCode || (error instanceof TypeError || error instanceof RangeError ? 400 : 500);
    if(statusCode >= 500) console.error('Razorpay order creation failed:', error.message);
    return http.response(statusCode, cors.headers, {error: error.message});
  }
};

exports.normalizeCustomer = normalizeCustomer;
exports.createOrderReference = createOrderReference;
