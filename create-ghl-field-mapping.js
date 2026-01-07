const XLSX = require('xlsx');
const path = require('path');

// Internal/UI state fields that should NOT be exported to GHL or Deal Sheet
const INTERNAL_FIELDS = [
  'addressFieldsEditable',
  'addressVerified',
  'isSaved',
  'isVerified',
  'daysSinceLastCheck',
  'Field',
  'Value',
  'fieldPath',
  'dataType',
  'lotIndex'
];

// Fields that are ONLY for email template (not Deal Sheet/GHL)
const EMAIL_ONLY_FIELDS = [
  'AdditionalDialogue',
  'googleMap',
  'latitude',
  'longitude'
];

// Read the analysis file
const analysisPath = 'C:/Users/User/.cursor/JT FOLDER/FIELD-ANALYSIS.xlsx';
const analysisWorkbook = XLSX.readFile(analysisPath);
const completeStructureSheet = analysisWorkbook.Sheets['Complete Structure'];
const completeStructureData = XLSX.utils.sheet_to_json(completeStructureSheet);

// Helper to check if field is internal
const isInternalField = (fieldPath) => {
  return INTERNAL_FIELDS.some(ifield => fieldPath.includes(ifield));
};

// Helper to check if field is email-only
const isEmailOnlyField = (fieldPath) => {
  return EMAIL_ONLY_FIELDS.some(efield => fieldPath.includes(efield));
};

// Helper to convert field path to GHL snake_case format
const toGHLFieldName = (fieldPath) => {
  // Remove nested prefixes (e.g., "address.propertyAddress" -> "propertyAddress")
  let field = fieldPath;
  if (field.includes('.')) {
    const parts = field.split('.');
    field = parts[parts.length - 1];
  }
  
  // Handle array notation (e.g., "lots[0].lotNumber" -> "lot_number")
  field = field.replace(/\[.*?\]/g, '');
  
  // Convert camelCase to snake_case
  field = field.replace(/([A-Z])/g, '_$1').toLowerCase();
  field = field.replace(/^_/, ''); // Remove leading underscore
  
  // Handle special cases
  field = field.replace(/__/g, '_'); // Remove double underscores
  
  return field;
};

// Collect all exportable fields
const exportableFields = [];
const processedFields = new Set();

completeStructureData.forEach(row => {
  const fieldPath = row['Field Path'];
  
  // Skip if already processed
  if (processedFields.has(fieldPath)) return;
  processedFields.add(fieldPath);
  
  // Skip internal fields
  if (isInternalField(fieldPath)) return;
  
  // Find which files contain this field
  const inFiles = [];
  const sheets = [];
  completeStructureData.forEach(r => {
    if (r['Field Path'] === fieldPath) {
      if (!inFiles.includes(r['File'])) inFiles.push(r['File']);
      if (!sheets.includes(r['Sheet'])) sheets.push(r['Sheet']);
    }
  });
  
  const emailOnly = isEmailOnlyField(fieldPath);
  const ghlFieldName = toGHLFieldName(fieldPath);
  
  exportableFields.push({
    'Field Path': fieldPath,
    'GHL Field Name': ghlFieldName,
    'Email': emailOnly ? 'Email Only' : 'Yes',
    'Deal Sheet': emailOnly ? 'No' : 'Yes',
    'GHL': emailOnly ? 'No' : 'Yes',
    'Found in Files': inFiles.length,
    'Sample Value': (row['Sample Value'] || '').substring(0, 100)
  });
});

// Sort by field path
exportableFields.sort((a, b) => a['Field Path'].localeCompare(b['Field Path']));

// Create workbook
const workbook = XLSX.utils.book_new();

// Sheet 1: Exportable Fields (for GHL Integration)
const exportableSheet = XLSX.utils.json_to_sheet(exportableFields);
XLSX.utils.book_append_sheet(workbook, exportableSheet, 'Exportable Fields');

// Sheet 2: GHL Field Mapping (Field Path -> GHL Field Name)
const ghlMapping = exportableFields
  .filter(f => f['GHL'] === 'Yes')
  .map(f => ({
    'Form Field Path': f['Field Path'],
    'GHL Field Name': f['GHL Field Name'],
    'Notes': f['Field Path'].includes('lots[') ? 'Array field - needs special handling' : ''
  }));
const ghlMappingSheet = XLSX.utils.json_to_sheet(ghlMapping);
XLSX.utils.book_append_sheet(workbook, ghlMappingSheet, 'GHL Field Mapping');

