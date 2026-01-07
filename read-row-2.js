const XLSX = require('xlsx');
const path = require('path');

// Read the final matrix file
const filePath = 'C:/Users/User/.cursor/JT FOLDER/FIELD-MAPPING-MATRIX-FINAL.xlsx';
const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets['Field Mapping Matrix'];
const data = XLSX.utils.sheet_to_json(sheet);

// Get row 2 (index 1, since row 1 is header)
if (data.length > 0) {
  const row2 = data[0]; // First data row (row 2 in Excel)
  console.log('\n=== ROW 2 OF FIELD MAPPING MATRIX ===\n');
  console.log('Field Path:', row2['Field Path'] || 'N/A');
  console.log('Category:', row2['Category'] || 'N/A');
  console.log('Property Type:', row2['Property Type'] || 'N/A');
  console.log('Email:', row2['Email'] || 'N/A');
  console.log('Deal Sheet:', row2['Deal Sheet'] || 'N/A');
  console.log('GHL:', row2['GHL'] || 'N/A');
  console.log('Exact Text in Email:', row2['Exact Text in Email'] || 'N/A');
  console.log('Found in Files:', row2['Found in Files'] || 'N/A');
  console.log('Sheets:', row2['Sheets'] || 'N/A');
  console.log('Sample Value:', (row2['Sample Value'] || 'N/A').substring(0, 200));
  console.log('\n=== FULL ROW DATA ===');
  console.log(JSON.stringify(row2, null, 2));
} else {
  console.log('No data found in sheet');
}


