import { NextResponse } from 'next/server';

/**
 * GHL API Configuration
 */
const GHL_BASE_URL = process.env.GHL_BASE_URL || 'https://services.leadconnectorhq.com';
const GHL_OBJECT_ID = process.env.GHL_OBJECT_ID || '';
const GHL_LOCATION_ID = process.env.GHL_LOCATION_ID || '';
const GHL_BEARER_TOKEN = process.env.GHL_BEARER_TOKEN || '';
const GHL_API_VERSION = process.env.GHL_API_VERSION || '2021-07-28';

// Validate required environment variables
if (!GHL_OBJECT_ID || !GHL_LOCATION_ID || !GHL_BEARER_TOKEN) {
  console.error('Missing GHL environment variables. Required: GHL_OBJECT_ID, GHL_LOCATION_ID, GHL_BEARER_TOKEN');
}

/**
 * API route to submit property data to GHL Custom Objects
 * Creates a new Property Review record in GHL
 */
export async function POST(request: Request) {
  try {
    // Validate required environment variables
    if (!GHL_OBJECT_ID || !GHL_LOCATION_ID || !GHL_BEARER_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'GHL API configuration is missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    const formData = await request.json();
    
    if (!formData) {
      return NextResponse.json(
        { success: false, error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Helper function to parse currency string to number
    const parseCurrencyToNumber = (value: string | undefined): number | null => {
      if (!value) return null;
      const cleaned = String(value).replace(/[$,]/g, '').trim();
      if (cleaned.toUpperCase() === 'TBC' || cleaned === '') return null;
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Calculate total_price for Split Contract (landPrice + buildPrice)
    const contractType = formData.decisionTree?.contractTypeSimplified;
    const propertyType = formData.decisionTree?.propertyType;
    let calculatedTotalPrice = formData.purchasePrice?.totalPrice || '';
    
    // For Split Contract, calculate total from land + build if totalPrice is empty or invalid
    if (contractType === 'Split Contract') {
      const existingTotal = parseCurrencyToNumber(calculatedTotalPrice);
      // If totalPrice is empty or invalid, calculate from land + build
      if (existingTotal === null) {
        const landPrice = parseCurrencyToNumber(formData.purchasePrice?.landPrice);
        const buildPrice = parseCurrencyToNumber(formData.purchasePrice?.buildPrice);
        if (landPrice !== null && buildPrice !== null) {
          calculatedTotalPrice = String(landPrice + buildPrice);
        }
      }
    }

    // Calculate net_price (only for cashback type)
    let netPrice: number | null = null;
    if (formData.purchasePrice?.cashbackRebateType === 'cashback') {
      const totalPriceNum = parseCurrencyToNumber(calculatedTotalPrice);
      const cashbackNum = parseCurrencyToNumber(formData.purchasePrice?.cashbackRebateValue);
      if (totalPriceNum !== null && cashbackNum !== null) {
        netPrice = totalPriceNum - cashbackNum;
      }
    }

    // Map form data to GHL custom object fields
    // This is a simplified mapping - you may need to adjust based on actual field names
    const ghlRecord: any = {
      property_address: formData.address?.propertyAddress || '',
      sourcer: formData.sourcer || '',
      packager: formData.packager || '',
      packager_email: formData.packagerEmail || '',
      deal_type: formData.dealType || '',
      price_group: formData.priceGroup || '',
      contract_type: formData.decisionTree?.contractTypeSimplified || '',
      dwelling_type: formData.decisionTree?.dwellingType || '',
      // review_date intentionally omitted — GHL auto-creates "Created At (AEST)" timestamp
      street_number: formData.address?.streetNumber || '',
      street_name: formData.address?.streetName || '',
      suburb_name: formData.address?.suburbName || '',
      state: formData.address?.state || '',
      post_code: formData.address?.postCode || '',
      lga: formData.address?.lga || '',
      lot_number: formData.address?.lotNumber || '',
      why_this_property: formData.contentSections?.whyThisProperty || '',
      proximity: formData.contentSections?.proximity || '',
      investment_highlights: formData.contentSections?.investmentHighlights || '',
      google_map: formData.address?.googleMap || '',
      // Project fields
      project_identifier: formData.projectIdentifier || '',
      ...(formData.projectIdentifier ? { is_parent_record: formData.isParentRecord || 'No' } : {}),
      project_parent_id: formData.projectParentId || '',
      project_address: formData.projectAddress || '',
      zoning: formData.riskOverlays?.zoning || '',
      flood: formData.riskOverlays?.flood || '',
      flood_dialogue: formData.riskOverlays?.floodDialogue || '',
      bushfire: formData.riskOverlays?.bushfire || '',
      bushfire_dialogue: formData.riskOverlays?.bushfireDialogue || '',
      mining: formData.riskOverlays?.mining || '',
      mining_dialogie: formData.riskOverlays?.miningDialogue || '', // Note: GHL field has typo "mining_dialogie"
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
      single_or_dual_occupancy: (() => {
        const dualOcc = formData.decisionTree?.dualOccupancy;
        if (dualOcc === 'Yes') return 'dual_occupancy';
        if (dualOcc === 'No') return 'single_occupancy';
        return '';
      })(),
      land_registration: formData.propertyDescription?.landRegistration || '',
      completion_date: formData.propertyDescription?.completionDate || '',
      property_description_additional_dialogue: formData.propertyDescription?.propertyDescriptionAdditionalDialogue || '',
      asking: formData.purchasePrice?.asking || '',
      asking_text: formData.purchasePrice?.askingText || '',
      acceptable_acquisition__from: formData.purchasePrice?.acceptableAcquisitionFrom || '',
      acceptable_acquisition__to: formData.purchasePrice?.acceptableAcquisitionTo || '',
      comparable_sales: formData.purchasePrice?.comparableSales || '',
      land_price: formData.purchasePrice?.landPrice || '',
      build_price: formData.purchasePrice?.buildPrice || '',
      // total_price and net_price only sent for project records (non-projects don't use these in GHL)
      ...(formData.projectIdentifier ? { total_price: calculatedTotalPrice || '' } : {}),
      ...(formData.projectIdentifier && netPrice !== null ? { net_price: netPrice } : {}),
      cashback_rebate_value: formData.purchasePrice?.cashbackRebateValue || '',
      cashback_rebate_type: formData.purchasePrice?.cashbackRebateType || '',
      purchase_price_additional_dialogue: formData.purchasePrice?.purchasePriceAdditionalDialogue || '',
      occupancy_primary: (() => {
        const dt = formData.decisionTree;
        if (dt?.dualOccupancy === 'Tri-plus' && formData.dwellings && formData.dwellings.length > 0) {
          const allOccupancies: string[] = [];
          formData.dwellings.forEach((d: any) => {
            if (d.rentalAssessment?.occupancyPrimary) allOccupancies.push(d.rentalAssessment.occupancyPrimary);
            if (d.singleOrDual === 'Yes' && d.rentalAssessment?.occupancySecondary) allOccupancies.push(d.rentalAssessment.occupancySecondary);
          });
          const unique = [...new Set(allOccupancies)];
          if (unique.length === 1 && unique[0] === 'tenanted') return 'tenanted';
          if (unique.length === 1 && unique[0] === 'vacant') return 'vacant';
          if (unique.length > 0) return 'partially_tenanted';
          return '';
        }
        return formData.rentalAssessment?.occupancyPrimary || formData.rentalAssessment?.occupancy || '';
      })(),
      occupancy_secondary: formData.rentalAssessment?.occupancySecondary || '',
      current_rent_primary__per_week: formData.rentalAssessment?.currentRentPrimary || '',
      current_rent_secondary__per_week: formData.rentalAssessment?.currentRentSecondary || '',
      expiry_primary: formData.rentalAssessment?.expiryPrimary || '',
      expiry_secondary: formData.rentalAssessment?.expirySecondary || '',
      rent_appraisal_primary_from: formData.rentalAssessment?.rentAppraisalPrimaryFrom || '',
      rent_appraisal_primary_to: formData.rentalAssessment?.rentAppraisalPrimaryTo || '',
      rent_appraisal_secondary_from: formData.rentalAssessment?.rentAppraisalSecondaryFrom || '',
      rent_appraisal_secondary_to: formData.rentalAssessment?.rentAppraisalSecondaryTo || '',
      yield: formData.rentalAssessment?.yield || '',
      appraised_yield: formData.rentalAssessment?.appraisedYield || '',
      rental_assessment_additional_dialogue: formData.rentalAssessment?.rentalAssessmentAdditionalDialogue || '',
      agent_name: formData.agentInfo?.agentName || '',
      agent_mobile: formData.agentInfo?.agentMobile || '',
      agent_email: formData.agentInfo?.agentEmail || '',
      status: formData.status || '',
      message_for_ba: formData.messageForBA || '',
      attachments_additional_dialogue: formData.attachmentsAdditionalDialogue || '',
      // Property type (derived from decision tree)
      property_type: (() => {
        const dt = formData.decisionTree;
        if (dt?.propertyType === 'New') return 'New';
        if (dt?.propertyType === 'Established') return 'Established';
        // Fallback: derive from deal_type
        const dealType = formData.dealType || '';
        const validForNew = ['01_hl_comms', '02_single_comms'];
        if (validForNew.includes(dealType)) return 'New';
        if (dealType) return 'Established';
        return '';
      })(),
      // Packager Approved & QA Approved — inherit from source
      packager_approved: formData.packagerApproved || '',
      qa_approved: formData.qaApproved || '',
      // Add folder link if available
      folder_link: formData.folderLink || '',
      // Market Performance fields (GHL number fields require numeric type or null)
      median_price_change__3_months: formData.marketPerformance?.medianPriceChange3Months ? parseFloat(formData.marketPerformance.medianPriceChange3Months) : null,
      median_price_change__1_year: formData.marketPerformance?.medianPriceChange1Year ? parseFloat(formData.marketPerformance.medianPriceChange1Year) : null,
      median_price_change__3_year: formData.marketPerformance?.medianPriceChange3Year ? parseFloat(formData.marketPerformance.medianPriceChange3Year) : null,
      median_price_change__5_year: formData.marketPerformance?.medianPriceChange5Year ? parseFloat(formData.marketPerformance.medianPriceChange5Year) : null,
      median_yield: formData.marketPerformance?.medianYield ? parseFloat(formData.marketPerformance.medianYield) : null,
      median_rent_change__1_year: formData.marketPerformance?.medianRentChange1Year ? parseFloat(formData.marketPerformance.medianRentChange1Year) : null,
      rental_population: formData.marketPerformance?.rentalPopulation ? parseFloat(formData.marketPerformance.rentalPopulation) : null,
      vacancy_rate: formData.marketPerformance?.vacancyRate ? parseFloat(formData.marketPerformance.vacancyRate) : null,
      market_performance_additional_dialogue: formData.marketPerformance?.marketPerformanceAdditionalDialogue || '',
      // Insurance, Depreciation, and Council/Water Rates (optional - only send if provided)
      // GHL custom fields
      cf_insurance_value_: formData.insurance || formData.insuranceAmount || '',
      cf_councilwater_rates_: formData.councilWaterRates || '',
      // Depreciation - store as comma-separated values (year1,year2,...,year10)
      // For project records, skip — they inherit from parent
      cf_depreciation_: (() => {
        if (formData.projectIdentifier) return ''; // Projects inherit from parent
        if (formData.depreciation && typeof formData.depreciation === 'object') {
          const depObj = formData.depreciation;
          const hasValues = Object.values(depObj).some(val => val != null && val !== '');
          if (hasValues) {
            // Store as comma-separated values
            const values: string[] = [];
            for (let year = 1; year <= 10; year++) {
              const yearValue = depObj[`year${year}`];
              values.push(yearValue != null && yearValue !== '' ? String(yearValue) : '');
            }
            // Trim trailing empty values
            while (values.length > 0 && values[values.length - 1] === '') {
              values.pop();
            }
            if (values.length > 0) {
              return values.join(',');
            }
          }
        }
        return '';
      })(),
      // Subject line — for project records, skip (uses parent's)
      subject_line: formData.projectIdentifier ? '' : (formData.subjectLine || ''),
    };

    // Strip empty/undefined values — GHL rejects empty strings for dropdown fields
    const cleanedRecord = Object.fromEntries(
      Object.entries(ghlRecord).filter(([, v]) => v !== '' && v !== undefined && v !== null)
    );

    // Debug: Log what's being sent to GHL
    console.log('[POST /api/ghl/submit-property] cleanedRecord keys:', Object.keys(cleanedRecord));
    console.log('[POST /api/ghl/submit-property] sourcer:', cleanedRecord.sourcer, '| packager:', cleanedRecord.packager);
    console.log('[POST /api/ghl/submit-property] price_group:', cleanedRecord.price_group, '| property_type:', cleanedRecord.property_type);

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
        properties: cleanedRecord,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API error:', response.status, errorText);
      throw new Error(`GHL API error: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    const newRecordId = result.id || result.recordId;

    // Follow-up PUT to set fields that GHL may silently ignore on POST (e.g. packager, property_type)
    if (newRecordId) {
      const patchFields: Record<string, string> = {};
      if (cleanedRecord.packager) patchFields.packager = String(cleanedRecord.packager);
      if (cleanedRecord.property_type) patchFields.property_type = String(cleanedRecord.property_type);
      if (cleanedRecord.price_group) patchFields.price_group = String(cleanedRecord.price_group);

      if (Object.keys(patchFields).length > 0) {
        try {
          const patchResponse = await fetch(`${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${newRecordId}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${GHL_BEARER_TOKEN}`,
              'Version': GHL_API_VERSION,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties: patchFields }),
          });
          if (!patchResponse.ok) {
            console.warn('[POST /api/ghl/submit-property] Follow-up PUT failed:', patchResponse.status, await patchResponse.text());
          } else {
            console.log('[POST /api/ghl/submit-property] Follow-up PUT succeeded for:', Object.keys(patchFields));
          }
        } catch (patchErr) {
          console.warn('[POST /api/ghl/submit-property] Follow-up PUT error:', patchErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      recordId: newRecordId,
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
