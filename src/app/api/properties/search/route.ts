import { NextRequest, NextResponse } from 'next/server';

/**
 * Search properties by address
 * This endpoint can be connected to a Make.com webhook that searches GHL
 */
const PROPERTY_SEARCH_WEBHOOK_URL = process.env.MAKE_WEBHOOK_PROPERTY_SEARCH || '';

export async function POST(request: NextRequest) {
  try {
    const { address } = await request.json();

    if (!address) {
      return NextResponse.json(
        { success: false, error: 'Address is required' },
        { status: 400 }
      );
    }

    // If webhook URL is not configured, return placeholder response
    if (!PROPERTY_SEARCH_WEBHOOK_URL) {
      return NextResponse.json({
        success: false,
        error: 'Property search webhook not configured. Please set MAKE_WEBHOOK_PROPERTY_SEARCH environment variable.',
        properties: [],
      });
    }

    // Call Make.com webhook to search GHL
    const response = await fetch(PROPERTY_SEARCH_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ address }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Make.com webhook error:', response.status, errorText);
      return NextResponse.json(
        {
          success: false,
          error: `Search failed: ${response.status}`,
          properties: [],
        },
        { status: response.status }
      );
    }

    const result = await response.json();

    // Expected format from Make.com:
    // { properties: [{ id: string, address: string, ...other fields }] }
    return NextResponse.json({
      success: true,
      properties: result.properties || [],
    });
  } catch (error) {
    console.error('Error searching properties:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search properties',
        properties: [],
      },
      { status: 500 }
    );
  }
}