// Sheet 3: Fields Needing GHL Creation (prioritized)
// Based on NEW-FIELDS-FOR-GHL.md priorities
const fieldsNeedingGHL = [
  // HIGH PRIORITY
  { 'Field Path': 'sourcer', 'GHL Field Name': 'sourcer', 'Priority': 'HIGH', 'Status': 'EXISTS - needs UI', 'Notes': 'Field exists in GHL, just needs UI' },
  { 'Field Path': 'sellingAgent', 'GHL Field Name': 'selling_agent', 'Priority': 'HIGH', 'Status': 'NEEDS CREATE', 'Notes': 'Combined field: Name, Email, Mobile' },
  { 'Field Path': 'packager', 'GHL Field Name': 'packager', 'Priority': 'HIGH', 'Status': 'COMPLETE', 'Notes': '✅ IMPLEMENTED - auto-populated from email' },
  
  // MEDIUM PRIORITY
  { 'Field Path': 'rentAppraisalPrimaryFrom', 'GHL Field Name': 'rent_appraisal_primary_from', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Split field' },
  { 'Field Path': 'rentAppraisalPrimaryTo', 'GHL Field Name': 'rent_appraisal_primary_to', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Split field' },
  { 'Field Path': 'rentAppraisalSecondaryFrom', 'GHL Field Name': 'rent_appraisal_secondary_from', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Split field' },
  { 'Field Path': 'rentAppraisalSecondaryTo', 'GHL Field Name': 'rent_appraisal_secondary_to', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Split field' },
  { 'Field Path': 'buildSize', 'GHL Field Name': 'build_size', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Build size in sqm' },
  { 'Field Path': 'landRegistration', 'GHL Field Name': 'land_registration', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Land registration status' },
  { 'Field Path': 'cashbackRebateValue', 'GHL Field Name': 'cashback_rebate_value', 'Priority': 'MEDIUM', 'Status': 'VERIFY MAPPING', 'Notes': 'May map to existing Client_Cashback__Rebates_Discount' },
  { 'Field Path': 'cashbackRebateType', 'GHL Field Name': 'cashback_rebate_type', 'Priority': 'MEDIUM', 'Status': 'VERIFY MAPPING', 'Notes': 'May map to existing field' },
  { 'Field Path': 'acceptableAcquisitionFrom', 'GHL Field Name': 'acceptable_acquisition_from', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Acceptable acquisition price range (from)' },
  { 'Field Path': 'acceptableAcquisitionTo', 'GHL Field Name': 'acceptable_acquisition_to', 'Priority': 'MEDIUM', 'Status': 'NEEDS CREATE', 'Notes': 'Acceptable acquisition price range (to)' },
  
  // LOW PRIORITY
  { 'Field Path': 'projectName', 'GHL Field Name': 'project_name', 'Priority': 'LOW', 'Status': 'NEEDS CREATE', 'Notes': 'For projects - check occasionally' },
  { 'Field Path': 'projectCommencementScheduledFor', 'GHL Field Name': 'project_commencement_scheduled_for', 'Priority': 'LOW', 'Status': 'LATER', 'Notes': 'User will come back to this' },
];

// Add any exportable fields that aren't in the list above
exportableFields.forEach(f => {
  if (f['GHL'] === 'Yes' && !fieldsNeedingGHL.find(e => e['Field Path'] === f['Field Path'])) {
    // Check if it's a common field that likely already exists
    const commonFields = ['propertyAddress', 'suburbName', 'state', 'postCode', 'propertyType', 'contractType', 'status'];
    const isCommon = commonFields.some(cf => f['Field Path'].includes(cf));
    
    fieldsNeedingGHL.push({
      'Field Path': f['Field Path'],
      'GHL Field Name': f['GHL Field Name'],
      'Priority': isCommon ? 'VERIFY EXISTS' : 'MEDIUM',
      'Status': isCommon ? 'VERIFY EXISTS' : 'NEEDS VERIFY',
      'Notes': isCommon ? 'Likely exists - verify' : 'Check if exists in GHL'
    });
  }
});

const ghlCreationSheet = XLSX.utils.json_to_sheet(fieldsNeedingGHL.sort((a, b) => {
  const priorityOrder = { 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3, 'VERIFY EXISTS': 4 };
  return (priorityOrder[a['Priority']] || 99) - (priorityOrder[b['Priority']] || 99);
}));
XLSX.utils.book_append_sheet(workbook, ghlCreationSheet, 'Fields Needing GHL Creation');

// Sheet 4: Summary Statistics
const summary = [
  ['Metric', 'Value'],
  ['Total Exportable Fields', exportableFields.length],
  ['Fields for Email', exportableFields.filter(f => f['Email'] === 'Yes' || f['Email'] === 'Email Only').length],
  ['Fields for Deal Sheet', exportableFields.filter(f => f['Deal Sheet'] === 'Yes').length],
  ['Fields for GHL', exportableFields.filter(f => f['GHL'] === 'Yes').length],
  ['Email-Only Fields', exportableFields.filter(f => f['Email'] === 'Email Only').length],
  ['', ''],
  ['Fields Needing GHL Creation', fieldsNeedingGHL.filter(f => f['Status'] === 'NEEDS CREATE').length],
  ['Fields to Verify in GHL', fieldsNeedingGHL.filter(f => f['Status'] === 'VERIFY EXISTS' || f['Status'] === 'VERIFY MAPPING').length],
  ['Fields Already Complete', fieldsNeedingGHL.filter(f => f['Status'] === 'COMPLETE').length]
];

const summarySheet = XLSX.utils.aoa_to_sheet(summary);
XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

// Write the file
const outputPath = path.join('C:/Users/User/.cursor/JT FOLDER', 'GHL-FIELD-MAPPING.xlsx');
XLSX.writeFile(workbook, outputPath);
console.log(`\n✓ GHL Field Mapping saved to: ${outputPath}`);
console.log(`\n=== SUMMARY ===`);
console.log(`Total exportable fields: ${exportableFields.length}`);
console.log(`Fields for GHL: ${exportableFields.filter(f => f['GHL'] === 'Yes').length}`);
console.log(`Fields needing GHL creation: ${fieldsNeedingGHL.filter(f => f['Status'] === 'NEEDS CREATE').length}`);
console.log(`Fields to verify: ${fieldsNeedingGHL.filter(f => f['Status'] === 'VERIFY EXISTS' || f['Status'] === 'VERIFY MAPPING').length}`);


