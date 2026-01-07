const XLSX = require('xlsx');
const path = require('path');

const filePath = 'C:/Users/User/.cursor/JT FOLDER/CF spreadsheet template v3.0 Dev.xlsx';

console.log('Reading Excel file...\n');
const workbook = XLSX.readFile(filePath);

console.log('Sheet Names:', workbook.SheetNames.join(', '));
console.log('\n=== Analyzing each sheet ===\n');

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
  
  console.log(`\n--- Sheet: ${sheetName} ---`);
  console.log(`Range: ${sheet['!ref']}`);
  console.log(`Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
  
  // Look for potential chart data - numeric data in columns
  // Charts typically use data in columns or rows
  const numericColumns = {};
  
  for (let col = 0; col <= Math.min(range.e.c, 10); col++) { // Check first 10 columns
    const colLetter = XLSX.utils.encode_col(col);
    let hasNumbers = false;
    let numberCount = 0;
    const sampleValues = [];
    
    for (let row = 0; row <= Math.min(range.e.r, 50); row++) { // Check first 50 rows
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      
      if (cell) {
        if (typeof cell.v === 'number') {
          hasNumbers = true;
          numberCount++;
          if (sampleValues.length < 5) {
            sampleValues.push(cell.v);
          }
        }
      }
    }
    
    if (hasNumbers && numberCount > 3) {
      numericColumns[colLetter] = {
        count: numberCount,
        samples: sampleValues
      };
    }
  }
  
  if (Object.keys(numericColumns).length > 0) {
    console.log('Potential chart data columns:');
    Object.entries(numericColumns).forEach(([col, info]) => {
      console.log(`  Column ${col}: ${info.count} numeric values, samples: ${info.samples.join(', ')}`);
    });
  }
  
  // Check for merged cells (often used for chart titles/headers)
  if (sheet['!merges']) {
    console.log(`Merged cells: ${sheet['!merges'].length} ranges`);
  }
  
  // Look for common chart-related text
  const chartKeywords = ['chart', 'graph', 'cashflow', 'equity', 'growth', 'value', 'year'];
  const foundKeywords = [];
  
  for (let row = 0; row <= Math.min(range.e.r, 20); row++) {
    for (let col = 0; col <= Math.min(range.e.c, 10); col++) {
      const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = sheet[cellAddress];
      
      if (cell && typeof cell.v === 'string') {
        const cellValue = cell.v.toLowerCase();
        chartKeywords.forEach(keyword => {
          if (cellValue.includes(keyword) && !foundKeywords.includes(`${cellAddress}: ${cell.v}`)) {
            foundKeywords.push(`${cellAddress}: ${cell.v}`);
          }
        });
      }
    }
  }
  
  if (foundKeywords.length > 0) {
    console.log('Chart-related text found:');
    foundKeywords.slice(0, 10).forEach(text => console.log(`  ${text}`));
  }
});

console.log('\n\n=== NOTE ===');
console.log('Excel charts are embedded objects that cannot be directly read from the file.');
console.log('To recreate charts in Google Sheets, you need to:');
console.log('1. Identify which sheets have charts (likely sheets with summary data)');
console.log('2. Note the data ranges used by each chart');
console.log('3. Recreate using Google Sheets chart editor');
console.log('\nBased on the image you showed, the 3 charts are likely on a summary sheet.');
console.log('Please tell me:');
console.log('- Which sheet contains the charts?');
console.log('- What data ranges do they use?');
console.log('- Or share the Google Sheets version so I can see the chart configuration');


