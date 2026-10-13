'use strict';

const crypto = require('node:crypto');
const {promisify} = require('node:util');
const readline = require('node:readline');

const scrypt = promisify(crypto.scrypt);

function question(prompt){
  const terminal = readline.createInterface({input: process.stdin, output: process.stdout});
  return new Promise(function(resolve){
    terminal.question(prompt, function(answer){
      terminal.close();
      resolve(answer.trim());
    });
  });
}

function hiddenPassword(prompt){
  if(!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function'){
    return Promise.reject(new Error('Run this command in an interactive terminal so the password is not echoed.'));
  }
  return new Promise(function(resolve, reject){
    let password = '';
    process.stdout.write(prompt);
    process.stdin.setRawMode(true);
    process.stdin.resume();
    function finish(error){
      process.stdin.removeListener('data', onData);
      process.stdin.setRawMode(false);
      process.stdout.write('\n');
      if(error) reject(error);
      else resolve(password);
    }
    function onData(buffer){
      for(const character of buffer.toString('utf8')){
        if(character === '\u0003'){
          finish(new Error('Password generation cancelled.'));
          return;
        }
        if(character === '\r' || character === '\n'){
          finish();
          return;
        }
        if(character === '\u007f' || character === '\b'){
          password = password.slice(0, -1);
          continue;
        }
        if(character >= ' ' && password.length < 256) password += character;
      }
    }
    process.stdin.on('data', onData);
  });
}

async function main(){
  const email = (await question('Authorized email: ')).toLowerCase();
  const role = await question('Role (owner or staff): ');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !['owner', 'staff'].includes(role)){
    throw new Error('Enter a valid email address and role.');
  }
  const password = await hiddenPassword('New password (hidden): ');
  const confirmation = await hiddenPassword('Confirm password (hidden): ');
  if(password.length < 12 || password !== confirmation){
    throw new Error('Passwords must match and contain at least 12 characters.');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = (await scrypt(password, Buffer.from(salt, 'hex'), 64)).toString('hex');
  console.log(JSON.stringify({email: email, role: role, salt: salt, passwordHash: passwordHash}));
}

main().catch(function(error){
  console.error(error.message);
  process.exitCode = 1;
});
