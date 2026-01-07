const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Read the analysis file
const analysisPath = 'C:/Users/User/.cursor/JT FOLDER/FIELD-ANALYSIS.xlsx';
const analysisWorkbook = XLSX.readFile(analysisPath);
const allFieldsSheet = analysisWorkbook.Sheets['All Fields Found'];
const allFieldsData = XLSX.utils.sheet_to_json(allFieldsSheet);

// Read my matrix (from the markdown file)
const matrixFields = new Set([
  // Package Info
  'packager', 'sourcer', 'sellingAgent', 'sellingAgentName', 'sellingAgentEmail', 'sellingAgentMobile', 'status', 'dealType', 'reviewDate',
  // Decision Tree
  'propertyType', 'contractType', 'lotType', 'dualOccupancy',
  // Address
  'propertyAddress', 'projectAddress', 'projectName', 'streetNumber', 'streetName', 'suburbName', 'state', 'postCode', 'lga', 'googleMap', 'latitude', 'longitude', 'unitLotPrimary', 'unitLotSecondary', 'lotNumber',
  // Risk Overlays
  'zoning', 'flood', 'floodDialogue', 'bushfire', 'bushfireDialogue', 'mining', 'miningDialogue', 'otherOverlay', 'otherOverlayDialogue', 'specialInfrastructure', 'specialInfrastructureDialogue', 'dueDiligenceAcceptance',
  // Property Description
  'bedsPrimary', 'bedsSecondary', 'bathPrimary', 'bathSecondary', 'garagePrimary', 'garageSecondary', 'carspacePrimary', 'carspaceSecondary', 'carportPrimary', 'carportSecondary', 'yearBuilt', 'landRegistration', 'landSize', 'buildSize', 'buildSizePrimary', 'buildSizeSecondary', 'title', 'bodyCorpPerQuarter', 'bodyCorpDescription', 'doesThisPropertyHave2Dwellings', 'propertyDescriptionAdditionalDialogue', 'projectOverview',
  // Purchase Price
  'asking', 'askingText', 'comparableSales', 'acceptableAcquisitionFrom', 'acceptableAcquisitionTo', 'landPrice', 'buildPrice', 'totalPrice', 'cashbackRebateValue', 'cashbackRebateType', 'purchasePriceAdditionalDialogue',
  // Rental Assessment
  'occupancy', 'currentRentPrimary', 'currentRentSecondary', 'expiryPrimary', 'expirySecondary', 'rentAppraisalPrimaryFrom', 'rentAppraisalPrimaryTo', 'rentAppraisalSecondaryFrom', 'rentAppraisalSecondaryTo', 'yield', 'appraisedYield', 'rentDialoguePrimary', 'rentDialogueSecondary', 'rentalAssessmentAdditionalDialogue',
  // Market Performance
  'medianPriceChange3Months', 'medianPriceChange1Year', 'medianPriceChange3Year', 'medianPriceChange5Year', 'medianYield', 'medianRentChange1Year', 'rentalPopulation', 'vacancyRate', 'marketPerformanceAdditionalDialogue',
  // Content Sections
  'whyThisProperty', 'proximity', 'investmentHighlights',
  // Agent Info
  'agentName', 'agentMobile', 'agentEmail',
  // Internal
  'attachmentsAdditionalDialogue', 'messageForBA', 'pushRecordToDealSheet'
]);

// Also add nested field paths (from Complete Structure sheet)
const completeStructureSheet = analysisWorkbook.Sheets['Complete Structure'];
const completeStructureData = XLSX.utils.sheet_to_json(completeStructureSheet);
const foundFields = new Set(completeStructureData.map(row => row['Field Path']));

// Create comparison workbook
const comparisonWorkbook = XLSX.utils.book_new();

