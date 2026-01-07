const XLSX = require('xlsx');
const path = require('path');

// Read the analysis file
const analysisPath = 'C:/Users/User/.cursor/JT FOLDER/FIELD-ANALYSIS.xlsx';
const analysisWorkbook = XLSX.readFile(analysisPath);
const completeStructureSheet = analysisWorkbook.Sheets['Complete Structure'];
const completeStructureData = XLSX.utils.sheet_to_json(completeStructureSheet);

// Organize fields by category and determine destinations
const fieldMatrix = [];

// Helper to determine if field goes to email
const isEmailField = (field) => {
  const emailKeywords = [
    'AdditionalDialogue', 'comparableSales', 'whyThisProperty', 'proximity', 
    'investmentHighlights', 'bodyCorpDescription', 'projectBrief', 'googleMap',
    'propertyAddress', 'projectAddress', 'projectName', 'suburbName', 'state', 'postCode',
    'zoning', 'flood', 'floodDialogue', 'bushfire', 'bushfireDialogue', 'mining', 'miningDialogue',
    'otherOverlay', 'otherOverlayDialogue', 'specialInfrastructure', 'specialInfrastructureDialogue',
    'bedsPrimary', 'bedsSecondary', 'bathPrimary', 'bathSecondary', 'garagePrimary', 'garageSecondary',
    'carspacePrimary', 'carspaceSecondary', 'carportPrimary', 'carportSecondary', 'yearBuilt',
    'landRegistration', 'landSize', 'buildSize', 'buildSizePrimary', 'buildSizeSecondary', 'title',
    'bodyCorpPerQuarter', 'projectOverview', 'asking', 'askingText', 'landPrice', 'buildPrice',
    'totalPrice', 'cashbackRebateValue', 'cashbackRebateType', 'occupancy', 'currentRentPrimary',
    'currentRentSecondary', 'expiryPrimary', 'expirySecondary', 'rentAppraisalPrimaryFrom',
    'rentAppraisalPrimaryTo', 'rentAppraisalSecondaryFrom', 'rentAppraisalSecondaryTo', 'yield',
    'appraisedYield', 'rentDialoguePrimary', 'rentDialogueSecondary', 'medianPriceChange3Months',
    'medianPriceChange1Year', 'medianPriceChange3Year', 'medianPriceChange5Year', 'medianYield',
    'medianRentChange1Year', 'rentalPopulation', 'vacancyRate', 'agentName', 'agentMobile', 'agentEmail',
    'lots'
  ];
  return emailKeywords.some(kw => field.includes(kw));
};

// Helper to determine if field goes to Deal Sheet
const isDealSheetField = (field) => {
  const excludeKeywords = ['isSaved', 'isVerified', 'daysSinceLastCheck', 'addressFieldsEditable', 'addressVerified'];
  return !excludeKeywords.some(kw => field.includes(kw)) && !field.includes('Field') && !field.includes('Value') && !field.includes('dataType');
};

// Helper to determine if field goes to GHL
const isGHLField = (field) => {
  const excludeKeywords = ['AdditionalDialogue', 'googleMap', 'latitude', 'longitude', 'isSaved', 'isVerified', 'daysSinceLastCheck', 'addressFieldsEditable', 'addressVerified'];
  return !excludeKeywords.some(kw => field.includes(kw)) && !field.includes('Field') && !field.includes('Value') && !field.includes('dataType');
};

// Helper to determine property type
const getPropertyType = (field) => {
  if (field.includes('project') || field.includes('projectOverview') || field.includes('projectBrief') || field.includes('lots[')) {
    return 'Project';
  }
  if (field.includes('dual') || field.includes('Secondary') || field.includes('buildSizePrimary') || field.includes('buildSizeSecondary')) {
    return 'H&L';
  }
  if (field.includes('yearBuilt')) {
    return 'Established';
  }
  return 'All';
};

