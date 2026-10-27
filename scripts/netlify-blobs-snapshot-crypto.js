'use strict';

const crypto = require('node:crypto');
const {promisify} = require('node:util');

const scrypt = promisify(crypto.scrypt);
const SNAPSHOT_AAD = Buffer.from('shailus-concepts-netlify-blobs-snapshot-v1');

async function deriveKey(passphrase, salt){
  if(typeof passphrase !== 'string' || passphrase.length < 16){
    throw new TypeError('Migration passphrase must be at least 16 characters.');
  }
  return scrypt(passphrase, salt, 32);
}

async function encryptSnapshot(snapshot, passphrase){
  const salt = crypto.randomBytes(16);
  const iv = crypto.randomBytes(12);
  const key = await deriveKey(passphrase, salt);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(SNAPSHOT_AAD);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(snapshot), 'utf8'),
    cipher.final()
  ]);
  return {
    formatVersion: 1,
    cipher: 'aes-256-gcm',
    kdf: 'scrypt',
    salt: salt.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
    ciphertext: ciphertext.toString('base64')
  };
}

function decodeBase64(value){
  if(typeof value !== 'string' || value.length === 0 || value.length % 4 !== 0 ||
     !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)){
    throw new TypeError('The encrypted snapshot contains invalid base64 data.');
  }
  const decoded = Buffer.from(value, 'base64');
  if(decoded.length === 0 || decoded.toString('base64') !== value){
    throw new TypeError('The encrypted snapshot contains invalid base64 data.');
  }
  return decoded;
}

async function decryptSnapshot(envelope, passphrase){
  if(!envelope || envelope.formatVersion !== 1 || envelope.cipher !== 'aes-256-gcm' ||
     envelope.kdf !== 'scrypt' || typeof envelope.salt !== 'string' ||
     typeof envelope.iv !== 'string' || typeof envelope.tag !== 'string' ||
     typeof envelope.ciphertext !== 'string'){
    throw new TypeError('The encrypted Netlify snapshot has an unsupported format.');
  }
  try{
    const salt = decodeBase64(envelope.salt);
    const iv = decodeBase64(envelope.iv);
    const tag = decodeBase64(envelope.tag);
    const ciphertext = decodeBase64(envelope.ciphertext);
    if(salt.length !== 16 || iv.length !== 12 || tag.length !== 16){
      throw new TypeError('The encrypted snapshot header is invalid.');
    }
    const key = await deriveKey(passphrase, salt);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAAD(SNAPSHOT_AAD);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return JSON.parse(plaintext.toString('utf8'));
  } catch(error){
    throw new Error('Snapshot decryption failed; check the passphrase and file integrity.');
  }
}

module.exports = {
  decryptSnapshot: decryptSnapshot,
  encryptSnapshot: encryptSnapshot
};
