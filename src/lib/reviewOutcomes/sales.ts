import { loadAllSignups } from './signups';
import type { ReviewViewer, Sale, SalesData } from './types';

// Sales from GHL, the single source of truth (the Tracking sheet is retired and not read).
// Sold = an opportunity in a post-sale pipeline with "Date signed up"; Cancelled = Lost with a Refund lost reason.
// Revenue = the opportunity's Total Fee. Each sale counts for the client's last reported meeting on or before signing.

// Every viewer sees every sale, as with meetings; the viewer is kept for the signature.
export async function loadSales(_viewer: ReviewViewer, force = false): Promise<SalesData> {
  const warnings: string[] = [];
  const data = await loadAllSignups(force);
  const sales: Sale[] = data.signups.map((s) => ({
    id: s.oppId,
    contactId: s.contactId,
    client: s.client,
    signed: s.signed,
    fee: s.fee,
    pipeline: s.pipeline,
    stage: s.stage,
    consultant: s.consultant,
    consultantId: s.consultantId,
    cc: s.cc,
    source: s.source,
    meetingId: s.meetingId,
    meetingYmd: s.meetingYmd,
    cancelled: s.cancelled,
    lostReason: s.lostReason,
    meetingSource: s.meetingSource || '',
    meetingSourceTip: s.meetingSourceTip,
  }));
  const noFee = sales.filter((s) => !s.cancelled && !s.fee).length;
  if (noFee) warnings.push(`${noFee} sale${noFee === 1 ? ' has' : 's have'} no Total Fee in GHL, so ${noFee === 1 ? 'it adds' : 'they add'} nothing to Revenue.`);
  return { sales, syncedAt: data.at, warnings };
}
