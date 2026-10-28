import { google } from 'googleapis';

// Read-only Google Workspace user list for the Tile access email picker.
// Uses the mailbox-reader service account (GMAIL_READER_CREDENTIALS), which needs
// admin.directory.user.readonly granted under domain-wide delegation.
export const DIRECTORY_USER_READONLY = 'https://www.googleapis.com/auth/admin.directory.user.readonly';
// Super-admin the service account impersonates for the directory read (JT 28/10).
export const DIRECTORY_SUBJECT = 'john.t@buyersclub.com.au';

export interface DirectoryUser {
  email: string;
  name: string;
  suspended: boolean;
}

function readerAuth(subject: string) {
  const raw = process.env.GMAIL_READER_CREDENTIALS;
  if (!raw) throw new Error('GMAIL_READER_CREDENTIALS is not set in .env.local (mailbox-reader service account key).');
  let key: { client_email?: string; private_key?: string };
  try {
    key = JSON.parse(raw);
  } catch {
    throw new Error('GMAIL_READER_CREDENTIALS is not valid JSON.');
  }
  if (!key.client_email || !key.private_key) throw new Error('GMAIL_READER_CREDENTIALS is missing client_email or private_key.');
  return new google.auth.JWT({
    email: key.client_email,
    key: key.private_key.replace(/\\n/g, '\n'),
    scopes: [DIRECTORY_USER_READONLY],
    subject,
  });
}

/** Lists every user in the Workspace account, acting as DIRECTORY_SUBJECT. */
export async function listDirectoryUsers(): Promise<DirectoryUser[]> {
  const admin = google.admin({ version: 'directory_v1', auth: readerAuth(DIRECTORY_SUBJECT) });
  const out: DirectoryUser[] = [];
  let pageToken: string | undefined;
  try {
    do {
      const res = await admin.users.list({
        customer: 'my_customer',
        viewType: 'admin_view',
        maxResults: 500,
        orderBy: 'email',
        pageToken,
      });
      for (const u of res.data.users ?? []) {
        if (!u.primaryEmail) continue;
        out.push({ email: u.primaryEmail.toLowerCase(), name: u.name?.fullName ?? '', suspended: !!u.suspended });
      }
      pageToken = res.data.nextPageToken ?? undefined;
    } while (pageToken);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/unauthorized_client/i.test(msg)) {
      throw new Error(
        'Workspace directory: delegation refused (unauthorized_client). admin.directory.user.readonly is not yet granted to the mailbox-reader service account in the Admin console.'
      );
    }
    throw new Error(`Workspace directory: ${msg}`);
  }
  return out;
}