// Sheet 1: Fields Found in Excel but NOT in Matrix
const missingFromMatrix = [];
foundFields.forEach(field => {
  // Check if field exists in matrix (exact match or as part of nested path)
  const existsInMatrix = Array.from(matrixFields).some(matrixField => {
    // Exact match
    if (field === matrixField) return true;
    // Nested match (e.g., "address.propertyAddress" contains "propertyAddress")
    if (field.includes('.') && field.endsWith('.' + matrixField)) return true;
    if (field.includes('.') && field.includes(matrixField + '.')) return true;
    // Array match (e.g., "lots[0].lotNumber" contains "lotNumber")
    if (field.includes('[') && field.includes(matrixField)) return true;
    return false;
  });
  
  if (!existsInMatrix) {
    // Find which files contain this field
    const inFiles = [];
    completeStructureData.forEach(row => {
      if (row['Field Path'] === field && !inFiles.includes(row['File'])) {
        inFiles.push(row['File']);
      }
    });
    
    missingFromMatrix.push({
      'Field Path': field,
      'Found in Files': inFiles.length,
      'File Names': inFiles.join('; '),
      'Sample Value': completeStructureData.find(r => r['Field Path'] === field)?.['Sample Value'] || ''
    });
  }
});

const missingSheet = XLSX.utils.json_to_sheet(missingFromMatrix.sort((a, b) => a['Field Path'].localeCompare(b['Field Path'])));
XLSX.utils.book_append_sheet(comparisonWorkbook, missingSheet, 'Missing from Matrix');

// Sheet 2: All Fields Comparison
const allComparison = [];
foundFields.forEach(field => {
  const existsInMatrix = Array.from(matrixFields).some(matrixField => {
    if (field === matrixField) return true;
    if (field.includes('.') && field.endsWith('.' + matrixField)) return true;
    if (field.includes('.') && field.includes(matrixField + '.')) return true;
    if (field.includes('[') && field.includes(matrixField)) return true;
    return false;
  });
  
  const inFiles = [];
  const sheets = [];
  completeStructureData.forEach(row => {
    if (row['Field Path'] === field) {
      if (!inFiles.includes(row['File'])) inFiles.push(row['File']);
      if (!sheets.includes(row['Sheet'])) sheets.push(row['Sheet']);
    }
  });
  
  allComparison.push({
    'Field Path': field,
    'In Matrix': existsInMatrix ? 'Yes' : 'No',
    'Found in Files': inFiles.length,
    'Sheets': sheets.join(', '),
    'Sample Value': completeStructureData.find(r => r['Field Path'] === field)?.['Sample Value'] || ''
  });
});

const allComparisonSheet = XLSX.utils.json_to_sheet(allComparison.sort((a, b) => a['Field Path'].localeCompare(b['Field Path'])));
XLSX.utils.book_append_sheet(comparisonWorkbook, allComparisonSheet, 'All Fields Comparison');

// Sheet 3: Field Mapping Matrix (Enhanced)
// Read the complete structure to understand field distribution
const fieldMapping = [];
const fieldCategories = {
  'Package Info': ['packager', 'sourcer', 'sellingAgent', 'status', 'dealType'],
  'Decision Tree': ['propertyType', 'contractType', 'lotType', 'dualOccupancy'],
  'Address': ['propertyAddress', 'projectAddress', 'suburbName', 'state', 'postCode', 'lga', 'googleMap'],
  'Risk Overlays': ['zoning', 'flood', 'bushfire', 'mining', 'otherOverlay', 'specialInfrastructure'],
  'Property Description': ['bedsPrimary', 'bathPrimary', 'landSize', 'buildSize', 'title'],
  'Purchase Price': ['asking', 'comparableSales', 'landPrice', 'buildPrice', 'totalPrice'],
  'Rental Assessment': ['occupancy', 'currentRentPrimary', 'rentAppraisalPrimaryFrom', 'yield'],
  'Market Performance': ['medianPriceChange3Months', 'medianPriceChange1Year', 'medianPriceChange3Year', 'medianPriceChange5Year'],
  'Content Sections': ['whyThisProperty', 'proximity', 'investmentHighlights'],
  'Agent Info': ['agentName', 'agentMobile', 'agentEmail'],
  'Lots': ['lots'],
  'Internal': ['messageForBA', 'pushRecordToDealSheet']
};

