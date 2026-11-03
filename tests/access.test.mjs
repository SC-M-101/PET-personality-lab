import assert from 'node:assert/strict';
import test from 'node:test';
import { codeForOrder, isValidCode } from '../lib/access.js';
import { onRequestGet, onRequestPost } from '../functions/api/access.js';

const secret = 'test-secret-for-pet-personality-lab-2026-keep-private';

test('one order keeps one code; separate orders receive separate codes', async () => {
  const first = await codeForOrder(secret, 'order-001');
  assert.equal(first, await codeForOrder(secret, 'order-001'));
  assert.notEqual(first, await codeForOrder(secret, 'order-002'));
  assert.match(first, /^PET-(?:[0-9A-HJKMNP-TV-Z]{4}-){3}[0-9A-HJKMNP-TV-Z]{4}$/);
  assert.equal(await isValidCode(secret, first.toLowerCase()), true);
  assert.equal(await isValidCode(secret, first.replace(/.$/, '0')), false);
  assert.equal(await isValidCode('different-secret-for-test-2026-keep-private', first), false);
});

test('valid code opens a repeatable session without exposing the secret', async () => {
  const code = await codeForOrder(secret, 'order-003');
  const request = new Request('https://example.pages.dev/api/access', { method: 'POST', headers: { Origin: 'https://example.pages.dev', 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  const response = await onRequestPost({ request, env: { PET_CODE_SECRET: secret } });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  const cookie = response.headers.get('Set-Cookie');
  assert.match(cookie, /HttpOnly; Secure; SameSite=Lax/);
  const sessionRequest = new Request('https://example.pages.dev/api/access', { headers: { Cookie: cookie.split(';')[0] } });
  for (let i = 0; i < 2; i++) {
    const session = await onRequestGet({ request: sessionRequest, env: { PET_CODE_SECRET: secret } });
    assert.equal((await session.json()).ok, true);
  }
});

test('only issued 6-digit codes are accepted, including with spaces', async () => {
  const code = '123456';
  const numericSecret = Buffer.from([1, 226, 64]).toString('base64');
  assert.equal(await isValidCode(secret, code), false);
  assert.equal(await isValidCode(secret, '123 456', numericSecret), true);
  assert.equal(await isValidCode(secret, '123-456', numericSecret), true);
  assert.equal(await isValidCode(secret, '123457', numericSecret), false);
  assert.equal(await isValidCode(secret, code, 'invalid-base64!'), false);
  const request = new Request('https://example.pages.dev/api/access', { method: 'POST', headers: { Origin: 'https://example.pages.dev', 'Content-Type': 'application/json' }, body: JSON.stringify({ code }) });
  const response = await onRequestPost({ request, env: { PET_CODE_SECRET: secret, PET_NUMERIC_CODES: numericSecret } });
  assert.equal(response.status, 200);
  const cookie = response.headers.get('Set-Cookie').split(';')[0];
  const session = await onRequestGet({ request: new Request('https://example.pages.dev/api/access', { headers: { Cookie: cookie } }), env: { PET_CODE_SECRET: secret, PET_NUMERIC_CODES: numericSecret } });
  assert.equal((await session.json()).ok, true);
  const unavailableRequest = new Request('https://example.pages.dev/api/access', { method: 'POST', body: JSON.stringify({ code }) });
  const unavailable = await onRequestPost({ request: unavailableRequest, env: { PET_CODE_SECRET: secret } });
  assert.equal(unavailable.status, 503);
});

test('bad code, foreign origin and missing configuration fail closed', async () => {
  const bad = await onRequestPost({ request: new Request('https://example.pages.dev/api/access', { method: 'POST', body: JSON.stringify({ code: '9900' }) }), env: { PET_CODE_SECRET: secret } });
  assert.equal(bad.status, 401);
  const foreign = await onRequestPost({ request: new Request('https://example.pages.dev/api/access', { method: 'POST', headers: { Origin: 'https://other.example' }, body: JSON.stringify({ code: '9900' }) }), env: { PET_CODE_SECRET: secret } });
  assert.equal(foreign.status, 403);
  const missing = await onRequestGet({ request: new Request('https://example.pages.dev/api/access'), env: {} });
  assert.equal(missing.status, 503);
});
