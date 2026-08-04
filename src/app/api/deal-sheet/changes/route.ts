import { NextResponse } from 'next/server';
import { getRedisClient } from '@/lib/redis';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sinceParam = searchParams.get('since');

    if (!sinceParam) {
      return NextResponse.json(
        { error: 'Missing "since" query parameter (unix ms)' },
        { status: 400 }
      );
    }

    const since = parseInt(sinceParam, 10);
    if (isNaN(since)) {
      return NextResponse.json(
        { error: '"since" must be a valid unix timestamp in milliseconds' },
        { status: 400 }
      );
    }

    const redis = await getRedisClient();

    // Get all entries with score > since (exclusive)
    const results = await redis.zRangeWithScores('recent_changes', `(${since}`, '+inf', {
      BY: 'SCORE',
    });

    const changes = results.map((entry) => ({
      recordId: entry.value,
      timestamp: entry.score,
    }));

    return NextResponse.json({ changes });
  } catch (error) {
    console.error('Changes endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
