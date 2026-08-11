import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

const FIVE_MINUTES_MS = 5 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { opportunityId, timestamp, secret } = body;

    // Validate webhook secret
    const expectedSecret = process.env.OPPORTUNITY_WEBHOOK_SECRET;
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Validate required fields
    if (!opportunityId) {
      return NextResponse.json(
        { error: 'Missing opportunityId' },
        { status: 400 }
      );
    }

    const score = typeof timestamp === 'number' ? timestamp : Date.now();

    const redis = await getRedisClient();

    // Add/update the opportunityId in a universal sorted set
    await redis.zAdd('opportunity_changes', [{ score, value: opportunityId }]);

    // Prune entries older than 5 minutes
    const cutoff = Date.now() - FIVE_MINUTES_MS;
    await redis.zRemRangeByScore('opportunity_changes', '-inf', cutoff);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Opportunity webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
