import { NextRequest, NextResponse } from 'next/server';
import { getDistanceMatrixLogs } from '@/lib/distanceMatrixLogger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '100', 10);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    const logs = await getDistanceMatrixLogs(limit, startDate, endDate);
    
    return NextResponse.json({ success: true, logs });
  } catch (error) {
    console.error('Error fetching Distance Matrix logs:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
