import { NextRequest, NextResponse } from 'next/server';
import { serverLog } from '@/lib/serverLogger';

/**
 * Simple logging endpoint for client-side code to log to server-api.log
 * This allows us to capture client-side condition checks in server logs
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message, data } = body;
    
    if (message) {
      serverLog(`[CLIENT] ${message}`, data);
    }
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    // Don't fail if logging fails
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
