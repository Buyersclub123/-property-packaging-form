import { google } from 'googleapis';

// Read-only scopes only. The mailbox-reader service account must have these
// granted under domain-wide delegation (Admin console > Security > API controls).
export const GMAIL_READONLY = 'https://www.googleapis.com/auth/gmail.readonly';
export const DRIVE_READONLY = 'https://www.googleapis.com/auth/drive.readonly';
export const SHEETS_READONLY = 'https://www.googleapis.com/auth/spreadsheets.readonly';

interface ReaderKey {
  client_email: string;
  private_key: string;
}

function readerKey(): ReaderKey {
  const raw = process.env.GMAIL_READER_CREDENTIALS;
  if (!raw) {
    throw new Error(
      'GMAIL_READER_CREDENTIALS is not set in .env.local. It must hold the mailbox-reader service account key (JSON).'
    );
  }
  let parsed: Partial<ReaderKey>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('GMAIL_READER_CREDENTIALS is not valid JSON.');
  }
  if (!parsed.client_email || !parsed.private_key) {
    throw new Error('GMAIL_READER_CREDENTIALS is missing client_email or private_key.');
  }
  return { client_email: parsed.client_email, private_key: parsed.private_key.replace(/\\n/g, '\n') };
}

function jwtFor(subject: string, scope: string) {
  const key = readerKey();
  return new google.auth.JWT({ email: key.client_email, key: key.private_key, scopes: [scope], subject });
}

export function gmailFor(mailbox: string) {
  return google.gmail({ version: 'v1', auth: jwtFor(mailbox, GMAIL_READONLY) });
}

export function driveFor(subject: string) {
  return google.drive({ version: 'v3', auth: jwtFor(subject, DRIVE_READONLY) });
}

export function sheetsFor(subject: string) {
  return google.sheets({ version: 'v4', auth: jwtFor(subject, SHEETS_READONLY) });
}

export function googleErrorMessage(e: unknown, what: string): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (/unauthorized_client/i.test(msg)) {
    return `${what}: delegation refused (unauthorized_client). The scope is not granted to the mailbox-reader service account in the Admin console.`;
  }
  if (/invalid_grant/i.test(msg)) {
    return `${what}: invalid_grant. The user/mailbox does not exist or the key is wrong.`;
  }
  return `${what}: ${msg}`;
}
