import { NextRequest, NextResponse } from 'next/server';

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const LOCATION_ID = process.env.GHL_LOCATION_ID || '';

// Valid status values from GHL dropdown
const VALID_STATUSES = [
  '01_available',
  '02_eoi',
  '03_contr_exchanged',
  '05_remove_no_interest',
  '06_remove_lost',
  '07_test_record',
];

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { recordId, status } = body;

    if (!recordId || !status) {
      return NextResponse.json(
        { error: 'recordId and status are required' },
        { status: 400 }
      );
    }

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Valid values: ${VALID_STATUSES.join(', ')}` },
        { status: 400 }
      );
    }

    const url = `https://services.leadconnectorhq.com/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${LOCATION_ID}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${BEARER_TOKEN}`,
        Version: '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        properties: {
          status: status,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL update failed:', response.status, errorText);
      return NextResponse.json(
        { error: `GHL API error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ success: true, record: data });
  } catch (error) {
    console.error('Update status error:', error);
    return NextResponse.json(
      { error: 'Failed to update status' },
      { status: 500 }
    );
  }
}
