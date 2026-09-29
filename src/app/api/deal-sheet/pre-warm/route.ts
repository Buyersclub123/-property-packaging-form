import { NextResponse } from 'next/server';

// F49: 7am Sydney pre-warm.
// Scheduled at both 20:00 and 21:00 UTC (covering AEST and AEDT).
// Only proceeds if the current Sydney hour is 7.

export const dynamic = 'force-dynamic';

function getSydneyHour(): number {
  const parts = new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Sydney',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());
  const hourPart = parts.find((p) => p.type === 'hour');
  return parseInt(hourPart?.value || '0', 10);
}

export async function GET() {
  const sydneyHour = getSydneyHour();

  if (sydneyHour !== 7) {
    return NextResponse.json({
      skipped: true,
      reason: `Sydney hour is ${sydneyHour}, not 7 — skipping pre-warm.`,
    });
  }

  // Hit the main deal sheet route with fresh=1 to build the cache
  const baseUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';

  try {
    const res = await fetch(`${baseUrl}/api/deal-sheet?fresh=1&statuses=all`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return NextResponse.json({
        success: false,
        error: `Deal sheet API returned ${res.status}`,
      });
    }

    const data = await res.json();
    return NextResponse.json({
      success: true,
      records: data.total,
      fetchedAt: data.fetchedAt,
    });
  } catch (error) {
    console.error('Pre-warm error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
