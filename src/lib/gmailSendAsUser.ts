// Send an HTML email via the Gmail API as a Workspace user (service account +
// domain-wide delegation). Same mechanism as /api/eoi/send, extracted for the
// Exchange Email POC routes. Appends the sender's Gmail signature when available.

import { google } from 'googleapis';

export interface GmailSendArgs {
  sentBy: string;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
}

export type GmailSendResult =
  | { status: 'sent' }
  | { status: 'no_credentials'; error: string }
  | { status: 'failed'; error: string };

function parseCredentials(raw: string) {
  let credentials;
  try {
    credentials = JSON.parse(raw.trim().replace(/^'|'$/g, ''));
  } catch {
    const cleaned = raw.replace(/^'+|'+$/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    credentials = JSON.parse(cleaned);
  }
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }
  return credentials;
}

export async function sendGmailAsUser({ sentBy, to, cc = [], subject, html }: GmailSendArgs): Promise<GmailSendResult> {
  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!credentialsJson) return { status: 'no_credentials', error: 'GOOGLE_SHEETS_CREDENTIALS is not configured' };

  try {
    const credentials = parseCredentials(credentialsJson);
    const auth = new google.auth.JWT({
      email: credentials.client_email,
      key: credentials.private_key,
      scopes: ['https://www.googleapis.com/auth/gmail.send', 'https://www.googleapis.com/auth/gmail.settings.basic'],
      subject: sentBy,
    });
    const gmail = google.gmail({ version: 'v1', auth });

    let body = html;
    try {
      const sendAsRes = await gmail.users.settings.sendAs.get({ userId: 'me', sendAsEmail: sentBy });
      const signature = sendAsRes.data.signature || '';
      if (signature) body = body.replace('</body>', `<div style="margin-top:16px">${signature}</div></body>`);
    } catch (err) {
      console.error('Failed to fetch Gmail signature (non-fatal):', err);
    }

    const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const headers = [
      `From: ${sentBy}`,
      `To: ${to.join(', ')}`,
      ...(cc.length > 0 ? [`Cc: ${cc.join(', ')}`] : []),
      `Subject: ${encodedSubject}`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      '',
      body,
    ];
    const encodedMessage = Buffer.from(headers.join('\r\n'))
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage } });
    return { status: 'sent' };
  } catch (err) {
    const error = err instanceof Error ? err.message : 'Unknown error';
    console.error('Gmail send failed:', error);
    return { status: 'failed', error };
  }
}
