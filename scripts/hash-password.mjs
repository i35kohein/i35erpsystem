#!/usr/bin/env node
/**
 * Hash a password with scrypt for AUTH_PASSWORD_HASH / credentials.json.
 * Usage: node scripts/hash-password.mjs <password>
 * Output: scrypt:<saltHex>:<hashHex>  (N=2^15, r=8, p=1 — matches server.ts)
 */
import { scryptSync, randomBytes } from 'node:crypto';
const pass = process.argv[2];
if (!pass) { console.error('Usage: node scripts/hash-password.mjs <password>'); process.exit(1); }
const salt = randomBytes(16);
const hash = scryptSync(pass, salt, 32, { N: 1 << 15, r: 8, p: 1, maxmem: 128 * 1024 * 1024 });
console.log(`scrypt:${salt.toString('hex')}:${hash.toString('hex')}`);
