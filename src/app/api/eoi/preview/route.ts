import { NextRequest } from 'next/server';
import { renderEoiEmailHtml } from '@/lib/eoi-email';
import type { EoiEmailData } from '@/lib/eoi-email';

export const dynamic = 'force-dynamic';

/**
 * POST /api/eoi/preview
 *
 * Pure rendering endpoint — accepts emailData, returns the exact same HTML
 * that the send route would produce. No auth, no DB, no side effects.
 */
export async function POST(request: NextRequest) {
  const { emailData } = (await request.json()) as { emailData: EoiEmailData };
  const html = await renderEoiEmailHtml(emailData);
  return new Response(html, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
