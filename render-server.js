'use strict';

const express = require('express');
const ordersStore = require('./netlify/lib/orders-store');
const postgresStore = require('./netlify/lib/render-postgres-store');
const {applySchema} = require('./scripts/migrate-render-db');
const {logError} = require('./scripts/log-safe-error');

const handlers = {
  'admin-auth': require('./netlify/functions/admin-auth'),
  'admin-orders': require('./netlify/functions/admin-orders'),
  'admin-update-order': require('./netlify/functions/admin-update-order'),
  'create-order': require('./netlify/functions/create-order'),
  'verify-payment': require('./netlify/functions/verify-payment'),
  'sync-payment-status': require('./netlify/functions/sync-payment-status'),
  'razorpay-webhook': require('./netlify/functions/razorpay-webhook')
};

const routes = [
  {method: 'all', path: '/api/admin/auth', handler: 'admin-auth'},
  {method: 'get', path: '/api/admin/orders', handler: 'admin-orders'},
  {method: 'post', path: '/api/admin/orders/status', handler: 'admin-update-order'},
  {method: 'post', path: '/api/payments/orders', handler: 'create-order'},
  {method: 'post', path: '/api/payments/verify', handler: 'verify-payment'},
  {method: 'post', path: '/api/payments/status', handler: 'sync-payment-status'},
  {method: 'post', path: '/api/webhooks/razorpay', handler: 'razorpay-webhook'}
];

function allowedOrigins(){
  return new Set(String(process.env.CHECKOUT_ALLOWED_ORIGINS || '')
    .split(',')
    .map(function(origin){ return origin.trim(); })
    .filter(Boolean));
}

function createApp(options){
  const config = options || {};
  const app = express();
  const routeHandlers = config.handlers || handlers;
  const originAllowList = new Set(config.allowedOrigins || allowedOrigins());
  const healthCheck = config.healthCheck || function(){ return Promise.resolve(); };

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.raw({type: 'application/json', limit: '20kb'}));

  app.get('/healthz', async function(request, response){
    try{
      await healthCheck();
      response.set('Cache-Control', 'no-store').status(200).json({status: 'ok'});
    } catch(error){
      console.error('Render health check failed.');
      response.set('Cache-Control', 'no-store').status(503).json({status: 'unavailable'});
    }
  });

  app.use('/api', function(request, response, next){
    const origin = request.get('origin');
    if(origin){
      let parsed;
      try{
        parsed = new URL(origin);
      } catch(error){
        return response.status(403).json({error: 'Request origin is not allowed.'});
      }
      if(parsed.origin !== origin || !originAllowList.has(origin)){
        return response.status(403).json({error: 'Request origin is not allowed.'});
      }
      response.set({
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Max-Age': '600',
        'Vary': 'Origin'
      });
    }
    if(request.method === 'OPTIONS'){
      return origin
        ? response.status(204).end()
        : response.status(403).json({error: 'Request origin is not allowed.'});
    }
    next();
  });

  function invoke(handlerName){
    return async function(request, response){
      const requestHeaders = Object.assign({}, request.headers, {
        'x-nf-client-connection-ip': request.ip
      });
      const search = new URL(request.originalUrl, 'http://localhost').searchParams;
      const queryStringParameters = {};
      search.forEach(function(value, key){ queryStringParameters[key] = value; });
      const body = Buffer.isBuffer(request.body) ? request.body.toString('utf8') : undefined;
      const event = {
        httpMethod: request.method,
        headers: requestHeaders,
        body: body,
        isBase64Encoded: false,
        queryStringParameters: queryStringParameters
      };

      try{
        const result = await routeHandlers[handlerName].handler(event);
        Object.entries(result.headers || {}).forEach(function(entry){
          response.set(entry[0], entry[1]);
        });
        if(request.get('origin')) response.set('Access-Control-Allow-Credentials', 'true');
        response.status(result.statusCode || 500).send(result.body || '');
      } catch(error){
        console.error('Render API handler failed:', handlerName, error && error.name || 'Error');
        response.status(500).json({error: 'The service is temporarily unavailable.'});
      }
    };
  }

  routes.forEach(function(route){
    if(route.method === 'all'){
      app.all(route.path, invoke(route.handler));
    } else {
      app[route.method](route.path, invoke(route.handler));
    }
  });

  app.use('/api', function(request, response){
    response.set('Cache-Control', 'no-store').status(404).json({error: 'API endpoint not found.'});
  });

  app.use(function(error, request, response, next){
    if(error && error.type === 'entity.too.large'){
      return response.status(413).json({error: 'Request body is too large.'});
    }
    console.error('Render request could not be processed:', error && error.name || 'Error');
    response.status(400).json({error: 'Request could not be processed.'});
  });

  return app;
}

async function start(){
  const port = validateStartupConfig(process.env);
  ordersStore.setStoreProvider(function(){ return postgresStore.store; });
  try{
    await applySchema(postgresStore.pool);
  } catch(error){
    throw new Error('PostgreSQL schema initialization failed.', {cause: error});
  }
  try{
    await postgresStore.healthCheck();
  } catch(error){
    throw new Error('PostgreSQL connectivity check failed after schema initialization.', {cause: error});
  }
  const server = createApp({healthCheck: postgresStore.healthCheck}).listen(port, function(){
    console.log('Render API listening on port ' + port + '.');
  });
  const shutdown = function(){
    server.close(function(){
      postgresStore.close().catch(function(){
        console.error('Render PostgreSQL pool did not close cleanly.');
        process.exitCode = 1;
      });
    });
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
  return server;
}

function validateStartupConfig(environment){
  const config = environment || process.env;
  const databaseUrl = config.DATABASE_URL;
  if(typeof databaseUrl !== 'string' || databaseUrl.trim() === ''){
    throw new Error('DATABASE_URL is required for persistent order and admin storage.');
  }
  let parsedDatabaseUrl;
  try{
    parsedDatabaseUrl = new URL(databaseUrl);
  } catch(error){
    throw new Error('DATABASE_URL must be a valid PostgreSQL connection URL.');
  }
  if(!['postgres:', 'postgresql:'].includes(parsedDatabaseUrl.protocol) ||
     !parsedDatabaseUrl.hostname){
    throw new Error('DATABASE_URL must use the PostgreSQL protocol and include a host.');
  }

  const port = Number(config.PORT);
  if(!Number.isInteger(port) || port < 1 || port > 65535){
    throw new Error('PORT must be an integer from 1 through 65535; Render provides this value.');
  }
  return port;
}

if(require.main === module){
  start().catch(function(error){
    logError('Render API startup failed', error);
    process.exitCode = 1;
  });
}

module.exports = {
  createApp: createApp,
  start: start,
  validateStartupConfig: validateStartupConfig,
  routes: routes
};