// Helper to determine category
const getCategory = (field) => {
  if (field.includes('packager') || field.includes('sourcer') || field.includes('sellingAgent') || field.includes('status') || field.includes('dealType') || field.includes('reviewDate')) {
    return 'Package Information';
  }
  if (field.includes('propertyType') || field.includes('contractType') || field.includes('lotType') || field.includes('dualOccupancy')) {
    return 'Decision Tree';
  }
  if (field.includes('address') || field.includes('suburb') || field.includes('state') || field.includes('postCode') || field.includes('lga') || field.includes('googleMap') || field.includes('projectAddress') || field.includes('projectName')) {
    return 'Address & Location';
  }
  if (field.includes('zoning') || field.includes('flood') || field.includes('bushfire') || field.includes('mining') || field.includes('otherOverlay') || field.includes('specialInfrastructure') || field.includes('dueDiligence')) {
    return 'Risk Overlays';
  }
  if (field.includes('beds') || field.includes('bath') || field.includes('garage') || field.includes('carspace') || field.includes('carport') || field.includes('yearBuilt') || field.includes('landSize') || field.includes('buildSize') || field.includes('title') || field.includes('bodyCorp') || field.includes('projectOverview')) {
    return 'Property Description';
  }
  if (field.includes('asking') || field.includes('comparableSales') || field.includes('landPrice') || field.includes('buildPrice') || field.includes('totalPrice') || field.includes('cashback') || field.includes('rebate') || field.includes('acceptableAcquisition')) {
    return 'Purchase Price';
  }
  if (field.includes('occupancy') || field.includes('currentRent') || field.includes('expiry') || field.includes('rentAppraisal') || field.includes('yield') || field.includes('rentDialogue')) {
    return 'Rental Assessment';
  }
  if (field.includes('medianPriceChange') || field.includes('medianYield') || field.includes('medianRentChange') || field.includes('rentalPopulation') || field.includes('vacancyRate')) {
    return 'Market Performance';
  }
  if (field.includes('whyThisProperty') || field.includes('proximity') || field.includes('investmentHighlights')) {
    return 'Content Sections';
  }
  if (field.includes('lots[') || field.includes('lotNumber') || field.includes('singleOrDual')) {
    return 'Project-Specific (Lots)';
  }
  if (field.includes('agentName') || field.includes('agentMobile') || field.includes('agentEmail')) {
    return 'Agent Information';
  }
  if (field.includes('messageForBA') || field.includes('pushRecordToDealSheet') || field.includes('attachmentsAdditionalDialogue')) {
    return 'Internal/Administrative';
  }
  return 'Other';
};

// Process all fields
const processedFields = new Set();
completeStructureData.forEach(row => {
  const fieldPath = row['Field Path'];
  
  // Skip metadata/audit fields
  if (fieldPath === 'Field' || fieldPath === 'Value' || fieldPath === 'fieldPath' || fieldPath === 'dataType' || fieldPath === 'lotIndex') {
    return;
  }
  
  // Skip if already processed
  if (processedFields.has(fieldPath)) {
    return;
  }
  processedFields.add(fieldPath);
  
  // Find which files contain this field
  const inFiles = [];
  const sheets = [];
  completeStructureData.forEach(r => {
    if (r['Field Path'] === fieldPath) {
      if (!inFiles.includes(r['File'])) inFiles.push(r['File']);
      if (!sheets.includes(r['Sheet'])) sheets.push(r['Sheet']);
    }
  });
  
  const email = isEmailField(fieldPath) ? 'Yes' : 'No';
  const dealSheet = isDealSheetField(fieldPath) ? 'Yes' : 'No';
  const ghl = isGHLField(fieldPath) ? 'Yes' : 'No';
  const propertyType = getPropertyType(fieldPath);
  const category = getCategory(fieldPath);
  
  // Determine if field appears "exactly as typed" in email
  const exactTextInEmail = fieldPath.includes('AdditionalDialogue') || 
                           fieldPath.includes('comparableSales') || 
                           fieldPath.includes('bodyCorpDescription') || 
                           fieldPath.includes('projectBrief') ||
                           fieldPath.includes('whyThisProperty') ||
                           fieldPath.includes('proximity') ||
                           fieldPath.includes('investmentHighlights') ? 'Yes' : 'No';
  
  fieldMatrix.push({
    'Field Path': fieldPath,
    'Category': category,
    'Property Type': propertyType,
    'Email': email,
    'Deal Sheet': dealSheet,
    'GHL': ghl,
    'Exact Text in Email': exactTextInEmail,
    'Found in Files': inFiles.length,
    'Sheets': sheets.join(', '),
    'Sample Value': (row['Sample Value'] || '').substring(0, 150)
  });
});

// Sort by category, then by field path
fieldMatrix.sort((a, b) => {
  if (a['Category'] !== b['Category']) {
    return a['Category'].localeCompare(b['Category']);
  }
  return a['Field Path'].localeCompare(b['Field Path']);
});

// Create workbook
const workbook = XLSX.utils.book_new();

// Sheet 1: Complete Field Mapping Matrix
const matrixSheet = XLSX.utils.json_to_sheet(fieldMatrix);
XLSX.utils.book_append_sheet(workbook, matrixSheet, 'Field Mapping Matrix');

