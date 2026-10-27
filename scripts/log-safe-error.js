'use strict';

const SECRET_ENV_KEYS = [
  'ADMIN_SESSION_SECRET',
  'ADMIN_USERS_JSON',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET',
  'NETLIFY_AUTH_TOKEN',
  'MIGRATION_PASSPHRASE'
];

function redactSecrets(value, environment){
  let output = String(value);
  SECRET_ENV_KEYS.forEach(function(key){
    const secret = environment[key];
    if(typeof secret === 'string' && secret.length > 0){
      output = output.split(secret).join('[REDACTED]');
    }
  });
  return output
    .replace(/\b((?:postgres(?:ql)?|mysql):\/\/)[^:@/\s]+(?::[^@/\s]*)?@/gi, '$1[REDACTED]@')
    .replace(/(^|[?&;\s])(password=)[^&;\s]+/gi, '$1$2[REDACTED]');
}

function formatError(error, environment, seen){
  const visited = seen || new Set();
  if(error && typeof error === 'object' && visited.has(error)){
    return '[Circular error cause]';
  }
  if(error && typeof error === 'object') visited.add(error);

  const stack = error && typeof error.stack === 'string'
    ? error.stack
    : error && typeof error.message === 'string'
      ? error.message
      : String(error);
  const output = redactSecrets(stack, environment || process.env);
  if(error && error.cause){
    return output + '\nCaused by: ' + formatError(error.cause, environment, visited);
  }
  return output;
}

function logError(context, error, environment){
  console.error(context + ':\n' + formatError(error, environment));
}

module.exports = {
  formatError: formatError,
  logError: logError
};
