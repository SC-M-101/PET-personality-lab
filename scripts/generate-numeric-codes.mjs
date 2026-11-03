import { randomInt } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

function validate(codes) {
  if (codes.length < 1 || codes.length > 1200 || new Set(codes).size !== codes.length || codes.some(code => !/^[1-9][0-9]{5}$/.test(code))) {
    throw new Error('Expected 1-1200 unique six-digit codes without leading zeros.');
  }
}

function pack(codes) {
  validate(codes);
  const bytes = Buffer.alloc(codes.length * 3);
  codes.forEach((code, index) => {
    const value = Number(code);
    bytes[index * 3] = value >>> 16;
    bytes[index * 3 + 1] = value >>> 8;
    bytes[index * 3 + 2] = value;
  });
  return bytes.toString('base64');
}

const [mode, arg, csvPath, secretPath] = process.argv.slice(2);
if (mode === '--create') {
  const count = Number(arg);
  if (!Number.isSafeInteger(count) || count < 1 || count > 1200 || !csvPath?.endsWith('.csv') || !secretPath?.endsWith('.txt')) {
    throw new Error('Usage: node scripts/generate-numeric-codes.mjs --create <1-1200> <private.csv> <private-secret.txt>');
  }
  if (existsSync(csvPath) || existsSync(secretPath)) throw new Error('Output file already exists; choose new paths.');
  const codes = new Set();
  while (codes.size < count) codes.add(String(randomInt(100000, 1000000)));
  const list = [...codes];
  writeFileSync(csvPath, `\uFEFF序号,验证码,订单号\r\n${list.map((code, i) => `${i + 1},${code},`).join('\r\n')}\r\n`, { flag: 'wx' });
  writeFileSync(secretPath, pack(list), { flag: 'wx' });
  process.stdout.write(`Created ${count} private codes and one Cloudflare Secret value.\n`);
} else if (mode === '--pack') {
  if (!arg?.endsWith('.csv') || !csvPath?.endsWith('.txt')) throw new Error('Usage: node scripts/generate-numeric-codes.mjs --pack <existing-private.csv> <private-secret.txt>');
  const codes = readFileSync(arg, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).slice(1).map(row => row.split(',')[1]);
  writeFileSync(csvPath, pack(codes), { flag: 'wx' });
  process.stdout.write(`Packed ${codes.length} private codes into one Cloudflare Secret value.\n`);
} else {
  throw new Error('Use --create or --pack.');
}
