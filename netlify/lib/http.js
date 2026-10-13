'use strict';

const LOCAL_ORIGIN = 'http://localhost:8888';

function allowedOrigins(){
  const configured = String(process.env.CHECKOUT_ALLOWED_ORIGINS || '')
    .split(',')
    .map(function(value){ return value.trim(); })
    .filter(Boolean);
  return new Set([LOCAL_ORIGIN].concat(configured));
}

function getCorsHeaders(origin){
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Vary': 'Origin'
  };
  if(!origin) return {allowed: true, headers: headers};

  let parsed;
  try{
    parsed = new URL(origin);
  } catch(error){
    return {allowed: false, headers: headers};
  }
  if(parsed.origin !== origin || !allowedOrigins().has(origin)){
    return {allowed: false, headers: headers};
  }
  headers['Access-Control-Allow-Origin'] = origin;
  headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
  headers['Access-Control-Allow-Headers'] = 'Content-Type';
  headers['Access-Control-Max-Age'] = '600';
  return {allowed: true, headers: headers};
}

function response(statusCode, headers, payload){
  return {
    statusCode: statusCode,
    headers: headers,
    body: payload === null ? '' : JSON.stringify(payload)
  };
}

function parseBody(event){
  if(typeof event.body !== 'string' || event.body.length > 20000){
    throw new TypeError('Request body is missing or too large.');
  }
  let body;
  try{
    body = JSON.parse(event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body);
  } catch(error){
    throw new TypeError('Request body must be valid JSON.');
  }
  if(!body || typeof body !== 'object' || Array.isArray(body)){
    throw new TypeError('Request body must be a JSON object.');
  }
  return body;
}

function handleMethod(event, cors){
  const method = String(event.httpMethod || event.requestContext && event.requestContext.http && event.requestContext.http.method || '').toUpperCase();
  if(method === 'OPTIONS') return response(204, cors.headers, null);
  if(method !== 'POST'){
    return response(405, Object.assign({}, cors.headers, {Allow: 'POST, OPTIONS'}), {error: 'Method not allowed.'});
  }
  return null;
}

module.exports = {
  getCorsHeaders: getCorsHeaders,
  handleMethod: handleMethod,
  parseBody: parseBody,
  response: response
};
