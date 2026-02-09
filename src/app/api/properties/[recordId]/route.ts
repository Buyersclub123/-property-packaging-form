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
    // Include locationId as query parameter (required by GHL API)
    const url = `${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${GHL_LOCATION_ID}`;
    
    const response = await fetch(
      url,
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

    const ghlResponse = await response.json();
    
    // GHL API returns: { record: { id: "...", properties: {...} } }
    const props = ghlResponse.record?.properties || {};
    const recordIdFromGHL = ghlResponse.record?.id || recordId;
    
    // Helper function to normalize YesNo values (form expects "Yes", "No", or "")
    const normalizeYesNo = (value: string | undefined | null): string => {
      if (!value) return '';
      const lower = String(value).toLowerCase().trim();
      if (lower === 'yes') return 'Yes';
      if (lower === 'no') return 'No';
      // If already "Yes" or "No", return as-is
      if (value === 'Yes' || value === 'No') return value;
      return '';
    };
    
    // Debug: Find all bath-related fields in GHL response
    const allKeys = Object.keys(props);
    const bathKeys = allKeys.filter(key => 
      key.toLowerCase().includes('bath') || 
      key.toLowerCase().includes('secondary') ||
      key.toLowerCase().includes('additional')
    );
    const bathFields: Record<string, any> = {};
    bathKeys.forEach(key => {
      bathFields[key] = {
        value: props[key],
        type: typeof props[key],
      };
    });

    // Debug: Log what we received - specifically Decision Tree fields
    const allPropertyKeys = Object.keys(props);
    console.log('[GET /api/properties] GHL Response structure:', {
      hasRecord: !!ghlResponse.record,
      hasProperties: !!ghlResponse.record?.properties,
      totalPropertyKeys: allPropertyKeys.length,
      allPropertyKeys: allPropertyKeys, // ALL keys to see exact field names
      propertyKeysSample: allPropertyKeys.slice(0, 20), // First 20 keys
      recordId: recordIdFromGHL,
      // Decision Tree fields from GHL
      template_type: props.template_type,
      contract_type: props.contract_type,
      deal_type: props.deal_type,
      status: props.status,
      single_or_dual_occupancy: props.single_or_dual_occupancy,
      // Address fields that might be used in Decision Tree
      lotNumber: props.lot_number || 'NOT_FOUND',
      unitNumber: props.unit_number || 'NOT_FOUND',
      // ALL bath-related fields found in GHL
      allBathRelatedFields: bathFields,
      // Specific fields we're looking for
      bath_primary: props.bath_primary,
      baths_additional__secondary__dual_key: props.baths_additional__secondary__dual_key,
      bath_primary_type: typeof props.bath_primary,
      baths_additional_type: typeof props.baths_additional__secondary__dual_key,
    });

    // Map GHL fields back to FormData structure (REVERSE of submit-property mapping)
    // NOTE: template_type is NOT used by the form - form uses propertyType and lotType directly
    // Submit mapping: deal_type = dealType (full contract type like "05_established") = contractType in form
    // Submit mapping: contract_type = contractTypeSimplified ("Single Contract" or "Split Contract")
    // Submit mapping: status = status (top level, not in decisionTree)
    // Submit mapping: single_or_dual_occupancy = dualOccupancy conversion
    
    const dealType = props.deal_type; // This is the FULL contract type (e.g., "05_established") = contractType in form
    const contractTypeSimplified = props.contract_type; // This is "Single Contract" or "Split Contract"
    const status = props.status; // Top level status
    const singleOrDualOccupancy = props.single_or_dual_occupancy;
    
    // Determine propertyType from deal_type (contractType):
    // Form logic: validForNew = ['01_hl_comms', '02_single_comms']
    // Form logic: validForEstablished = ['03_internal_with_comms', '04_internal_nocomms', '05_established']
    let propertyType: 'New' | 'Established' | null = null;
    let lotType: 'Individual' | 'Multiple' | null = null;
    
    console.log('[GET /api/properties] deal_type raw value:', JSON.stringify(dealType), 'type:', typeof dealType);
    
    if (dealType === '05_established') {
      propertyType = 'Established';
      lotType = null; // Established properties don't have lotType
    } else if (dealType === '03_internal_with_comms' || dealType === '04_internal_nocomms') {
      propertyType = 'Established';
      lotType = null; // Established properties don't have lotType
    } else if (dealType === '01_hl_comms' || dealType === '02_single_comms') {
      propertyType = 'New';
      // For New properties, lotType needs to be determined from other fields
      // If contractTypeSimplified is 'Split Contract', it's likely Individual (H&L)
      // If we have lots data or other indicators, we could determine Multiple
      // For now, default to Individual (most common for New properties)
      // User can change it in the form if needed
      lotType = 'Individual'; // Default - user can correct if it's actually Multiple
    }
    
    // If we still don't have propertyType, check template_type as fallback (legacy support)
    if (!propertyType && props.template_type) {
      const templateType = props.template_type;
      console.log('[GET /api/properties] Using template_type as fallback:', JSON.stringify(templateType));
      if (templateType === 'Project') {
        propertyType = 'New';
        lotType = 'Multiple';
      } else if (templateType === 'H&L with Sales Assessment') {
        propertyType = 'New';
        lotType = 'Individual';
      } else if (templateType === 'Standard') {
        propertyType = 'Established';
        lotType = null;
      }
    }
    
    console.log('[GET /api/properties] Mapped propertyType:', propertyType, 'lotType:', lotType);
    
    console.log('[GET /api/properties] Mapped propertyType:', propertyType, 'lotType:', lotType);
    
    // Reverse single_or_dual_occupancy mapping:
    // Submit: dualOccupancy='Yes' → single_or_dual_occupancy='dual_occupancy'
    // Submit: dualOccupancy='No' → single_or_dual_occupancy='single_occupancy'
    let dualOccupancy: 'Yes' | 'No' | null = null;
    if (singleOrDualOccupancy) {
      const lower = String(singleOrDualOccupancy).toLowerCase();
      if (lower.includes('dual')) dualOccupancy = 'Yes';
      else if (lower.includes('single')) dualOccupancy = 'No';
    }
    
    const formData = {
      // Decision Tree
      decisionTree: {
        propertyType,
        // contractType comes from deal_type (full contract type)
        contractType: dealType && dealType.match(/^\d{2}_/) ? dealType : null,
        // contractTypeSimplified comes from contract_type
        contractTypeSimplified: contractTypeSimplified === 'Single Contract' || contractTypeSimplified === 'Split Contract' ? contractTypeSimplified : null,
        lotType,
        dualOccupancy,
        // status comes from top-level status field
        status: status || null,
      },
      // Address
      address: {
        propertyAddress: props.property_address || '',
        streetNumber: props.street_number || '',
        streetName: props.street_name || '',
        suburbName: props.suburb_name || '',
        state: props.state || '',
        postCode: props.post_code || '',
        googleMap: props.google_map || '',
        lga: props.lga || '',
        // Extract lot number from property_address if it exists (format: "Lot X, ..." or "Lot X")
        lotNumber: (() => {
          // Check if there's a separate lot_number field in GHL
          if (props.lot_number) return props.lot_number;
          // Otherwise, try to extract from property_address
          if (props.property_address) {
            const lotMatch = props.property_address.match(/^Lot\s+([\d\w]+)/i);
            if (lotMatch) return lotMatch[1];
          }
          return '';
        })(),
        lotNumberNotApplicable: (() => {
          // If lotNumber is empty and property_address doesn't have "Lot", assume not applicable
          const hasLotInAddress = props.property_address && /^Lot\s+/i.test(props.property_address);
          return !props.lot_number && !hasLotInAddress;
        })(),
        // Extract unit number from property_address if it exists (format: "Unit X, ..." or "Units X, ...")
        unitNumber: (() => {
          // Check if there's a separate unit_number field in GHL
          if (props.unit_number) return props.unit_number;
          // Otherwise, try to extract from property_address
          if (props.property_address) {
            const unitMatch = props.property_address.match(/(?:Units?)\s+([^,]+)/i);
            if (unitMatch) return unitMatch[1].trim();
          }
          return '';
        })(),
        hasUnitNumbers: (() => {
          // If unitNumber exists, hasUnitNumbers should be true
          const unitNum = props.unit_number || (props.property_address && props.property_address.match(/(?:Units?)\s+([^,]+)/i)?.[1]?.trim());
          return unitNum ? true : undefined;
        })(),
      },
      // Risk Overlays (normalize YesNo values to match form expectations)
      riskOverlays: {
        zoning: props.zoning || '',
        flood: normalizeYesNo(props.flood),
        floodDialogue: props.flood_dialogue || '',
        bushfire: normalizeYesNo(props.bushfire),
        bushfireDialogue: props.bushfire_dialogue || '',
        mining: normalizeYesNo(props.mining),
        miningDialogue: props.mining_dialogue || props.mining_dialogie || '', // Handle typo in GHL field name
        otherOverlay: normalizeYesNo(props.other_overlay),
        otherOverlayDialogue: props.other_overlay_dialogue || '',
        specialInfrastructure: normalizeYesNo(props.special_infrastructure),
        specialInfrastructureDialogue: props.special_infrastructure_dialogue || '',
        dueDiligenceAcceptance: normalizeYesNo(props.due_diligence_acceptance),
      },
      // Property Description
      propertyDescription: (() => {
        // Helper function to convert GHL's "point" format to decimal (e.g., "1point5" -> "1.5")
        const convertPointToDecimal = (value: any): string => {
          if (value == null || value === '') return '';
          let strValue = String(value);
          // Handle GHL's "1point5" format - convert to "1.5"
          if (typeof strValue === 'string' && strValue.toLowerCase().includes('point')) {
            strValue = strValue.toLowerCase().replace(/point/g, '.');
          }
          return strValue;
        };
        
        return {
          bedsPrimary: props.beds_primary ? String(props.beds_primary) : '',
          bedsSecondary: props.beds_additional__secondary__dual_key ? String(props.beds_additional__secondary__dual_key) : '',
          bathPrimary: convertPointToDecimal(props.bath_primary),
        // Try multiple possible field names for bath secondary (GHL field name variations)
        // GHL may convert double underscores to single, or use camelCase
        bathSecondary: (() => {
          // Try all possible variations of the field name
          const possibleKeys = [
            'baths_additional__secondary__dual_key',  // Original (double underscore)
            'baths_additional_secondary_dual_key',     // Single underscore variant
            'bathsAdditionalSecondaryDualKey',        // camelCase variant
            'baths_additional_secondary',              // Shortened variant
            'bath_secondary',                          // Simple variant
            'bathsSecondary',                         // camelCase simple
            'bathSecondary',                          // camelCase without 's'
          ];
          
          let value: any = undefined;
          let foundKey: string | null = null;
          
          // Try each key variation
          for (const key of possibleKeys) {
            if (props[key] !== undefined && props[key] !== null) {
              value = props[key];
              foundKey = key;
              break;
            }
          }
          
          // Also check all keys for partial matches (case-insensitive)
          if (value === undefined) {
            const allKeys = Object.keys(props);
            const matchingKey = allKeys.find(key => 
              key.toLowerCase().includes('bath') && 
              (key.toLowerCase().includes('secondary') || key.toLowerCase().includes('additional'))
            );
            if (matchingKey) {
              value = props[matchingKey];
              foundKey = matchingKey;
            }
          }
          
          console.log('[GET /api/properties] bathSecondary mapping:', {
            allPossibleKeys: possibleKeys,
            foundKey: foundKey,
            foundValue: value,
            valueType: typeof value,
            allBathKeys: Object.keys(props).filter(k => k.toLowerCase().includes('bath')),
            stringValue: value != null && value !== '' ? String(value) : 'null/undefined',
          });
          
          // Convert to string, handling numbers, decimals, and strings
          if (value != null && value !== '') {
            let strValue = String(value);
            // Use the helper function to convert "point" to "."
            strValue = convertPointToDecimal(strValue);
            return strValue;
          }
          return '';
        })(),
        garagePrimary: props.garage_primary ? String(props.garage_primary) : '',
        garageSecondary: props.garage_additional__secondary__dual_key ? String(props.garage_additional__secondary__dual_key) : '',
        carportPrimary: props.carport_primary ? String(props.carport_primary) : '',
        carportSecondary: props.carport_additional__secondary__dual_key ? String(props.carport_additional__secondary__dual_key) : '',
        carspacePrimary: props.carspace_primary ? String(props.carspace_primary) : '',
        carspaceSecondary: props.carspace_additional__secondary__dual_key ? String(props.carspace_additional__secondary__dual_key) : '',
        yearBuilt: props.year_built || '',
        landSize: props.land_size || '',
        buildSize: props.build_size || '',
        title: props.title || '',
        bodyCorpPerQuarter: props.body_corp__per_quarter || '',
        bodyCorpDescription: props.body_corp_description || '',
        doesThisPropertyHave2Dwellings: props.does_this_property_have_2_dwellings || '',
        singleOrDualOccupancy: props.single_or_dual_occupancy || '',
        landRegistration: props.land_registration || '',
        propertyDescriptionAdditionalDialogue: props.property_description_additional_dialogue || '',
        };
      })(),
      // Purchase Price
      purchasePrice: {
        asking: props.asking || '',
        askingText: props.asking_text || '',
        acceptableAcquisitionFrom: props.acceptable_acquisition__from || '',
        acceptableAcquisitionTo: props.acceptable_acquisition__to || '',
        comparableSales: props.comparable_sales || '',
        landPrice: props.land_price || '',
        buildPrice: props.build_price || '',
        totalPrice: props.total_price || '',
        cashbackRebateValue: props.cashback_rebate_value || '',
        cashbackRebateType: props.cashback_rebate_type || '',
        purchasePriceAdditionalDialogue: props.purchase_price_additional_dialogue || '',
      },
      // Rental Assessment
      rentalAssessment: {
        occupancy: props.occupancy || props.occupancy_primary || '',
        occupancyPrimary: props.occupancy_primary || props.occupancy || '',
        occupancySecondary: props.occupancy_secondary || '',
        currentRentPrimary: props.current_rent_primary__per_week || '',
        currentRentSecondary: props.current_rent_secondary__per_week || '',
        expiryPrimary: props.expiry_primary || '',
        expirySecondary: props.expiry_secondary || '',
        rentAppraisalPrimaryFrom: props.rent_appraisal_primary_from || props.rent_appraisal_primary || '',
        rentAppraisalPrimaryTo: props.rent_appraisal_primary_to || props.rent_appraisal_primary || '',
        rentAppraisalSecondaryFrom: props.rent_appraisal_secondary_from || props.rent_appraisal_secondary || '',
        rentAppraisalSecondaryTo: props.rent_appraisal_secondary_to || props.rent_appraisal_secondary || '',
        yield: props.yield || '',
        appraisedYield: props.appraised_yield || '',
        rentalAssessmentAdditionalDialogue: props.rental_assessment_additional_dialogue || '',
      },
      // Market Performance
      marketPerformance: {
        medianPriceChange3Months: props.median_price_change__3_months || '',
        medianPriceChange1Year: props.median_price_change__1_year || '',
        medianPriceChange3Year: props.median_price_change__3_year || '',
        medianPriceChange5Year: props.median_price_change__5_year || '',
        medianYield: props.median_yield || '',
        medianRentChange1Year: props.median_rent_change__1_year || '',
        rentalPopulation: props.rental_population || '',
        vacancyRate: props.vacancy_rate || '',
        marketPerformanceAdditionalDialogue: props.market_performance_additional_dialogue || props.market_perfornance_additional_dialogue || '', // Handle typo in GHL field name
      },
      // Content Sections
      contentSections: {
        whyThisProperty: props.why_this_property || '',
        proximity: props.proximity || '',
        investmentHighlights: props.investment_highlights || '',
      },
      // Agent Info (for compatibility)
      agentInfo: {
        agentName: props.agent_name || '',
        agentMobile: props.agent_mobile || '',
        agentEmail: props.agent_email || '',
      },
      // Selling Agent fields (form uses these top-level fields)
      // GHL stores as agent_name, agent_email, agent_mobile
      // But form may also have a combined selling_agent field
      sellingAgent: props.selling_agent || '',
      sellingAgentName: props.agent_name || '',
      sellingAgentEmail: props.agent_email || '',
      sellingAgentMobile: props.agent_mobile || '',
      // Other fields
      sourcer: props.sourcer || '',
      packager: props.packager || '',
      dealType: dealType || '', // deal_type is the full contract type
      status: status || '', // Top-level status (also in decisionTree.status)
      reviewDate: props.review_date || '',
      folderLink: props.folder_link || '',
      // Message for BA
      messageForBA: props.message_for_ba || '',
      // Attachments Additional Dialogue
      attachmentsAdditionalDialogue: props.attachments_additional_dialogue || '',
      // Insurance, Depreciation, and Council/Water Rates (for edit mode - optional)
      // GHL custom field: cf_insurance_value_ (display name: "CF Insurance Value $")
      insurance: props.cf_insurance_value_ || props.insurance || props.annual_insurance_cost || props.insurance_amount || '',
      // GHL custom field: cf_councilwater_rates_ (display name: "CF Council/Water Rates $")
      councilWaterRates: props.cf_councilwater_rates_ || props.council_water_rates || props.councilWaterRates || '',
      // Depreciation (object with year1-year10)
      // Can be stored as: JSON string, comma-separated values, or individual fields
      depreciation: (() => {
        // Try to get depreciation from GHL - could be stored as JSON string, comma-separated, or object
        const depValue = props.depreciation || props.cf_depreciation_;
        if (!depValue) {
          // Try individual year fields (depreciation_year_1, etc.)
          const dep: Record<string, string> = {};
          for (let year = 1; year <= 10; year++) {
            const yearKey = `depreciation_year_${year}`;
            const yearValue = props[yearKey];
            if (yearValue != null && yearValue !== '') {
              dep[`year${year}`] = String(yearValue);
            }
          }
          return Object.keys(dep).length > 0 ? dep : undefined;
        }
        
        // If it's a string, try different parsing methods
        if (typeof depValue === 'string') {
          // Method 1: Try JSON parsing first
          try {
            const parsed = JSON.parse(depValue);
            if (typeof parsed === 'object' && parsed !== null) {
              return parsed;
            }
          } catch {
            // JSON parsing failed, try comma-separated
          }
          
          // Method 2: Try comma-separated values (format: "12345,11234,10123,...")
          const trimmed = depValue.trim();
          if (trimmed.includes(',')) {
            const values = trimmed.split(',').map(v => v.trim()).filter(v => v !== '');
            if (values.length > 0 && values.length <= 10) {
              const dep: Record<string, string> = {};
              for (let i = 0; i < values.length && i < 10; i++) {
                dep[`year${i + 1}`] = values[i];
              }
              return dep;
            }
          }
        }
        
        // If it's already an object, return it
        if (typeof depValue === 'object' && depValue !== null) {
          return depValue;
        }
        
        return undefined;
      })(),
    };

    // Debug: Log what we're returning
    console.log('[GET /api/properties] Returning formData structure:', {
      hasDecisionTree: !!formData.decisionTree,
      hasAddress: !!formData.address,
      hasPropertyDescription: !!formData.propertyDescription,
      hasPurchasePrice: !!formData.purchasePrice,
      hasRentalAssessment: !!formData.rentalAssessment,
      addressKeys: Object.keys(formData.address || {}),
      propertyDescriptionKeys: Object.keys(formData.propertyDescription || {}),
    });

    // Debug: Log the final formData structure
    console.log('[GET /api/properties] Final formData being returned:', {
      hasDecisionTree: !!formData.decisionTree,
      decisionTree: JSON.stringify(formData.decisionTree),
      hasDealType: !!formData.dealType,
      dealType: formData.dealType,
      hasStatus: !!formData.status,
      status: formData.status,
      propertyType: formData.decisionTree?.propertyType,
      contractType: formData.decisionTree?.contractType,
      lotType: formData.decisionTree?.lotType,
      dualOccupancy: formData.decisionTree?.dualOccupancy,
      decisionTreeStatus: formData.decisionTree?.status,
      // Property Description fields for debugging
      bathPrimary: formData.propertyDescription?.bathPrimary,
      bathSecondary: formData.propertyDescription?.bathSecondary,
      bathPrimaryType: typeof formData.propertyDescription?.bathPrimary,
      bathSecondaryType: typeof formData.propertyDescription?.bathSecondary,
    });
    
    return NextResponse.json({
      success: true,
      data: formData,
      recordId: recordIdFromGHL,
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
    
    // Ensure locationId is a non-empty string (GHL API requires string, not empty)
    const locationIdString = String(GHL_LOCATION_ID || '').trim();
    if (!locationIdString || locationIdString === 'undefined' || locationIdString === 'null') {
      console.error('[PUT /api/properties] GHL_LOCATION_ID validation failed:');
      console.error('  GHL_LOCATION_ID value:', GHL_LOCATION_ID);
      console.error('  GHL_LOCATION_ID type:', typeof GHL_LOCATION_ID);
      console.error('  locationIdString after conversion:', locationIdString);
      return NextResponse.json(
        { 
          success: false, 
          error: 'GHL_LOCATION_ID is empty or invalid. Please check environment variables. Value: ' + String(GHL_LOCATION_ID) 
        },
        { status: 500 }
      );
    }
    
    console.log('[PUT /api/properties] GHL_LOCATION_ID validated:', locationIdString.substring(0, 10) + '...');

    // Helper function to only include fields that are actually provided (not undefined/null)
    // This ensures partial updates - only changed fields are sent
    const includeIfProvided = (value: any): boolean => {
      return value !== undefined && value !== null && value !== '';
    };

    // Helper function to parse currency string to number
    const parseCurrencyToNumber = (value: string | undefined): number | null => {
      if (!value) return null;
      const cleaned = String(value).replace(/[$,]/g, '').trim();
      if (cleaned.toUpperCase() === 'TBC' || cleaned === '') return null;
      const num = parseFloat(cleaned);
      return isNaN(num) ? null : num;
    };

    // Calculate total_price for Split Contract if needed
    const contractType = formData.decisionTree?.contractTypeSimplified;
    let calculatedTotalPrice = formData.purchasePrice?.totalPrice || '';
    
    if (contractType === 'Split Contract' && includeIfProvided(formData.purchasePrice?.landPrice) && includeIfProvided(formData.purchasePrice?.buildPrice)) {
      const existingTotal = parseCurrencyToNumber(calculatedTotalPrice);
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
    if (formData.purchasePrice?.cashbackRebateType === 'cashback' && includeIfProvided(formData.purchasePrice?.totalPrice) && includeIfProvided(formData.purchasePrice?.cashbackRebateValue)) {
      const totalPriceNum = parseCurrencyToNumber(formData.purchasePrice?.totalPrice);
      const cashbackNum = parseCurrencyToNumber(formData.purchasePrice?.cashbackRebateValue);
      if (totalPriceNum !== null && cashbackNum !== null) {
        netPrice = totalPriceNum - cashbackNum;
      }
    }

    // Map FormData to GHL custom object fields (same mapping as submit-property)
    // Only include fields that are actually provided (partial update support)
    const ghlRecord: any = {};

    // Address fields
    if (includeIfProvided(formData.address?.propertyAddress)) ghlRecord.property_address = formData.address.propertyAddress;
    if (includeIfProvided(formData.address?.streetNumber)) ghlRecord.street_number = formData.address.streetNumber;
    if (includeIfProvided(formData.address?.streetName)) ghlRecord.street_name = formData.address.streetName;
    if (includeIfProvided(formData.address?.suburbName)) ghlRecord.suburb_name = formData.address.suburbName;
    if (includeIfProvided(formData.address?.state)) ghlRecord.state = formData.address.state;
    if (includeIfProvided(formData.address?.postCode)) ghlRecord.post_code = formData.address.postCode;
    if (includeIfProvided(formData.address?.googleMap)) ghlRecord.google_map = formData.address.googleMap;
    if (includeIfProvided(formData.address?.lga)) ghlRecord.lga = formData.address.lga;

    // Decision Tree fields
    if (formData.decisionTree?.propertyType) {
      ghlRecord.template_type = formData.decisionTree.propertyType === 'New' && formData.decisionTree?.lotType === 'Multiple' 
        ? 'Project' 
        : formData.decisionTree.propertyType === 'New' 
          ? 'H&L with Sales Assessment' 
          : 'Standard';
    }
    if (includeIfProvided(formData.decisionTree?.contractTypeSimplified)) ghlRecord.contract_type = formData.decisionTree.contractTypeSimplified;
    if (includeIfProvided(formData.sourcer)) ghlRecord.sourcer = formData.sourcer;
    if (includeIfProvided(formData.packager)) ghlRecord.packager = formData.packager;
    if (includeIfProvided(formData.dealType)) ghlRecord.deal_type = formData.dealType;
    if (includeIfProvided(formData.reviewDate)) ghlRecord.review_date = formData.reviewDate;
    if (includeIfProvided(formData.status)) ghlRecord.status = formData.status;

    // Risk Overlays
    if (includeIfProvided(formData.riskOverlays?.zoning)) ghlRecord.zoning = formData.riskOverlays.zoning;
    if (includeIfProvided(formData.riskOverlays?.flood)) ghlRecord.flood = formData.riskOverlays.flood;
    if (includeIfProvided(formData.riskOverlays?.floodDialogue)) ghlRecord.flood_dialogue = formData.riskOverlays.floodDialogue;
    if (includeIfProvided(formData.riskOverlays?.bushfire)) ghlRecord.bushfire = formData.riskOverlays.bushfire;
    if (includeIfProvided(formData.riskOverlays?.bushfireDialogue)) ghlRecord.bushfire_dialogue = formData.riskOverlays.bushfireDialogue;
    if (includeIfProvided(formData.riskOverlays?.mining)) ghlRecord.mining = formData.riskOverlays.mining;
    // Note: GHL field has typo "mining_dialogie" - use typo version to match GHL
    if (includeIfProvided(formData.riskOverlays?.miningDialogue)) ghlRecord.mining_dialogie = formData.riskOverlays.miningDialogue;
    if (includeIfProvided(formData.riskOverlays?.otherOverlay)) ghlRecord.other_overlay = formData.riskOverlays.otherOverlay;
    if (includeIfProvided(formData.riskOverlays?.otherOverlayDialogue)) ghlRecord.other_overlay_dialogue = formData.riskOverlays.otherOverlayDialogue;
    if (includeIfProvided(formData.riskOverlays?.specialInfrastructure)) ghlRecord.special_infrastructure = formData.riskOverlays.specialInfrastructure;
    if (includeIfProvided(formData.riskOverlays?.specialInfrastructureDialogue)) ghlRecord.special_infrastructure_dialogue = formData.riskOverlays.specialInfrastructureDialogue;
    if (includeIfProvided(formData.riskOverlays?.dueDiligenceAcceptance)) ghlRecord.due_diligence_acceptance = formData.riskOverlays.dueDiligenceAcceptance;

    // Property Description
    if (includeIfProvided(formData.propertyDescription?.bedsPrimary)) ghlRecord.beds_primary = formData.propertyDescription.bedsPrimary;
    if (includeIfProvided(formData.propertyDescription?.bedsSecondary)) ghlRecord.beds_additional__secondary__dual_key = formData.propertyDescription.bedsSecondary;
    if (includeIfProvided(formData.propertyDescription?.bathPrimary)) ghlRecord.bath_primary = formData.propertyDescription.bathPrimary;
    if (includeIfProvided(formData.propertyDescription?.bathSecondary)) ghlRecord.baths_additional__secondary__dual_key = formData.propertyDescription.bathSecondary;
    if (includeIfProvided(formData.propertyDescription?.garagePrimary)) ghlRecord.garage_primary = formData.propertyDescription.garagePrimary;
    if (includeIfProvided(formData.propertyDescription?.garageSecondary)) ghlRecord.garage_additional__secondary__dual_key = formData.propertyDescription.garageSecondary;
    if (includeIfProvided(formData.propertyDescription?.carportPrimary)) ghlRecord.carport_primary = formData.propertyDescription.carportPrimary;
    if (includeIfProvided(formData.propertyDescription?.carportSecondary)) ghlRecord.carport_additional__secondary__dual_key = formData.propertyDescription.carportSecondary;
    if (includeIfProvided(formData.propertyDescription?.carspacePrimary)) ghlRecord.carspace_primary = formData.propertyDescription.carspacePrimary;
    if (includeIfProvided(formData.propertyDescription?.carspaceSecondary)) ghlRecord.carspace_additional__secondary__dual_key = formData.propertyDescription.carspaceSecondary;
    if (includeIfProvided(formData.propertyDescription?.yearBuilt)) ghlRecord.year_built = formData.propertyDescription.yearBuilt;
    if (includeIfProvided(formData.propertyDescription?.landSize)) ghlRecord.land_size = formData.propertyDescription.landSize;
    if (includeIfProvided(formData.propertyDescription?.buildSize)) ghlRecord.build_size = formData.propertyDescription.buildSize;
    if (includeIfProvided(formData.propertyDescription?.title)) ghlRecord.title = formData.propertyDescription.title;
    if (includeIfProvided(formData.propertyDescription?.bodyCorpPerQuarter)) ghlRecord.body_corp__per_quarter = formData.propertyDescription.bodyCorpPerQuarter;
    if (includeIfProvided(formData.propertyDescription?.bodyCorpDescription)) ghlRecord.body_corp_description = formData.propertyDescription.bodyCorpDescription;
    if (includeIfProvided(formData.propertyDescription?.doesThisPropertyHave2Dwellings)) ghlRecord.does_this_property_have_2_dwellings = formData.propertyDescription.doesThisPropertyHave2Dwellings;
    if (includeIfProvided(formData.propertyDescription?.singleOrDualOccupancy)) ghlRecord.single_or_dual_occupancy = formData.propertyDescription.singleOrDualOccupancy;
    if (includeIfProvided(formData.propertyDescription?.landRegistration)) ghlRecord.land_registration = formData.propertyDescription.landRegistration;
    if (includeIfProvided(formData.propertyDescription?.propertyDescriptionAdditionalDialogue)) ghlRecord.property_description_additional_dialogue = formData.propertyDescription.propertyDescriptionAdditionalDialogue;

    // Purchase Price
    if (includeIfProvided(formData.purchasePrice?.asking)) ghlRecord.asking = formData.purchasePrice.asking;
    if (includeIfProvided(formData.purchasePrice?.askingText)) ghlRecord.asking_text = formData.purchasePrice.askingText;
    if (includeIfProvided(formData.purchasePrice?.acceptableAcquisitionFrom)) ghlRecord.acceptable_acquisition__from = formData.purchasePrice.acceptableAcquisitionFrom;
    if (includeIfProvided(formData.purchasePrice?.acceptableAcquisitionTo)) ghlRecord.acceptable_acquisition__to = formData.purchasePrice.acceptableAcquisitionTo;
    if (includeIfProvided(formData.purchasePrice?.comparableSales)) ghlRecord.comparable_sales = formData.purchasePrice.comparableSales;
    if (includeIfProvided(formData.purchasePrice?.landPrice)) ghlRecord.land_price = formData.purchasePrice.landPrice;
    if (includeIfProvided(formData.purchasePrice?.buildPrice)) ghlRecord.build_price = formData.purchasePrice.buildPrice;
    if (includeIfProvided(calculatedTotalPrice)) ghlRecord.total_price = calculatedTotalPrice;
    if (netPrice !== null) ghlRecord.net_price = netPrice;
    if (includeIfProvided(formData.purchasePrice?.cashbackRebateValue)) ghlRecord.cashback_rebate_value = formData.purchasePrice.cashbackRebateValue;
    if (includeIfProvided(formData.purchasePrice?.cashbackRebateType)) ghlRecord.cashback_rebate_type = formData.purchasePrice.cashbackRebateType;
    if (includeIfProvided(formData.purchasePrice?.purchasePriceAdditionalDialogue)) ghlRecord.purchase_price_additional_dialogue = formData.purchasePrice.purchasePriceAdditionalDialogue;

    // Rental Assessment
    if (includeIfProvided(formData.rentalAssessment?.occupancy)) ghlRecord.occupancy = formData.rentalAssessment.occupancy;
    if (includeIfProvided(formData.rentalAssessment?.occupancyPrimary)) ghlRecord.occupancy_primary = formData.rentalAssessment.occupancyPrimary;
    if (includeIfProvided(formData.rentalAssessment?.occupancySecondary)) ghlRecord.occupancy_secondary = formData.rentalAssessment.occupancySecondary;
    if (includeIfProvided(formData.rentalAssessment?.currentRentPrimary)) ghlRecord.current_rent_primary__per_week = formData.rentalAssessment.currentRentPrimary;
    if (includeIfProvided(formData.rentalAssessment?.currentRentSecondary)) ghlRecord.current_rent_secondary__per_week = formData.rentalAssessment.currentRentSecondary;
    if (includeIfProvided(formData.rentalAssessment?.expiryPrimary)) ghlRecord.expiry_primary = formData.rentalAssessment.expiryPrimary;
    if (includeIfProvided(formData.rentalAssessment?.expirySecondary)) ghlRecord.expiry_secondary = formData.rentalAssessment.expirySecondary;
    if (includeIfProvided(formData.rentalAssessment?.rentAppraisalPrimaryFrom)) ghlRecord.rent_appraisal_primary_from = formData.rentalAssessment.rentAppraisalPrimaryFrom;
    if (includeIfProvided(formData.rentalAssessment?.rentAppraisalPrimaryTo)) ghlRecord.rent_appraisal_primary_to = formData.rentalAssessment.rentAppraisalPrimaryTo;
    if (includeIfProvided(formData.rentalAssessment?.rentAppraisalSecondaryFrom)) ghlRecord.rent_appraisal_secondary_from = formData.rentalAssessment.rentAppraisalSecondaryFrom;
    if (includeIfProvided(formData.rentalAssessment?.rentAppraisalSecondaryTo)) ghlRecord.rent_appraisal_secondary_to = formData.rentalAssessment.rentAppraisalSecondaryTo;
    if (includeIfProvided(formData.rentalAssessment?.yield)) ghlRecord.yield = formData.rentalAssessment.yield;
    if (includeIfProvided(formData.rentalAssessment?.appraisedYield)) ghlRecord.appraised_yield = formData.rentalAssessment.appraisedYield;
    if (includeIfProvided(formData.rentalAssessment?.rentalAssessmentAdditionalDialogue)) ghlRecord.rental_assessment_additional_dialogue = formData.rentalAssessment.rentalAssessmentAdditionalDialogue;

    // Content Sections
    if (includeIfProvided(formData.contentSections?.whyThisProperty)) ghlRecord.why_this_property = formData.contentSections.whyThisProperty;
    if (includeIfProvided(formData.contentSections?.proximity)) ghlRecord.proximity = formData.contentSections.proximity;
    if (includeIfProvided(formData.contentSections?.investmentHighlights)) ghlRecord.investment_highlights = formData.contentSections.investmentHighlights;

    // Agent Info
    if (includeIfProvided(formData.sellingAgentName)) ghlRecord.agent_name = formData.sellingAgentName;
    if (includeIfProvided(formData.sellingAgentEmail)) ghlRecord.agent_email = formData.sellingAgentEmail;
    if (includeIfProvided(formData.sellingAgentMobile)) ghlRecord.agent_mobile = formData.sellingAgentMobile;
    if (includeIfProvided(formData.messageForBA)) ghlRecord.message_for_ba = formData.messageForBA;
    if (includeIfProvided(formData.attachmentsAdditionalDialogue)) ghlRecord.attachments_additional_dialogue = formData.attachmentsAdditionalDialogue;
    if (includeIfProvided(formData.folderLink)) ghlRecord.folder_link = formData.folderLink;
    
    // Insurance, Depreciation, and Council/Water Rates (for edit mode - only send if provided)
    // GHL custom field: cf_insurance_value_ (display name: "CF Insurance Value $")
    if (includeIfProvided(formData.insurance)) ghlRecord.cf_insurance_value_ = formData.insurance;
    // GHL custom field: cf_councilwater_rates_ (display name: "CF Council/Water Rates $")
    if (includeIfProvided(formData.councilWaterRates)) ghlRecord.cf_councilwater_rates_ = formData.councilWaterRates;
    
    // Depreciation - store as comma-separated values
    // GHL custom field: cf_depreciation_ (display name: "CF Depreciation")
    // Format: "year1,year2,year3,...,year10" (e.g., "12345,11234,10123,9012,8012,7012,6012,5012,4012,3012")
    if (formData.depreciation && typeof formData.depreciation === 'object') {
      const depObj = formData.depreciation;
      const hasValues = Object.values(depObj).some(val => val != null && val !== '');
      if (hasValues) {
        // Store as comma-separated values (simpler, more readable in GHL)
        const values: string[] = [];
        for (let year = 1; year <= 10; year++) {
          const yearValue = depObj[`year${year}`];
          values.push(yearValue != null && yearValue !== '' ? String(yearValue) : '');
        }
        // Only include non-empty values at the end (trim trailing empty values)
        while (values.length > 0 && values[values.length - 1] === '') {
          values.pop();
        }
        if (values.length > 0) {
          ghlRecord.cf_depreciation_ = values.join(',');
        }
      }
    }

    // Call GHL API to update custom object record
    // Use the validated locationIdString (already validated above)
    // GHL API requires locationId as query parameter (same as GET request)
    // IMPORTANT: GHL PUT expects fields to be nested under "properties" key
    // (unlike POST which accepts fields at root level)
    console.log('[PUT /api/properties] Updating record with locationId:', locationIdString);
    console.log('[PUT /api/properties] GHL_OBJECT_ID:', GHL_OBJECT_ID);
    console.log('[PUT /api/properties] recordId:', recordId);
    
    const url = `${GHL_BASE_URL}/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${encodeURIComponent(locationIdString)}`;
    
    // Wrap fields in "properties" object for PUT request (GHL API requirement)
    const requestBody = {
      properties: ghlRecord,
    };
    
    const response = await fetch(
      url,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${GHL_BEARER_TOKEN}`,
          'Version': GHL_API_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
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
