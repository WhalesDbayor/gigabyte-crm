const crypto = require('crypto');

const { generateKeyPairSync } = crypto;
const { privateKey } = generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

let pem = privateKey;
console.log("Original PEM:\n", pem.substring(0, 100) + "...\n");

// Test 1: Strip internal newlines from the base64 part, but keep headers on separate lines
let oneLinePem = pem.replace(/\n/g, '');
oneLinePem = oneLinePem.replace('-----BEGIN PRIVATE KEY-----', '-----BEGIN PRIVATE KEY-----\n');
oneLinePem = oneLinePem.replace('-----END PRIVATE KEY-----', '\n-----END PRIVATE KEY-----');

console.log("One Line PEM:\n", oneLinePem.substring(0, 100) + "...\n");

try {
  const sign = crypto.createSign('SHA256');
  sign.update('test data');
  sign.sign(oneLinePem);
  console.log('SUCCESS: One-line PEM works!');
} catch (e) {
  console.error('ERROR: One-line PEM failed:', e.message);
}
