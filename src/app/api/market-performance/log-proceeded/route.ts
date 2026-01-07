import { NextResponse } from 'next/server';
import { logMarketPerformanceUpdate } from '@/lib/googleSheets';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { suburbName, state, daysSinceLastCheck, changedBy } = body;

    if (!suburbName || !state || daysSinceLastCheck === undefined) {
      return NextResponse.json(
        { error: 'suburbName, state, and daysSinceLastCheck are required' },
        { status: 400 }
      );
    }

    const logEntry = {
      timestamp: new Date().toISOString(),
      suburbName,
      state,
      actionType: 'VERIFIED' as const, // Using VERIFIED type since it's the closest match
      changedBy: changedBy || 'Unknown',
      notes: `Proceeded without checking data. Data was ${daysSinceLastCheck} days old.`,
    };

    await logMarketPerformanceUpdate(logEntry);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error logging proceeded without check:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to log proceeded without check' },
      { status: 500 }
    );
  }
}


