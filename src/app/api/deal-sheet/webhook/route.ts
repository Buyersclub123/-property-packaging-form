import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { recordId, timestamp, secret } = body;

    // Validate webhook secret
    const expectedSecret = process.env.DEAL_SHEET_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!recordId || !timestamp) {
      return NextResponse.json(
        { error: 'Missing recordId or timestamp' },
        { status: 400 }
      );
    }

    const score = typeof timestamp === 'number' ? timestamp : Date.now();

    const redis = await getRedisClient();

    // Add/update the recordId in the sorted set with timestamp as score
    // If the same recordId is added again, the score (timestamp) is updated
    await redis.zAdd('recent_changes', [{ score, value: recordId }]);

    // Prune entries older than 5 minutes
    const cutoff = Date.now() - FIVE_MINUTES_MS;
    await redis.zRemRangeByScore('recent_changes', '-inf', cutoff);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
