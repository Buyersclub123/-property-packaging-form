import { NextResponse } from 'next/server';

/**
 * GHL API Configuration
 */
const GHL_BASE_URL = 'https://services.leadconnectorhq.com';
const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const GHL_LOCATION_ID = 'UJWYn4mrgGodB7KZUcHt';
const GHL_BEARER_TOKEN = 'pit-090b5645-cb9e-47b0-a729-4d6ded3b0c04';
const GHL_API_VERSION = '2021-07-28';

/**
 * API route to submit property data to GHL Custom Objects
 * Creates a new Property Review record in GHL
 */
export async function POST(request: Request) {
  try {
    const formData = await request.json();
    
    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Map form data to GHL custom object fields
    // This is a simplified mapping - you may need to adjust based on actual field names
    const ghlRecord: any = {
      property_address: formData.address?.propertyAddress || '',
      template_type: formData.decisionTree?.propertyType === 'New' && formData.decisionTree?.lotType === 'Multiple' 
        ? 'Project' 
        : formData.decisionTree?.propertyType === 'New' 
          ? 'H&L with Sales Assessment' 
          : 'Standard',
      sourcer: formData.sourcer || '',
      packager: formData.packager || '',
      deal_type: formData.dealType || '',
      review_date: formData.reviewDate || new Date().toISOString().split('T')[0],
      street_number: formData.address?.streetNumber || '',
      street_name: formData.address?.streetName || '',
      suburb_name: formData.address?.suburbName || '',
      state: formData.address?.state || '',
      post_code: formData.address?.postCode || '',
      why_this_property: formData.contentSections?.whyThisProperty || '',
      proximity: formData.contentSections?.proximity || '',
      investment_highlights: formData.contentSections?.investmentHighlights || '',
      google_map: formData.address?.googleMap || '',
      zoning: formData.riskOverlays?.zoning || '',
      flood: formData.riskOverlays?.flood || '',
      flood_dialogue: formData.riskOverlays?.floodDialogue || '',
      bushfire: formData.riskOverlays?.bushfire || '',
      bushfire_dialogue: formData.riskOverlays?.bushfireDialogue || '',
      mining: formData.riskOverlays?.mining || '',
      mining_dialogue: formData.riskOverlays?.miningDialogue || '',
      other_overlay: formData.riskOverlays?.otherOverlay || '',
      other_overlay_dialogue: formData.riskOverlays?.otherOverlayDialogue || '',
      special_infrastructure: formData.riskOverlays?.specialInfrastructure || '',
      special_infrastructure_dialogue: formData.riskOverlays?.specialInfrastructureDialogue || '',
      due_diligence_acceptance: formData.riskOverlays?.dueDiligenceAcceptance || '',
      beds_primary: formData.propertyDescription?.bedsPrimary || '',
      beds_additional__secondary__dual_key: formData.propertyDescription?.bedsSecondary || '',
      bath_primary: formData.propertyDescription?.bathPrimary || '',
      baths_additional__secondary__dual_key: formData.propertyDescription?.bathSecondary || '',
      garage_primary: formData.propertyDescription?.garagePrimary || '',
      garage_additional__secondary__dual_key: formData.propertyDescription?.garageSecondary || '',
      carport_primary: formData.propertyDescription?.carportPrimary || '',
      carport_additional__secondary__dual_key: formData.propertyDescription?.carportSecondary || '',
      carspace_primary: formData.propertyDescription?.carspacePrimary || '',
      carspace_additional__secondary__dual_key: formData.propertyDescription?.carspaceSecondary || '',
      year_built: formData.propertyDescription?.yearBuilt || '',
      land_size: formData.propertyDescription?.landSize || '',
      build_size: formData.propertyDescription?.buildSize || '',
      title: formData.propertyDescription?.title || '',
      body_corp__per_quarter: formData.propertyDescription?.bodyCorpPerQuarter || '',
      body_corp_description: formData.propertyDescription?.bodyCorpDescription || '',
      does_this_property_have_2_dwellings: formData.propertyDescription?.doesThisPropertyHave2Dwellings || '',
      asking: formData.purchasePrice?.asking || '',
      asking_text: formData.purchasePrice?.askingText || '',
      acceptable_acquisition__from: formData.purchasePrice?.acceptableAcquisitionFrom || '',
      acceptable_acquisition__to: formData.purchasePrice?.acceptableAcquisitionTo || '',
      comparable_sales: formData.purchasePrice?.comparableSales || '',
      land_price: formData.purchasePrice?.landPrice || '',
      build_price: formData.purchasePrice?.buildPrice || '',
      total_price: formData.purchasePrice?.totalPrice || '',
      cashback_rebate_value: formData.purchasePrice?.cashbackRebateValue || '',
      cashback_rebate_type: formData.purchasePrice?.cashbackRebateType || '',
      occupancy: formData.rentalAssessment?.occupancy || '',
      current_rent_primary__per_week: formData.rentalAssessment?.currentRentPrimary || '',
      current_rent_secondary__per_week: formData.rentalAssessment?.currentRentSecondary || '',
      expiry_primary: formData.rentalAssessment?.expiryPrimary || '',
      expiry_secondary: formData.rentalAssessment?.expirySecondary || '',
      rent_appraisal_primary: formData.rentalAssessment?.rentAppraisalPrimaryFrom || '',
      rent_appraisal_secondary: formData.rentalAssessment?.rentAppraisalSecondaryFrom || '',
      yield: formData.rentalAssessment?.yield || '',
      appraised_yield: formData.rentalAssessment?.appraisedYield || '',
      agent_name: formData.agentInfo?.agentName || '',
      agent_mobile: formData.agentInfo?.agentMobile || '',
      agent_email: formData.agentInfo?.agentEmail || '',
      status: formData.status || '',
      // Add folder link if available
      folder_link: formData.folderLink || '',
    };

    // Call GHL API to create custom object record
    const response = await fetch(`${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GHL_BEARER_TOKEN}`,
        'Version': GHL_API_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId: GHL_LOCATION_ID,
        ...ghlRecord,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error:', response.status, errorText);
      throw new Error(`GHL API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    
    return NextResponse.json({
      success: true,
      recordId: result.id || result.recordId,
      message: 'Property successfully submitted to GHL',
    });
  } catch (error) {
    console.error('Error submitting to GHL:', error);
    return NextResponse.json(
      { 
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit property to GHL' 
      },
      { status: 500 }
    );
  }
}
