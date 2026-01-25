// Make.com Code Module 6 - Webhook Data Preprocessor
// Handles both portal requests and normal GHL webhook requests

// DEBUG: Check what Module 6 receives
console.log("=== MODULE 6 DEBUG ===");
console.log("Input keys:", Object.keys(input));
console.log("Has Module13_Data?", !!input.Module13_Data);
console.log("Has Data?", !!input.Data);
console.log("Has record?", !!input.record);
console.log("Has data.record?", !!input.data?.record);
console.log("Is portal request?", input.data?.source === "portal" || input.source === "portal");
console.log("Full input structure (first level):", JSON.stringify(Object.keys(input).reduce((obj, key) => { 
  const val = input[key]; 
  if (typeof val === 'object' && val !== null) {
    obj[key] = Array.isArray(val) ? `[Array(${val.length})]` : `{keys: ${Object.keys(val).slice(0, 5).join(', ')}}`;
  } else {
    obj[key] = typeof val;
  }
  return obj;
}, {}), null, 2));
console.log("======================");

// Step 2: Preprocess webhook data (like Zapier Step 2)
// Module 6 receives input from Module 16 (which processed Module 13's output)
// For portal requests, Module 6 needs BOTH:
// 1. Module 13's GHL property data (via Input Variable "Module13_Data" mapped to Module 13)
// 2. Module 1's webhook data (via Input Variable "Webhook_Data" mapped to Module 1)

// Get webhook data from Module 1 (via Input Variable)
const webhookDataFromModule1 = input.Webhook_Data || input.Module1_Data || (Array.isArray(input) ? input[0] : input);

// Extract portal webhook data
const inputData = webhookDataFromModule1.Data || webhookDataFromModule1.data || webhookDataFromModule1;

// Check if this is a portal request
const isPortalRequest = inputData.source === "portal";

if (isPortalRequest) {
    // Get Record module (13) has already fetched the GHL property data
    // Module 13 outputs: { record: { properties: { ... } } }
    // In Make.com, Module 13's output is accessed via input.Module13_Data or input.Data
    // We need to extract the properties and merge with portal webhook data
    
    // Extract GHL property data from Module 13
    // Module 6 receives input from Module 16, but we need Module 13's record data
    // Use Input Variable "Module13_Data" mapped to Module 13 to get the GHL record
    let ghlProperties = {};
    
    // PRIORITY 1: Input Variable "Module13_Data" mapped to Module 13
    // Module 13's HTTP response structure: { data: { record: { properties: { ... } } } }
    if (input.Module13_Data && input.Module13_Data.data && input.Module13_Data.data.record && input.Module13_Data.data.record.properties) {
        // Module 13 output via Input Variable Module13_Data.data.record.properties
        console.log("Module 6 Portal - Found via Input Variable Module13_Data.data.record.properties");
        ghlProperties = input.Module13_Data.data.record.properties;
    }
    // PRIORITY 1b: Fallback - check if Module13_Data has record directly (older structure)
    else if (input.Module13_Data && input.Module13_Data.record && input.Module13_Data.record.properties) {
        console.log("Module 6 Portal - Found via Input Variable Module13_Data.record.properties (fallback)");
        ghlProperties = input.Module13_Data.record.properties;
    } 
    // PRIORITY 2: Check if Module 16 passed through Module 13's data
    else if (input.record && input.record.properties) {
        // Module 16 passed through Module 13's record structure
        console.log("Module 6 Portal - Found via input.record.properties (from Module 16)");
        ghlProperties = input.record.properties;
    } 
    // PRIORITY 3: Other possible structures
    else if (input.Data && input.Data.record && input.Data.record.properties) {
        console.log("Module 6 Portal - Found via Data.record.properties");
        ghlProperties = input.Data.record.properties;
    } else if (input.data && input.data.record && input.data.record.properties) {
        console.log("Module 6 Portal - Found via data.record.properties");
        ghlProperties = input.data.record.properties;
    } else if (input.properties) {
        // Already flattened properties
        console.log("Module 6 Portal - Found via properties (flattened)");
        ghlProperties = input.properties;
    } else if (input.Properties) {
        console.log("Module 6 Portal - Found via Properties");
        ghlProperties = input.Properties;
    } else {
        // Last resort: check if input itself IS the record
        if (input.why_this_property || input.property_address) {
            console.log("Module 6 Portal - Input itself contains properties (direct)");
            ghlProperties = input;
        } else {
            console.log("Module 6 Portal - WARNING: No GHL properties found!");
            console.log("Module 6 Portal - Available keys:", Object.keys(input));
            console.log("Module 6 Portal - TIP: Add Input Variable 'Module13_Data' mapped to Module 13");
        }
    }
    
    console.log("Module 6 Portal - GHL properties keys:", Object.keys(ghlProperties).slice(0, 20));
    console.log("Module 6 Portal - Sample property:", {
        why_this_property: ghlProperties.why_this_property ? "exists" : "missing",
        property_address: ghlProperties.property_address ? "exists" : "missing",
        beds_primary: ghlProperties.beds_primary ? "exists" : "missing"
    });
    
    // Merge portal webhook data with GHL property data
    // GHL property fields first, then portal webhook data (portal data overwrites if conflicts)
    const merged = {
        ...ghlProperties,  // GHL property fields first
        ...inputData,      // Portal webhook data (overwrites if conflicts)
        source: "portal"
    };
    
    console.log("Module 6 Portal - Merged keys:", Object.keys(merged).slice(0, 30));
    console.log("Module 6 Portal - Merged sample:", {
        why_this_property: merged.why_this_property ? "exists" : "missing",
        property_address: merged.property_address ? "exists" : "missing",
        sendFromEmail: merged.sendFromEmail || "missing"
    });
    
    return merged;
}

// Normal GHL webhook data - continue with existing code
console.log("Module 6 inputData keys:", Object.keys(inputData));
console.log("Module 6 inputData sample:", JSON.stringify(Object.keys(inputData).slice(0, 10).reduce((obj, key) => { obj[key] = inputData[key]; return obj; }, {}), null, 2));

// Get ID from various possible locations
const idValue = inputData.ID || inputData.id || inputData['ID'] || '';

// Get the data - in Make.com it comes as object, convert to string format
const dataObj = inputData;

// Build formatted data string (key: value format)
const formattedData = [];

// Add ID first if we have it
if (idValue && !formattedData.some(line => line.startsWith('ID:'))) {
  formattedData.push(`ID: ${idValue}`);
}

// Convert object to key: value string format
Object.keys(dataObj).forEach(key => {
  if (key !== 'ID' && key !== 'id') {
    const value = dataObj[key];
    if (value !== undefined && value !== null) {
      formattedData.push(`${key}: ${value}`);
    }
  }
});

console.log("Module 6 output:", JSON.stringify({ data: formattedData.join('\n') }, null, 2));

return {
  data: formattedData.join('\n')
};

