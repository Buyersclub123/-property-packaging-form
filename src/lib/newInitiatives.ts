import { headers } from 'next/headers';

// Who sees the New Initiatives tile and /new-initiatives (JT 28/10). Add emails here.
export const NEW_INITIATIVES_ALLOWED = [
  'john.t@buyersclub.com.au',
  'samara@buyersclub.com.au',
  'ali.h@buyersclub.com.au',
  'luca.d@buyersclub.com.au',
  'julie.l@buyersclub.com.au',
  'john.e@buyersclub.com.au',
];

// Server-side: Cloudflare Access email; in local dev, DEV_USER_EMAIL (same rule as /api/auth/me).
export function currentUserEmail(): string | null {
  const cf = headers().get('Cf-Access-Authenticated-User-Email');
  if (cf) return cf;
  if (process.env.NODE_ENV === 'development' && process.env.DEV_USER_EMAIL) return process.env.DEV_USER_EMAIL;
  return null;
}

export function canSeeNewInitiatives(): boolean {
  const email = currentUserEmail()?.trim().toLowerCase();
  return !!email && NEW_INITIATIVES_ALLOWED.includes(email);
}
