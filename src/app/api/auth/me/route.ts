import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const cfEmail = request.headers.get('Cf-Access-Authenticated-User-Email');

  if (cfEmail) {
    return NextResponse.json({ email: cfEmail, source: 'cloudflare' });
  }

  // Development fallback — no Cloudflare header available
  return NextResponse.json({ email: null, source: 'none' });
}
