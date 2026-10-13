'use strict';

const auth = require('../lib/admin-auth');
const adminHttp = require('../lib/admin-http');

exports.handler = async function(event){
  if(!adminHttp.trustedRequest(event)){
    return adminHttp.response(403, {error: 'Request origin is not allowed.'});
  }
  const method = adminHttp.method(event);
  let logoutRequested = false;
  try{
    if(method === 'GET'){
      const user = await auth.authenticate(event);
      return user
        ? adminHttp.response(200, {authenticated: true, user: {email: user.email, role: user.role}})
        : adminHttp.response(401, {authenticated: false});
    }
    if(method !== 'POST') return adminHttp.response(405, {error: 'Method not allowed.'}, {Allow: 'GET, POST'});
    const body = adminHttp.parseBody(event);
    if(body.action === 'login'){
      if(typeof body.email !== 'string' || typeof body.password !== 'string'){
        return adminHttp.response(400, {error: 'Email and password are required.'});
      }
      const result = await auth.login(body.email, body.password, event);
      if(!result.ok) return adminHttp.response(result.statusCode, {error: result.error});
      return adminHttp.response(200, {
        authenticated: true,
        user: result.user
      }, {'Set-Cookie': result.cookie});
    }
    if(body.action === 'logout'){
      logoutRequested = true;
      const cookie = await auth.logout(event);
      return adminHttp.response(200, {authenticated: false}, {'Set-Cookie': cookie});
    }
    return adminHttp.response(400, {error: 'Unsupported authentication action.'});
  } catch(error){
    if(error instanceof TypeError){
      return adminHttp.response(400, {error: error.message});
    }
    console.error('Admin authentication request failed.');
    return adminHttp.response(503, {error: 'Admin authentication is temporarily unavailable.'},
      logoutRequested ? {'Set-Cookie': auth.clearCookie()} : undefined);
  }
};
