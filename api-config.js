'use strict';

(function(global){
  var renderRoutes = {
    'admin-auth': '/api/admin/auth',
    'admin-orders': '/api/admin/orders',
    'admin-update-order': '/api/admin/orders/status',
    'create-order': '/api/payments/orders',
    'verify-payment': '/api/payments/verify',
    'sync-payment-status': '/api/payments/status',
    'razorpay-webhook': '/api/webhooks/razorpay'
  };

  global.SHAILUS_API_BASE_URL = global.SHAILUS_API_BASE_URL || '';
  global.ShailusApi = {
    url: function(functionName){
      if(!Object.prototype.hasOwnProperty.call(renderRoutes, functionName)){
        throw new Error('Unsupported Shailu’s Concepts API endpoint.');
      }
      var baseUrl = global.SHAILUS_API_BASE_URL;
      if(!baseUrl) return '/.netlify/functions/' + functionName;
      var parsed = new URL(baseUrl);
      var localHttp = parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      if((parsed.protocol !== 'https:' && !localHttp) ||
         parsed.pathname !== '/' || parsed.search || parsed.hash ||
         parsed.username || parsed.password){
        throw new Error('The configured Shailu’s Concepts API URL is invalid.');
      }
      return parsed.origin + renderRoutes[functionName];
    }
  };
})(window);
