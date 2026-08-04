import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordId, pdfLink, secret } = body;

    // Validate webhook secret
    const expectedSecret = process.env.DEAL_SHEET_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!recordId || !pdfLink) {
      return NextResponse.json(
        { error: 'Missing recordId or pdfLink' },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Store pdf link keyed by record ID (no expiry — permanent)
    await redis.set(`pdf_link:${recordId}`, pdfLink);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PDF link store error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
