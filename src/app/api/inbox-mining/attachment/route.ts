import { NextResponse } from 'next/server';
import { getItem } from '@/lib/inboxMining/store';
import { getAttachmentByName } from '@/lib/inboxMining/gmail';
import { googleErrorMessage } from '@/lib/inboxMining/google';
import { expandZip, fetchLinkedPdf } from '@/lib/inboxMining/extract';
import type { DocRead } from '@/lib/inboxMining/types';

export const dynamic = 'force-dynamic';

// Streams a PDF for the read-only viewer, fetched live from Gmail / the link each time.
export async function GET(request: Request) {
  const sp = new URL(request.url).searchParams;
  const itemId = parseInt(sp.get('item') || '', 10);
  const name = sp.get('name') || '';
  const zipEntry = sp.get('zipEntry') || '';
  try {
    const item = await getItem(itemId);
    if (!item) return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    const doc = ((item.docs || []) as DocRead[]).find((d) => d.name === name && (d.zipEntry || '') === zipEntry);
    if (!doc) return NextResponse.json({ error: 'Document not found on item' }, { status: 404 });

    let buf: Buffer;
    if (doc.source === 'link') {
      const got = await fetchLinkedPdf(doc.url || '', item.mailbox);
      if (!got.ok) return NextResponse.json({ error: got.reason }, { status: 502 });
      buf = got.buf;
    } else {
      buf = await getAttachmentByName(item.mailbox, item.message_id, doc.name);
      if (doc.zipEntry) {
        const entry = (await expandZip(buf)).find((e) => e.name === doc.zipEntry);
        if (!entry) return NextResponse.json({ error: `"${doc.zipEntry}" not found in zip` }, { status: 404 });
        buf = entry.buf;
      }
    }
    const filename = (doc.zipEntry || doc.name).split('/').pop()!.replace(/"/g, '');
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: googleErrorMessage(e, 'Attachment') }, { status: 500 });
  }
}