// Sheet 2: Fields Missing from Original Matrix
const missingFields = fieldMatrix.filter(f => {
  // These are internal/metadata fields that shouldn't be in the matrix
  const internalFields = ['addressFieldsEditable', 'addressVerified', 'isSaved', 'isVerified', 'daysSinceLastCheck'];
  return !internalFields.some(ifield => f['Field Path'].includes(ifield));
});
const missingSheet = XLSX.utils.json_to_sheet(missingFields);
XLSX.utils.book_append_sheet(workbook, missingSheet, 'All Fields Found');

// Sheet 3: Summary by Category
const categorySummary = {};
fieldMatrix.forEach(field => {
  const cat = field['Category'];
  if (!categorySummary[cat]) {
    categorySummary[cat] = { total: 0, email: 0, dealSheet: 0, ghl: 0 };
  }
  categorySummary[cat].total++;
  if (field['Email'] === 'Yes') categorySummary[cat].email++;
  if (field['Deal Sheet'] === 'Yes') categorySummary[cat].dealSheet++;
  if (field['GHL'] === 'Yes') categorySummary[cat].ghl++;
});

const categoryArray = Object.entries(categorySummary).map(([cat, stats]) => ({
  'Category': cat,
  'Total Fields': stats.total,
  'Email Fields': stats.email,
  'Deal Sheet Fields': stats.dealSheet,
  'GHL Fields': stats.ghl
}));
const categorySheet = XLSX.utils.json_to_sheet(categoryArray.sort((a, b) => a['Category'].localeCompare(b['Category'])));
XLSX.utils.book_append_sheet(workbook, categorySheet, 'Summary by Category');

// Sheet 4: Summary by Property Type
const propertyTypeSummary = {};
fieldMatrix.forEach(field => {
  const pt = field['Property Type'];
  if (!propertyTypeSummary[pt]) {
    propertyTypeSummary[pt] = { total: 0, email: 0, dealSheet: 0, ghl: 0 };
  }
  propertyTypeSummary[pt].total++;
  if (field['Email'] === 'Yes') propertyTypeSummary[pt].email++;
  if (field['Deal Sheet'] === 'Yes') propertyTypeSummary[pt].dealSheet++;
  if (field['GHL'] === 'Yes') propertyTypeSummary[pt].ghl++;
});

const propertyTypeArray = Object.entries(propertyTypeSummary).map(([pt, stats]) => ({
  'Property Type': pt,
  'Total Fields': stats.total,
  'Email Fields': stats.email,
  'Deal Sheet Fields': stats.dealSheet,
  'GHL Fields': stats.ghl
}));
const propertyTypeSheet = XLSX.utils.json_to_sheet(propertyTypeArray);
XLSX.utils.book_append_sheet(workbook, propertyTypeSheet, 'Summary by Property Type');

// Sheet 5: Fields Needing GHL Creation
const ghlFields = fieldMatrix.filter(f => f['GHL'] === 'Yes' && f['Deal Sheet'] === 'Yes');
const ghlArray = ghlFields.map(f => ({
  'Field Path': f['Field Path'],
  'Category': f['Category'],
  'Property Type': f['Property Type'],
  'Priority': f['Category'] === 'Package Information' ? 'HIGH' : 
              (f['Category'] === 'Decision Tree' ? 'HIGH' : 
              (f['Category'] === 'Address & Location' ? 'HIGH' : 'MEDIUM'))
}));
const ghlSheet = XLSX.utils.json_to_sheet(ghlArray.sort((a, b) => {
  const priorityOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
  if (priorityOrder[a['Priority']] !== priorityOrder[b['Priority']]) {
    return priorityOrder[a['Priority']] - priorityOrder[b['Priority']];
  }
  return a['Field Path'].localeCompare(b['Field Path']);
}));
XLSX.utils.book_append_sheet(workbook, ghlSheet, 'Fields for GHL');

// Write the file
const outputPath = path.join('C:/Users/User/.cursor/JT FOLDER', 'FIELD-MAPPING-MATRIX-FINAL.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log(`\n✓ Final matrix saved to: ${outputPath}`);
console.log(`\n=== SUMMARY ===`);
console.log(`Total fields analyzed: ${fieldMatrix.length}`);
console.log(`Fields for Email: ${fieldMatrix.filter(f => f['Email'] === 'Yes').length}`);
console.log(`Fields for Deal Sheet: ${fieldMatrix.filter(f => f['Deal Sheet'] === 'Yes').length}`);
console.log(`Fields for GHL: ${fieldMatrix.filter(f => f['GHL'] === 'Yes').length}`);
console.log(`Fields with exact text in email: ${fieldMatrix.filter(f => f['Exact Text in Email'] === 'Yes').length}`);


