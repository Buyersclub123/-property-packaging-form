// Make.com Code Module - Parse Stashproperty Planning Info Response
// This module extracts planning and risk overlay data from Stashproperty API response
// Input is automatically provided by Make.com

// Get the API response (from HTTP module)
// Module 1 returns an array: [{data: {...}, headers: {...}}]
// OR merged response: {planningInfo: {...}, propertyDetails: {...}}
const apiResponse = input.Data || input;

// Handle merged response (planning-info + property-details)
let planningData = null;
let propertyDetails = null;

if (!apiResponse) {
  console.log("Stashproperty Parser - No API response received");
} else if (apiResponse.planningInfo || apiResponse.propertyDetails) {
  // Merged response structure: {planningInfo: {...}, propertyDetails: {...}}
  console.log("Stashproperty Parser - Detected merged response structure");
  planningData = apiResponse.planningInfo || {};
  propertyDetails = apiResponse.propertyDetails || {};
  // Merge property details into planning data for easier extraction
  if (propertyDetails && Object.keys(propertyDetails).length > 0) {
    planningData = { ...planningData, ...propertyDetails };
  }
} else if (Array.isArray(apiResponse) && apiResponse.length > 0) {
  const firstItem = apiResponse[0];
  if (firstItem && firstItem.data && Array.isArray(firstItem.data) && firstItem.data.length > 0) {
    planningData = firstItem.data[0];
  } else if (firstItem && (firstItem.zone || firstItem.hazards)) {
    // Sometimes data might be directly in the first item
    planningData = firstItem;
  }
} else if (apiResponse.data && Array.isArray(apiResponse.data) && apiResponse.data.length > 0) {
  planningData = apiResponse.data[0];
} else if (apiResponse.zone || apiResponse.hazards || apiResponse.attributes) {
  // Direct object (could be planning-info OR property-details)
  planningData = apiResponse;
}

if (!planningData) {
  console.log("Stashproperty Parser - No planning data found in response:", JSON.stringify(apiResponse, null, 2));
  return {
    error: true,
    errorMessage: "No planning data found in Stashproperty API response",
    rawResponse: apiResponse
  };
}

// Extract fields
const hazards = planningData.hazards || {};
const heritage = planningData.heritage || {};
const biodiversity = planningData.biodiversity || {};
const lotSize = planningData.lotSize || {};
const links = Array.isArray(planningData.links) ? planningData.links : [];

// Property info might be in different locations - check all possibilities
const property = planningData.property || planningData.propertyInfo || planningData.propertyDetails || {};
const propertyData = planningData.propertyData || planningData.details || {};
const attributes = planningData.attributes || {}; // Nexu API structure: attributes.bedrooms, attributes.bathrooms, attributes.parkingSpaces

// Also check propertyDetails if it was merged separately
if (propertyDetails) {
  const pdAttributes = propertyDetails.attributes || {};
  const pdProperty = propertyDetails.property || {};
  // Merge property details attributes if they exist
  if (pdAttributes.bedrooms || pdAttributes.bathrooms || pdAttributes.parkingSpaces) {
    Object.assign(attributes, pdAttributes);
  }
  // Merge property details top-level fields
  if (propertyDetails.landArea || propertyDetails.yearBuilt || propertyDetails.buildingArea) {
    Object.assign(planningData, {
      landArea: propertyDetails.landArea || planningData.landArea,
      yearBuilt: propertyDetails.yearBuilt || planningData.yearBuilt,
      buildingArea: propertyDetails.buildingArea || planningData.buildingArea
    });
  }
}

// Log what we find for debugging
console.log("Stashproperty Parser - Checking for property info:");
console.log("  planningData.property:", planningData.property ? "exists" : "missing");
console.log("  planningData.propertyInfo:", planningData.propertyInfo ? "exists" : "missing");
console.log("  planningData.attributes:", planningData.attributes ? "exists" : "missing");
console.log("  planningData.bedrooms:", planningData.bedrooms ? planningData.bedrooms : "missing");
console.log("  planningData.bathrooms:", planningData.bathrooms ? planningData.bathrooms : "missing");
console.log("  planningData.carSpaces:", planningData.carSpaces ? planningData.carSpaces : "missing");
console.log("  attributes.bedrooms:", attributes.bedrooms ? attributes.bedrooms : "missing");
console.log("  attributes.parkingSpaces:", attributes.parkingSpaces ? attributes.parkingSpaces : "missing");
console.log("  planningData.landArea:", planningData.landArea ? planningData.landArea : "missing");
console.log("  planningData.yearBuilt:", planningData.yearBuilt ? planningData.yearBuilt : "missing");
console.log("  All planningData keys:", Object.keys(planningData).slice(0, 20));

