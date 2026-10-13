import { NextRequest, NextResponse } from 'next/server';
import { renderExchangeEmailHtml, renderExchangeSubject } from '@/lib/exchange-email';
import type { ExchangeEmailData } from '@/lib/exchange-email';
import { sendGmailAsUser } from '@/lib/gmailSendAsUser';

export const dynamic = 'force-dynamic';

/**
 * POST /api/exchange-email/send  (POC)
 *
 * Sends the Exchange email via the Gmail API as `sentBy`. No DB logging,
 * no GHL write-back.
 *
 * Body: { sentBy, to: string[], emailData }
 */
export async function POST(request: NextRequest) {
  const { sentBy, to, emailData } = (await request.json()) as {
    sentBy: string;
    to: string[];
    emailData: ExchangeEmailData;
  };

  const recipients = (to || []).map((e) => e.trim()).filter((e) => e.includes('@'));
  if (!sentBy || recipients.length === 0 || !emailData) {
    return NextResponse.json({ error: 'sentBy, at least one recipient and emailData are required' }, { status: 400 });
  }

  const subject = renderExchangeSubject(emailData);
  const html = await renderExchangeEmailHtml(emailData);
  const result = await sendGmailAsUser({ sentBy, to: recipients, subject, html });

  if (result.status === 'sent') return NextResponse.json({ status: 'sent', subject, to: recipients });
  return NextResponse.json(result, { status: 500 });
}
