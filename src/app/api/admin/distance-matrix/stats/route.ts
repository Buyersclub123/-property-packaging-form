import { NextRequest, NextResponse } from 'next/server';
import { getDistanceMatrixStats } from '@/lib/distanceMatrixLogger';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    const stats = await getDistanceMatrixStats(startDate, endDate);
    
    return NextResponse.json({ success: true, stats });
  } catch (error) {
    console.error('Error fetching Distance Matrix stats:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
