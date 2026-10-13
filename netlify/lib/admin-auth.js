'use strict';

const crypto = require('node:crypto');
const {promisify} = require('node:util');
const ordersStore = require('./orders-store');

const scrypt = promisify(crypto.scrypt);
const COOKIE_NAME = 'sc_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 8;
const DUMMY_SALT = 'b44ebd7d7e5644e0a11b';
const DUMMY_HASH = '9f0b68f6a855101c7e2e83ad4ef24ce3955292c7b6a1d61bceb50d0a377067e7' +
  '87541b330c2d240554281622d0c0b1e737c947d984514dcfc0100c7a8bd6d4e5';

function sessionSecret(){
  const secret = process.env.ADMIN_SESSION_SECRET;
  if(typeof secret !== 'string' || Buffer.byteLength(secret) < 32){
    throw new Error('Admin session service is not configured.');
  }
  return secret;
}

function getUsers(){
  let users;
  try{
    users = JSON.parse(process.env.ADMIN_USERS_JSON || '');
  } catch(error){
    throw new Error('Admin user access list is not valid JSON.');
  }
  if(!Array.isArray(users) || !users.length || users.length > 100){
    throw new Error('Admin user access list is not configured.');
  }
  const seen = new Set();
  const normalized = users.map(function(user){
    if(!user || typeof user.email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) ||
       !['owner', 'staff'].includes(user.role) ||
       typeof user.salt !== 'string' || !/^[a-f\d]{32}$/i.test(user.salt) ||
       typeof user.passwordHash !== 'string' || !/^[a-f\d]{128}$/i.test(user.passwordHash)){
      throw new Error('Admin user access list contains an invalid entry.');
    }
    const email = user.email.trim().toLowerCase();
    if(seen.has(email)) throw new Error('Admin user access list contains duplicate email addresses.');
    seen.add(email);
    return {email: email, role: user.role, salt: user.salt, passwordHash: user.passwordHash.toLowerCase()};
  });
  if(!normalized.some(function(user){ return user.role === 'owner'; })){
    throw new Error('Admin user access list must include an owner.');
  }
  return normalized;
}

function constantTimeHexEqual(expectedHex, providedHex){
  const expected = Buffer.from(expectedHex, 'hex');
  const provided = Buffer.from(providedHex, 'hex');
  return expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
}

function cookieOptions(){
  const secure = process.env.CONTEXT !== 'dev';
  return 'Path=/; HttpOnly; SameSite=Strict; Max-Age=' + SESSION_SECONDS + (secure ? '; Secure' : '');
}

function clearCookie(){
  return COOKIE_NAME + '=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0' +
    (process.env.CONTEXT !== 'dev' ? '; Secure' : '');
}

function parseCookies(event){
  const headers = event.headers || {};
  const cookieHeader = headers.cookie || headers.Cookie || '';
  const cookie = cookieHeader.split(';').map(function(part){ return part.trim(); })
    .find(function(part){ return part.startsWith(COOKIE_NAME + '='); });
  if(!cookie) return '';
  try{
    return decodeURIComponent(cookie.slice(COOKIE_NAME.length + 1));
  } catch(error){
    return '';
  }
}

function sign(payload, secret){
  const encoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(encoded).digest('base64url');
  return encoded + '.' + signature;
}

function verifyToken(token, secret){
  if(typeof token !== 'string' || token.length > 2048) return null;
  const parts = token.split('.');
  if(parts.length !== 2) return null;
  const expected = crypto.createHmac('sha256', secret).update(parts[0]).digest();
  let supplied;
  try{
    supplied = Buffer.from(parts[1], 'base64url');
  } catch(error){
    return null;
  }
  if(supplied.length !== expected.length || !crypto.timingSafeEqual(expected, supplied)) return null;
  try{
    const payload = JSON.parse(Buffer.from(parts[0], 'base64url').toString('utf8'));
    if(!payload || typeof payload.sub !== 'string' || !['owner', 'staff'].includes(payload.role) ||
       typeof payload.sid !== 'string' || !Number.isSafeInteger(payload.exp) ||
       typeof payload.credentialVersion !== 'string') return null;
    return payload;
  } catch(error){
    return null;
  }
}

function rateLimitKey(email, ip, secret){
  const value = crypto.createHmac('sha256', secret).update(email + '|' + ip).digest('hex');
  return 'login-limit:' + value;
}

