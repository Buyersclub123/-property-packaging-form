import { NextResponse } from 'next/server';

/**
 * Make.com webhook URL for checking if address exists in GHL
 */
const CHECK_ADDRESS_WEBHOOK_URL = process.env.MAKE_WEBHOOK_CHECK_ADDRESS || '';

/**
 * API route to check if an address already exists in GHL custom objects
 * Calls Make.com webhook which checks GHL
 */
export async function POST(request: Request) {
  try {
    const { propertyAddress } = await request.json();
    
    if (!propertyAddress) {
      return NextResponse.json(
        { success: false, error: 'Property address is required' },
        { status: 400 }
      );
    }

    if (!CHECK_ADDRESS_WEBHOOK_URL) {
      console.error('MAKE_WEBHOOK_CHECK_ADDRESS environment variable is not set');
      return NextResponse.json({
        success: true,
        exists: false,
        error: 'Webhook configuration missing - proceeding with folder creation',
      });
    }

    // Call Make.com webhook to check GHL
    const response = await fetch(CHECK_ADDRESS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ propertyAddress }),
    });

    if (!response.ok) {
      console.error('Make.com webhook error:', response.status, response.statusText);
      // If webhook fails, allow folder creation (fail open)
      return NextResponse.json({
        success: true,
        exists: false,
        error: 'Could not verify address uniqueness - proceeding with folder creation',
      });
    }

    const result = await response.json();
    
    // Make.com webhook returns: { exists: boolean, matchingRecords: [...] }
    return NextResponse.json({
      success: true,
      exists: result.exists || false,
      matchingRecords: result.matchingRecords || [],
    });
  } catch (error) {
    console.error('Error checking address via Make.com webhook:', error);
    // Fail open - allow folder creation if check fails
    return NextResponse.json({
      success: true,
      exists: false,
      error: error instanceof Error ? error.message : 'Could not verify address uniqueness',
    });
  }
}