foundFields.forEach(field => {
  // Determine category
  let category = 'Other';
  for (const [cat, keywords] of Object.entries(fieldCategories)) {
    if (keywords.some(kw => field.includes(kw))) {
      category = cat;
      break;
    }
  }
  
  // Determine property type applicability
  let propertyType = 'All';
  if (field.includes('project') || field.includes('lots[')) {
    propertyType = 'Project';
  } else if (field.includes('dual') || field.includes('Secondary')) {
    propertyType = 'H&L';
  }
  
  // Determine destination (simplified - would need actual mapping)
  let email = '?';
  let dealSheet = '?';
  let ghl = '?';
  
  if (field.includes('AdditionalDialogue') || field.includes('comparableSales') || field.includes('whyThisProperty') || field.includes('proximity') || field.includes('investmentHighlights')) {
    email = 'Yes';
  }
  
  if (!field.includes('isSaved') && !field.includes('isVerified') && !field.includes('daysSinceLastCheck')) {
    dealSheet = 'Yes';
  }
  
  if (!field.includes('AdditionalDialogue') && !field.includes('googleMap') && !field.includes('latitude') && !field.includes('longitude')) {
    ghl = 'Yes';
  }
  
  const inFiles = [];
  completeStructureData.forEach(row => {
    if (row['Field Path'] === field && !inFiles.includes(row['File'])) {
      inFiles.push(row['File']);
    }
  });
  
  fieldMapping.push({
    'Field Path': field,
    'Category': category,
    'Property Type': propertyType,
    'Email': email,
    'Deal Sheet': dealSheet,
    'GHL': ghl,
    'Found in Files': inFiles.length,
    'Sample Value': completeStructureData.find(r => r['Field Path'] === field)?.['Sample Value'] || ''
  });
});

const fieldMappingSheet = XLSX.utils.json_to_sheet(fieldMapping.sort((a, b) => a['Field Path'].localeCompare(b['Field Path'])));
XLSX.utils.book_append_sheet(comparisonWorkbook, fieldMappingSheet, 'Field Mapping Matrix');

// Sheet 4: Summary Statistics
const summary = [
  ['Metric', 'Value'],
  ['Total Fields Found in Excel', foundFields.size],
  ['Fields in Matrix', matrixFields.size],
  ['Fields Missing from Matrix', missingFromMatrix.length],
  ['Files Analyzed', 3],
  ['', ''],
  ['File 1 Fields', completeStructureData.filter(r => r['File'].includes('05-23-49')).length],
  ['File 2 Fields', completeStructureData.filter(r => r['File'].includes('06-32-33')).length],
  ['File 3 Fields', completeStructureData.filter(r => r['File'].includes('07-06-40')).length]
];

const summarySheet = XLSX.utils.aoa_to_sheet(summary);
XLSX.utils.book_append_sheet(comparisonWorkbook, summarySheet, 'Summary');

// Write the comparison file
const outputPath = path.join('C:/Users/User/.cursor/JT FOLDER', 'FIELD-MAPPING-COMPARISON.xlsx');
XLSX.writeFile(comparisonWorkbook, outputPath);
console.log(`\n✓ Comparison saved to: ${outputPath}`);
console.log(`\n=== RESULTS ===`);
console.log(`Total fields found: ${foundFields.size}`);
console.log(`Fields in matrix: ${matrixFields.size}`);
console.log(`Fields missing from matrix: ${missingFromMatrix.length}`);
console.log(`\nTop missing fields:`);
missingFromMatrix.slice(0, 20).forEach(f => console.log(`  - ${f['Field Path']}`));


