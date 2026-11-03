import { isValidCode, normalizeCode } from '../../lib/access.js';

const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' };
const cookieName = 'pet_access';

function cookieCode(request) {
  const item = (request.headers.get('Cookie') || '').split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`));
  try { return item ? decodeURIComponent(item.slice(cookieName.length + 1)) : ''; } catch { return ''; }
}

export async function onRequestGet({ request, env }) {
  if (!env.PET_CODE_SECRET || env.PET_CODE_SECRET.length < 32) return new Response(JSON.stringify({ ok: false, configured: false }), { status: 503, headers });
  const ok = await isValidCode(env.PET_CODE_SECRET, cookieCode(request));
  return new Response(JSON.stringify({ ok, configured: true }), { headers });
}

export async function onRequestPost({ request, env }) {
  if (!env.PET_CODE_SECRET || env.PET_CODE_SECRET.length < 32) return new Response(JSON.stringify({ ok: false, error: '验证服务尚未配置，请联系卖家。' }), { status: 503, headers });
  const origin = request.headers.get('Origin');
  if (origin && origin !== new URL(request.url).origin) return new Response(JSON.stringify({ ok: false, error: '请求来源不正确。' }), { status: 403, headers });
  if (Number(request.headers.get('Content-Length') || 0) > 1024) return new Response(JSON.stringify({ ok: false, error: '验证码格式不正确。' }), { status: 400, headers });
  let code;
  try { code = (await request.json()).code; } catch { return new Response(JSON.stringify({ ok: false, error: '请输入验证码。' }), { status: 400, headers }); }
  const valid = await isValidCode(env.PET_CODE_SECRET, code);
  if (!valid) return new Response(JSON.stringify({ ok: false, error: '验证码不正确，请检查发货消息后重试。' }), { status: 401, headers });
  const normalized = normalizeCode(code);
  return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, 'Set-Cookie': `${cookieName}=${normalized}; Path=/; Max-Age=31536000; HttpOnly; Secure; SameSite=Lax` } });
}

