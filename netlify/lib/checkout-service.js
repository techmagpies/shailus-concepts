'use strict';

const crypto = require('node:crypto');
const catalog = require('../../giftcard.products.json');

const CURRENCY = 'INR';
const MAX_SAFE_PAISE = Number.MAX_SAFE_INTEGER;

function toPaise(price){
  const numericPrice = typeof price === 'number' ? price : Number(price);
  if(!Number.isFinite(numericPrice) || numericPrice < 0) return null;
  const paise = Math.round((numericPrice + Number.EPSILON) * 100);
  return Number.isSafeInteger(paise) ? paise : null;
}

function getProductMap(products){
  const productMap = new Map();
  products.forEach(function(product){
    if(!product || product.productId === undefined || product.productId === null) return;
    const id = String(product.productId);
    const pricePaise = toPaise(product.price);
    if(pricePaise !== null) productMap.set(id, {id: id, name: String(product.name || ''), pricePaise: pricePaise});
  });
  return productMap;
}

function calculateOrder(items, products){
  const trustedProducts = products || catalog;
  if(!Array.isArray(items) || items.length === 0 || items.length > trustedProducts.length){
    throw new TypeError('The cart must contain valid distinct products.');
  }

  const productMap = getProductMap(trustedProducts);
  const seen = new Set();
  let combinedQuantity = 0;
  const orderItems = items.map(function(item){
    if(!item || typeof item !== 'object') throw new TypeError('Each cart item must be an object.');
    const id = String(item.id == null ? '' : item.id);
    if(!/^\d+$/.test(id) || !productMap.has(id)) throw new TypeError('The cart contains an invalid product.');
    if(seen.has(id)) throw new TypeError('The cart contains a duplicate product.');
    seen.add(id);

    const quantity = item.qty;
    if(!Number.isSafeInteger(quantity) || quantity < 1){
      throw new TypeError('Product quantities must be positive whole numbers.');
    }
    combinedQuantity += quantity;
    if(!Number.isSafeInteger(combinedQuantity)) throw new RangeError('The combined cart quantity is too large.');

    const product = productMap.get(id);
    return {
      id: product.id,
      name: product.name,
      quantity: quantity,
      unitPricePaise: product.pricePaise
    };
  });

  const discountPercentage = combinedQuantity <= 30 ? 20 : (combinedQuantity > 50 ? 30 : 0);
  let subtotalPaise = 0;
  let totalPaise = 0;
  orderItems.forEach(function(item){
    const discountedUnitPricePaise = Math.round(item.unitPricePaise * (100 - discountPercentage) / 100);
    item.discountedUnitPricePaise = discountedUnitPricePaise;
    item.lineTotalPaise = discountedUnitPricePaise * item.quantity;
    subtotalPaise += item.unitPricePaise * item.quantity;
    totalPaise += item.lineTotalPaise;
    if(!Number.isSafeInteger(subtotalPaise) || !Number.isSafeInteger(totalPaise)){
      throw new RangeError('The cart total is too large to process.');
    }
  });

  return {
    currency: CURRENCY,
    combinedQuantity: combinedQuantity,
    discountPercentage: discountPercentage,
    subtotalPaise: subtotalPaise,
    discountPaise: subtotalPaise - totalPaise,
    totalPaise: totalPaise,
    items: orderItems
  };
}

function verifySignature(orderId, paymentId, signature, secret){
  if(typeof orderId !== 'string' || typeof paymentId !== 'string' ||
     typeof signature !== 'string' || !/^[a-f\d]{64}$/i.test(signature) ||
     typeof secret !== 'string' || !secret){
    return false;
  }
  const expected = crypto.createHmac('sha256', secret).update(orderId + '|' + paymentId).digest();
  const received = Buffer.from(signature, 'hex');
  return received.length === expected.length && crypto.timingSafeEqual(received, expected);
}

module.exports = {
  CURRENCY: CURRENCY,
  calculateOrder: calculateOrder,
  verifySignature: verifySignature
};
