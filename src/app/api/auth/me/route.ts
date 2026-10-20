import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cfEmail = request.headers.get('Cf-Access-Authenticated-User-Email');

  if (cfEmail) {
    return NextResponse.json({ email: cfEmail, source: 'cloudflare' });
  }

  // Local dev only: no Cloudflare in front, so optionally identify via DEV_USER_EMAIL in .env.local
  if (process.env.NODE_ENV === 'development' && process.env.DEV_USER_EMAIL) {
    return NextResponse.json({ email: process.env.DEV_USER_EMAIL, source: 'dev' });
  }

  // Development fallback — no Cloudflare header available
  return NextResponse.json({ email: null, source: 'none' });
}
