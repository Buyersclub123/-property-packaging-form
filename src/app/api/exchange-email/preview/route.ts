import { NextRequest } from 'next/server';
import { renderExchangeEmailHtml } from '@/lib/exchange-email';
import type { ExchangeEmailData } from '@/lib/exchange-email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/exchange-email/preview
 *
 * Pure rendering endpoint — accepts emailData, returns the exact HTML the
 * send route would deliver. No auth, no DB, no side effects.
 */
export async function POST(request: NextRequest) {
  const { emailData } = (await request.json()) as { emailData: ExchangeEmailData };
  const html = await renderExchangeEmailHtml(emailData);
  return new Response(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}
