import {createHmac, timingSafeEqual} from 'node:crypto';
import type {NextRequest} from 'next/server';

export const ADMIN_COOKIE = 'shuvamstu_admin';
const SESSION_SECONDS = 60 * 60 * 12;

function secret() { return process.env.ADMIN_SESSION_SECRET || ''; }
function signature(expires: string) { return createHmac('sha256', secret()).update(`admin:${expires}`).digest('hex'); }

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && secret().length >= 32 && process.env.DATABASE_URL);
}

export function safeEqual(left: string, right: string) {
  const a = Buffer.from(left); const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function createAdminSession() {
  const expires = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return {value: `${expires}.${signature(expires)}`, maxAge: SESSION_SECONDS};
}

export function validAdminSession(value?: string) {
  if (!value || !secret()) return false;
  const [expires, supplied, extra] = value.split('.');
  if (!expires || !supplied || extra || !/^\d+$/.test(expires) || Number(expires) <= Date.now() / 1000) return false;
  return safeEqual(supplied, signature(expires));
}

export function authorizedRequest(request: NextRequest) {
  return validAdminSession(request.cookies.get(ADMIN_COOKIE)?.value);
}

export function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try { return new URL(origin).host === request.nextUrl.host; } catch { return false; }
}
