const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const folderPath = 'C:/Users/User/.cursor/JT FOLDER';
const files = [
  'property-form-data-2026-01-06T05-23-49.xlsx',
  'property-form-data-2026-01-06T06-32-33.xlsx',
  'property-form-data-2026-01-06T07-06-40.xlsx'
];

// Collect all unique fields from all files
const allFields = new Set();
const fileData = [];

console.log('Analyzing Excel files...\n');

files.forEach((filename, idx) => {
  const filePath = path.join(folderPath, filename);
  try {
    const workbook = XLSX.readFile(filePath);
    const fileInfo = {
      filename,
      sheets: {},
      allFields: new Set()
    };

    workbook.SheetNames.forEach(sheetName => {
      const ws = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(ws, { defval: '' });
      
      if (data.length > 0) {
        const fields = Object.keys(data[0]);
        fields.forEach(field => {
          allFields.add(field);
          fileInfo.allFields.add(field);
        });
        
        fileInfo.sheets[sheetName] = {
          rowCount: data.length,
          fields: fields,
          sampleRow: data[0] // First row as sample
        };
      }
    });

    fileData.push(fileInfo);
    console.log(`✓ Processed ${filename}`);
  } catch (e) {
    console.error(`✗ Error reading ${filename}:`, e.message);
  }
});

console.log(`\nTotal unique fields found: ${allFields.size}\n`);

// Create analysis workbook
const analysisWorkbook = XLSX.utils.book_new();

// Sheet 1: All Fields Found
const allFieldsArray = Array.from(allFields).sort().map(field => ({
  'Field Name': field,
  'Found in File 1': fileData[0]?.allFields.has(field) ? 'Yes' : 'No',
  'Found in File 2': fileData[1]?.allFields.has(field) ? 'Yes' : 'No',
  'Found in File 3': fileData[2]?.allFields.has(field) ? 'Yes' : 'No',
  'Found in All Files': fileData.every(f => f.allFields.has(field)) ? 'Yes' : 'No'
}));
const allFieldsSheet = XLSX.utils.json_to_sheet(allFieldsArray);
XLSX.utils.book_append_sheet(analysisWorkbook, allFieldsSheet, 'All Fields Found');

// Sheet 2: File Details
const fileDetailsArray = [];
fileData.forEach((file, idx) => {
  fileDetailsArray.push({
    'File': file.filename,
    'Sheet': '---',
    'Row Count': '---',
    'Field Count': file.allFields.size
  });
  Object.entries(file.sheets).forEach(([sheetName, sheetInfo]) => {
    fileDetailsArray.push({
      'File': '',
      'Sheet': sheetName,
      'Row Count': sheetInfo.rowCount,
      'Field Count': sheetInfo.fields.length
    });
  });
});
const fileDetailsSheet = XLSX.utils.json_to_sheet(fileDetailsArray);
XLSX.utils.book_append_sheet(analysisWorkbook, fileDetailsSheet, 'File Details');

// Sheet 3: Field Samples (first row of each sheet)
const sampleDataArray = [];
fileData.forEach((file, idx) => {
  Object.entries(file.sheets).forEach(([sheetName, sheetInfo]) => {
    const sampleRow = sheetInfo.sampleRow;
    Object.entries(sampleRow).forEach(([key, value]) => {
      sampleDataArray.push({
        'File': file.filename,
        'Sheet': sheetName,
        'Field': key,
        'Sample Value': String(value).substring(0, 100) // Limit to 100 chars
      });
    });
  });
});
const sampleDataSheet = XLSX.utils.json_to_sheet(sampleDataArray);
XLSX.utils.book_append_sheet(analysisWorkbook, sampleDataSheet, 'Field Samples');

// Sheet 4: Complete Data Structure (all fields with paths)
const completeStructureArray = [];
fileData.forEach((file, idx) => {
  Object.entries(file.sheets).forEach(([sheetName, sheetInfo]) => {
    sheetInfo.fields.forEach(field => {
      completeStructureArray.push({
        'File': file.filename,
        'Sheet': sheetName,
        'Field Path': field,
        'Has Value': sheetInfo.sampleRow[field] ? 'Yes' : 'No',
        'Sample Value': String(sheetInfo.sampleRow[field] || '').substring(0, 200)
      });
    });
  });
});
const completeStructureSheet = XLSX.utils.json_to_sheet(completeStructureArray);
XLSX.utils.book_append_sheet(analysisWorkbook, completeStructureSheet, 'Complete Structure');

// Write the analysis file
const outputPath = path.join(folderPath, 'FIELD-ANALYSIS.xlsx');
XLSX.writeFile(analysisWorkbook, outputPath);
console.log(`\n✓ Analysis saved to: ${outputPath}`);

// Also output summary to console
console.log('\n=== SUMMARY ===');
console.log(`Total unique fields: ${allFields.size}`);
fileData.forEach((file, idx) => {
  console.log(`\nFile ${idx + 1}: ${file.filename}`);
  console.log(`  Total fields: ${file.allFields.size}`);
  console.log(`  Sheets: ${Object.keys(file.sheets).join(', ')}`);
});


