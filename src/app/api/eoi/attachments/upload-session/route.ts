import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createFolder } from '@/lib/googleDrive';

export const dynamic = 'force-dynamic';

const MAX_TOTAL_BYTES = 18 * 1024 * 1024;

/**
 * POST /api/eoi/attachments/upload-session
 *
 * Starts a Google Drive resumable upload so the browser can send the file
 * bytes directly to Drive (bypassing Vercel's 4.5 MB request body limit).
 *
 * Body: { fileName, mimeType, size, propertyAddress, folderId? }
 * Returns: { uploadUrl, folderId }
 *
 * If folderId is omitted a per-send subfolder is created under
 * GOOGLE_DRIVE_EOI_DOCS_FOLDER_ID and returned for reuse by later files.
 */
export async function POST(request: NextRequest) {
  const { fileName, mimeType, size, propertyAddress, folderId: existingFolderId } = (await request.json()) as {
    fileName: string;
    mimeType: string;
    size: number;
    propertyAddress?: string;
    folderId?: string;
  };

  if (!fileName || !size) {
    return NextResponse.json({ error: 'fileName and size are required' }, { status: 400 });
  }
  if (size > MAX_TOTAL_BYTES) {
    return NextResponse.json({ error: 'File exceeds the 18 MB attachment limit' }, { status: 413 });
  }

  const parentFolderId = process.env.GOOGLE_DRIVE_EOI_DOCS_FOLDER_ID;
  if (!parentFolderId) {
    return NextResponse.json({ error: 'GOOGLE_DRIVE_EOI_DOCS_FOLDER_ID is not configured' }, { status: 500 });
  }

  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (!credentialsJson) {
    return NextResponse.json({ error: 'GOOGLE_SHEETS_CREDENTIALS is not configured' }, { status: 500 });
  }

  let credentials;
  try {
    credentials = JSON.parse(credentialsJson.trim().replace(/^'|'$/g, ''));
  } catch {
    const cleaned = credentialsJson.replace(/^'+|'+$/g, '').replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    credentials = JSON.parse(cleaned);
  }
  if (credentials.private_key) {
    credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
  }

  const auth = new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/drive'],
  });

  try {
    let folderId = existingFolderId;
    if (!folderId) {
      const stamp = new Date().toLocaleString('en-AU', {
        timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
      }).replace(',', '');
      const label = (propertyAddress || 'EOI').replace(/[\\/:*?"<>|]/g, ' ').trim().slice(0, 120);
      const folder = await createFolder(`${label} — ${stamp}`, parentFolderId);
      folderId = folder.id;
    }

    const { token } = await auth.getAccessToken();
    const origin = request.headers.get('origin') || '';

    const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Upload-Content-Type': mimeType || 'application/octet-stream',
        'X-Upload-Content-Length': String(size),
        ...(origin ? { Origin: origin } : {}),
      },
      body: JSON.stringify({ name: fileName, parents: [folderId] }),
    });

    if (!initRes.ok) {
      const text = await initRes.text();
      console.error('Drive resumable session init failed:', initRes.status, text);
      return NextResponse.json({ error: `Drive upload session failed (${initRes.status})` }, { status: 502 });
    }

    const uploadUrl = initRes.headers.get('location');
    if (!uploadUrl) {
      return NextResponse.json({ error: 'Drive did not return an upload URL' }, { status: 502 });
    }

    return NextResponse.json({ uploadUrl, folderId });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('EOI attachment upload-session error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
