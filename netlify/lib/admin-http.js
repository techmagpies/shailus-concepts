'use strict';

const http = require('./http');

function response(statusCode, payload, extraHeaders){
  return {
    statusCode: statusCode,
    headers: Object.assign({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer'
    }, extraHeaders || {}),
    body: payload === null ? '' : JSON.stringify(payload)
  };
}

function requestOrigin(event){
  const headers = event.headers || {};
  const origin = headers.origin || headers.Origin;
  if(origin){
    const cors = http.getCorsHeaders(origin);
    return cors.allowed ? origin : null;
  }
  const referer = headers.referer || headers.Referer;
  if(typeof referer !== 'string') return null;
  try{
    const parsed = new URL(referer);
    return parsed.origin === referer.slice(0, referer.length - parsed.pathname.length - parsed.search.length - parsed.hash.length) &&
      http.getCorsHeaders(parsed.origin).allowed ? parsed.origin : null;
  } catch(error){
    return null;
  }
}

function trustedRequest(event){
  return requestOrigin(event) !== null;
}

function method(event){
  return String(event.httpMethod || event.requestContext && event.requestContext.http &&
    event.requestContext.http.method || '').toUpperCase();
}

module.exports = {
  method: method,
  parseBody: http.parseBody,
  requestOrigin: requestOrigin,
  response: response,
  trustedRequest: trustedRequest
};
