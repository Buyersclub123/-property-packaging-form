import { NextRequest, NextResponse } from 'next/server';

/**
 * GHL API Configuration
 */
const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

/**
 * GET - Fetch property from GHL by recordId
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> | { recordId: string } }
) {
  try {
    const { recordId } = await Promise.resolve(params);

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    // Validate required environment variables
    if (!GHL_OBJECT_ID || !GHL_LOCATION_ID || !GHL_BEARER_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'GHL API configuration is missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Fetch property from GHL
    const response = await fetch(
      `${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${recordId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${GHL_BEARER_TOKEN}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `GHL API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const ghlRecord = await response.json();

    // Map GHL fields back to FormData structure (Phase 1 fields only)
    const formData = {
      propertyDescription: {
        bedsPrimary: ghlRecord.beds_primary || '',
        bathPrimary: ghlRecord.bath_primary || '',
        garagePrimary: ghlRecord.garage_primary || '',
        carportPrimary: ghlRecord.carport_primary || '',
        carspacePrimary: ghlRecord.carspace_primary || '',
        yearBuilt: ghlRecord.year_built || '',
        landSize: ghlRecord.land_size || '',
      },
      purchasePrice: {
        landPrice: ghlRecord.land_price || '',
        buildPrice: ghlRecord.build_price || '',
        totalPrice: ghlRecord.total_price || '',
        acceptableAcquisitionFrom: ghlRecord.acceptable_acquisition__from || '',
        acceptableAcquisitionTo: ghlRecord.acceptable_acquisition__to || '',
      },
      rentalAssessment: {
        occupancyPrimary: ghlRecord.occupancy || '',
        currentRentPrimary: ghlRecord.current_rent_primary__per_week || '',
        rentAppraisalPrimaryFrom: ghlRecord.rent_appraisal_primary || '',
        rentAppraisalPrimaryTo: ghlRecord.rent_appraisal_primary || '', // Note: GHL field may need adjustment - check actual field names
        yield: ghlRecord.yield || '',
        appraisedYield: ghlRecord.appraised_yield || '',
      },
      // Include property address for display
      address: {
        propertyAddress: ghlRecord.property_address || '',
      },
      // Include decision tree to determine property type
      decisionTree: {
        propertyType: ghlRecord.template_type === 'Standard' ? 'Established' : 'New',
        lotType: ghlRecord.template_type === 'Project' ? 'Multiple' : 'Individual',
      },
    };

    return NextResponse.json({
      success: true,
      data: formData,
      recordId: ghlRecord.id || recordId,
    });
  } catch (error) {
    console.error('Error fetching property:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch property from GHL',
      },
      { status: 500 }
    );
  }
}

/**
 * PUT - Update property in GHL
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ recordId: string }> | { recordId: string } }
) {
  try {
    const { recordId } = await Promise.resolve(params);
    const formData = await request.json();

    if (!recordId) {
      return NextResponse.json(
        { success: false, error: 'Record ID is required' },
        { status: 400 }
      );
    }

    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Validate required environment variables
    if (!GHL_OBJECT_ID || !GHL_LOCATION_ID || !GHL_BEARER_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'GHL API configuration is missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Calculate yields if needed (they should be calculated client-side, but include as fallback)
    // For now, we'll trust the client sends the calculated yields

    // Map FormData to GHL custom object fields (Phase 1 fields only)
    const ghlRecord: any = {
      beds_primary: formData.propertyDescription?.bedsPrimary || '',
      bath_primary: formData.propertyDescription?.bathPrimary || '',
      garage_primary: formData.propertyDescription?.garagePrimary || '',
      carport_primary: formData.propertyDescription?.carportPrimary || '',
      carspace_primary: formData.propertyDescription?.carspacePrimary || '',
      year_built: formData.propertyDescription?.yearBuilt || '',
      land_size: formData.propertyDescription?.landSize || '',
      land_price: formData.purchasePrice?.landPrice || '',
      build_price: formData.purchasePrice?.buildPrice || '',
      total_price: formData.purchasePrice?.totalPrice || '',
      acceptable_acquisition__from: formData.purchasePrice?.acceptableAcquisitionFrom || '',
      acceptable_acquisition__to: formData.purchasePrice?.acceptableAcquisitionTo || '',
      occupancy: formData.rentalAssessment?.occupancyPrimary || '',
      current_rent_primary__per_week: formData.rentalAssessment?.currentRentPrimary || '',
      rent_appraisal_primary: formData.rentalAssessment?.rentAppraisalPrimaryFrom || '',
      // Note: GHL field mapping - adjust if separate "from" and "to" fields exist
      yield: formData.rentalAssessment?.yield || '',
      appraised_yield: formData.rentalAssessment?.appraisedYield || '',
    };

    // Call GHL API to update custom object record
    const response = await fetch(
      `${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${recordId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GHL_BEARER_TOKEN}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationId: GHL_LOCATION_ID,
          ...ghlRecord,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: `GHL API error: ${response.status} ${errorText}` },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      success: true,
      recordId: result.id || recordId,
      message: 'Property successfully updated in GHL',
    });
  } catch (error) {
    console.error('Error updating property:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update property in GHL',
      },
      { status: 500 }
    );
  }
}