// Helper function to format risk values
function formatRisk(riskValue, riskText) {
  // If text says "not available", return empty string (don't convert to Yes/No)
  if (riskText && riskText.toLowerCase().includes('not available')) {
    return '';
  }
  
  if (riskValue === undefined || riskValue === null) {
    // Fall back to text
    if (!riskText || riskText.toLowerCase().includes('no') || riskText.toLowerCase().includes('none')) {
      return 'No';
    }
    return 'Yes';
  }
  
  // Risk is numeric (0 = No, >0 = Yes)
  if (riskValue === 0) {
    return 'No';
  }
  if (riskValue > 0) {
    return 'Yes';
  }
  
  return 'No';
}

// Format zoning
const zoningCode = planningData.zone || '';
const zoningDesc = planningData.zoneDesc || '';
const zoning = zoningCode && zoningDesc 
  ? `${zoningCode} (${zoningDesc})`
  : zoningCode || zoningDesc || '';

// Extract risk overlays
const floodRisk = formatRisk(hazards.floodingRisk, hazards.flooding);
const bushfireRisk = formatRisk(hazards.bushfireRisk, hazards.bushfire);
const heritageRisk = formatRisk(hazards.heritageRisk, heritage.heritage);
const biodiversityRisk = formatRisk(hazards.biodiversityRisk, biodiversity.Biodiversity);

// Extract other fields
const lga = planningData.lga || '';
const state = planningData.state || '';
const lgaPid = planningData.lgaPid || '';

// Extract planning links
const planningLinks = links
  .filter(link => link.type === 'instrument' || link.type === 'council_info')
  .map(link => link.title && link.url ? `${link.title} - ${link.url}` : (link.url || link.title || ''))
  .filter(Boolean);

// Return formatted data
return {
  // Zoning
  zone: zoningCode,
  zoneDesc: zoningDesc,
  zoning: zoning,
  
  // Location
  lga: lga,
  state: state,
  lgaPid: lgaPid,
  
  // Risk Overlays
  floodRisk: floodRisk,
  floodingRisk: floodRisk, // Alias for compatibility
  flooding: hazards.flooding || '',
  bushfireRisk: bushfireRisk,
  bushfire: hazards.bushfire || '',
  heritageRisk: heritageRisk,
  heritage: heritage.heritage || '',
  biodiversityRisk: biodiversityRisk,
  biodiversity: biodiversity.Biodiversity || '',
  
  // Risk values (numeric)
  floodingRiskValue: hazards.floodingRisk || 0,
  bushfireRiskValue: hazards.bushfireRisk || 0,
  heritageRiskValue: hazards.heritageRisk || 0,
  biodiversityRiskValue: hazards.biodiversityRisk || 0,
  
  // Lot size
  lotSizeMin: lotSize.minMulti || lotSize.minText || '',
  lotSizeAvg: lotSize.avgText || '',
  
  // Property Info (beds, bath, car, land size, year built, title)
  // Check multiple possible locations and field names
  // Priority: attributes.* (Nexu API) > top-level > property.* > propertyData.*
  bedrooms: attributes.bedrooms || attributes.bed || 
            planningData.bedrooms || planningData.beds || planningData.bedroomCount || 
            property.bedrooms || property.beds || property.bedroomCount ||
            propertyData.bedrooms || propertyData.beds || '',
  bathrooms: attributes.bathrooms || attributes.bath ||
             planningData.bathrooms || planningData.baths || planningData.bathroomCount ||
             property.bathrooms || property.baths || property.bathroomCount ||
             propertyData.bathrooms || propertyData.baths || '',
  carSpaces: attributes.parkingSpaces || attributes.carSpaces || attributes.car || attributes.garage ||
             planningData.carSpaces || planningData.car || planningData.garage || planningData.carport ||
             property.carSpaces || property.car || property.garage || property.carport ||
             propertyData.carSpaces || propertyData.car || propertyData.garage || '',
  landSize: planningData.landArea || planningData.landSize || planningData.lotSize || 
            lotSize.avgText || lotSize.minText || lotSize.avgMulti || lotSize.minMulti ||
            property.landSize || property.lotSize || property.landArea ||
            propertyData.landSize || propertyData.lotSize || '',
  yearBuilt: planningData.yearBuilt || planningData.year || planningData.yearOfConstruction ||
             property.yearBuilt || property.year || property.yearOfConstruction ||
             propertyData.yearBuilt || propertyData.year || '',
  title: planningData.title || planningData.titleType || planningData.titleTypeDesc ||
         property.title || property.titleType ||
         propertyData.title || propertyData.titleType || '',
  
  // Links
  planningLinks: planningLinks,
  planningLink1: planningLinks[0] || '',
  planningLink2: planningLinks[1] || '',
  
  // Raw data for reference
  rawStashData: planningData,
  rawHazards: hazards,
  rawSources: hazards.sources || []
};

