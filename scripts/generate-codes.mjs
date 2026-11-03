import { readFileSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { codeForOrder } from '../lib/access.js';

const args = process.argv.slice(2);
if (args[0] === '--new-secret') {
  process.stdout.write(`${randomBytes(32).toString('hex')}\n`);
  process.exit(0);
}
const secret = process.env.PET_CODE_SECRET;
if (!secret || secret.length < 32) throw new Error('Set PET_CODE_SECRET to a private random secret of at least 32 characters.');
let ids;
if (args[0] === '--batch' && Number.isSafeInteger(Number(args[1])) && Number(args[1]) > 0 && Number(args[1]) <= 10000) {
  ids = Array.from({ length: Number(args[1]) }, () => `stock-${randomBytes(16).toString('hex')}`);
} else if (args[0] === '--orders' && args[1]) {
  ids = readFileSync(args[1], 'utf8').replace(/^\uFEFF/, '').split(/\r?\n/).map(line => line.trim()).filter(Boolean);
} else {
  throw new Error('Usage: node scripts/generate-codes.mjs --batch 100 OR --orders order-ids.txt [output.csv]');
}
if (new Set(ids).size !== ids.length) throw new Error('Duplicate order identifiers found. Each order must have one unique identifier.');
const rows = ['order_id,code'];
for (const id of ids) rows.push(`${JSON.stringify(id)},${await codeForOrder(secret, id)}`);
const output = args[args.length - 1]?.endsWith('.csv') ? args[args.length - 1] : 'pet-codes.csv';
writeFileSync(output, `\uFEFF${rows.join('\r\n')}\r\n`, { flag: 'wx' });
process.stdout.write(`Created ${ids.length} unique codes in ${output}. Keep this file private.\n`);