async function checkLoginRateLimit(email, ip, secret, now){
  const key = rateLimitKey(email, ip, secret);
  const entry = await ordersStore.updateAuxiliary(key, function(current){
    if(current && current.blockedUntil > now) return current;
    const windowStartedAt = current && now - current.windowStartedAt < LOGIN_WINDOW_MS
      ? current.windowStartedAt : now;
    const attempts = current && windowStartedAt === current.windowStartedAt ? current.attempts + 1 : 1;
    return {
      attempts: attempts,
      windowStartedAt: windowStartedAt,
      blockedUntil: attempts > MAX_LOGIN_ATTEMPTS ? windowStartedAt + LOGIN_WINDOW_MS : 0
    };
  });
  return entry && entry.blockedUntil > now;
}

async function resetLoginRateLimit(email, ip, secret){
  const key = rateLimitKey(email, ip, secret);
  await ordersStore.updateAuxiliary(key, function(current){
    return current ? {attempts: 0, windowStartedAt: Date.now(), blockedUntil: 0} : null;
  });
}

function requestIp(event){
  const headers = event.headers || {};
  const forwarded = headers['x-nf-client-connection-ip'] || headers['X-Nf-Client-Connection-Ip'];
  return typeof forwarded === 'string' ? forwarded.slice(0, 64) : 'unknown';
}

async function login(emailInput, password, event){
  const secret = sessionSecret();
  const users = getUsers();
  const email = typeof emailInput === 'string' ? emailInput.trim().toLowerCase() : '';
  const ip = requestIp(event);
  if(await checkLoginRateLimit(email.slice(0, 254), ip, secret, Date.now())){
    return {ok: false, statusCode: 429, error: 'Too many sign-in attempts. Try again later.'};
  }
  const user = users.find(function(entry){ return entry.email === email; });
  const salt = user ? user.salt : DUMMY_SALT;
  const expectedHash = user ? user.passwordHash : DUMMY_HASH;
  const candidate = typeof password === 'string' && password.length <= 256
    ? password : 'invalid-password';
  const derived = await scrypt(candidate, Buffer.from(salt, 'hex'), 64);
  const matches = constantTimeHexEqual(expectedHash, derived.toString('hex'));
  if(!user || !matches){
    return {ok: false, statusCode: 401, error: 'Email or password is incorrect.'};
  }
  await resetLoginRateLimit(email, ip, secret);
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: user.email,
    role: user.role,
    sid: crypto.randomBytes(18).toString('base64url'),
    exp: now + SESSION_SECONDS,
    credentialVersion: crypto.createHash('sha256').update(user.passwordHash).digest('hex')
  };
  return {
    ok: true,
    user: {email: user.email, role: user.role},
    cookie: COOKIE_NAME + '=' + encodeURIComponent(sign(payload, secret)) + '; ' + cookieOptions()
  };
}

async function authenticate(event){
  const secret = sessionSecret();
  const payload = verifyToken(parseCookies(event), secret);
  if(!payload || payload.exp <= Math.floor(Date.now() / 1000)) return null;
  const user = getUsers().find(function(entry){ return entry.email === payload.sub; });
  if(!user || user.role !== payload.role ||
     crypto.createHash('sha256').update(user.passwordHash).digest('hex') !== payload.credentialVersion){
    return null;
  }
  if(await ordersStore.isSessionRevoked(payload.sid, Math.floor(Date.now() / 1000))) return null;
  return {email: user.email, role: user.role, sessionId: payload.sid, expiresAt: payload.exp};
}

async function logout(event){
  const secret = sessionSecret();
  const payload = verifyToken(parseCookies(event), secret);
  if(payload && payload.exp > Math.floor(Date.now() / 1000)){
    await ordersStore.revokeSession(payload.sid, payload.exp);
  }
  return clearCookie();
}

async function makePasswordHash(password, salt){
  const actualSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = await scrypt(password, Buffer.from(actualSalt, 'hex'), 64);
  return {salt: actualSalt, passwordHash: derived.toString('hex')};
}

module.exports = {
  authenticate: authenticate,
  clearCookie: clearCookie,
  getUsers: getUsers,
  login: login,
  logout: logout,
  makePasswordHash: makePasswordHash,
  verifyToken: verifyToken
};
