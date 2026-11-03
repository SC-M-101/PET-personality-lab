const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const encoder = new TextEncoder();
let cachedNumericSecret;
let cachedNumericCodes;

function numericCodes(encoded) {
  if (cachedNumericCodes && encoded === cachedNumericSecret) return cachedNumericCodes;
  const codes = new Set();
  const text = typeof encoded === 'string' ? encoded.trim() : '';
  try {
    if (text && text.length <= 5000 && /^[A-Za-z0-9+/]+={0,2}$/.test(text)) {
      const bytes = atob(text);
      if (bytes.length % 3 === 0) {
        for (let i = 0; i < bytes.length; i += 3) {
          const value = (bytes.charCodeAt(i) << 16) | (bytes.charCodeAt(i + 1) << 8) | bytes.charCodeAt(i + 2);
          if (value < 100000 || value > 999999) throw new Error('Invalid numeric code list');
          codes.add(String(value));
        }
      }
    }
  } catch { codes.clear(); }
  cachedNumericSecret = encoded;
  cachedNumericCodes = codes;
  return codes;
}

function encodeFiveBytes(bytes) {
  let value = 0n;
  for (const byte of bytes.slice(0, 5)) value = (value << 8n) | BigInt(byte);
  let output = '';
  for (let i = 0; i < 8; i++) {
    output = ALPHABET[Number(value & 31n)] + output;
    value >>= 5n;
  }
  return output;
}

async function hmac(secret, message) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(message)));
}

export function normalizeCode(raw) {
  const value = String(raw ?? '').toUpperCase().replace(/[\s-]/g, '');
  return /^PET[0-9A-HJKMNP-TV-Z]{16}$/.test(value) || /^[0-9]{6}$/.test(value) ? value : '';
}

export function formatCode(normalized) {
  return `${normalized.slice(0, 3)}-${normalized.slice(3, 7)}-${normalized.slice(7, 11)}-${normalized.slice(11, 15)}-${normalized.slice(15)}`;
}

export async function codeForOrder(secret, orderId) {
  if (!secret || !orderId) throw new Error('Missing secret or order identifier');
  const identity = encodeFiveBytes(await hmac(secret, `pet-order-v1:${String(orderId).trim()}`));
  const signature = encodeFiveBytes(await hmac(secret, `pet-code-v1:${identity}`));
  return formatCode(`PET${identity}${signature}`);
}

export async function isValidCode(secret, raw, numericCodeSecret = '') {
  const code = normalizeCode(raw);
  if (!secret || !code) return false;
  if (/^[0-9]{6}$/.test(code)) return numericCodes(numericCodeSecret).has(code);
  const identity = code.slice(3, 11);
  const expected = encodeFiveBytes(await hmac(secret, `pet-code-v1:${identity}`));
  let mismatch = 0;
  for (let i = 0; i < 8; i++) mismatch |= expected.charCodeAt(i) ^ code.charCodeAt(11 + i);
  return mismatch === 0;
}
