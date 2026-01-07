const XLSX = require('xlsx');
const path = require('path');

const folderPath = 'C:/Users/User/.cursor/JT FOLDER';
const files = [
  'CF spreadsheet template v3.0 Dev.xlsx',
  'CF HL spreadsheet template v2.0.xlsx'
];

files.forEach(filename => {
  const filePath = path.join(folderPath, filename);
  console.log(`\n=== Analyzing: ${filename} ===`);
  
  try {
    const workbook = XLSX.readFile(filePath);
    
    workbook.SheetNames.forEach(sheetName => {
      const sheet = workbook.Sheets[sheetName];
      console.log(`\nSheet: ${sheetName}`);
      
      // Get all cell references
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      console.log(`  Range: ${sheet['!ref']}`);
      console.log(`  Rows: ${range.e.r + 1}, Cols: ${range.e.c + 1}`);
      
      // Look for chart-related data patterns
      // Charts in Excel are often referenced by named ranges or have data in specific patterns
      // Check for common chart data patterns (numeric data in columns/rows)
      
      // Look for potential chart data ranges
      const chartDataRanges = [];
      let currentRange = null;
      
      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          
          if (cell && cell.v !== undefined) {
            // Check if it's a number (potential chart data)
            if (typeof cell.v === 'number') {
              if (!currentRange) {
                currentRange = { start: cellAddress, end: cellAddress, count: 1 };
              } else {
                currentRange.end = cellAddress;
                currentRange.count++;
              }
            } else {
              if (currentRange && currentRange.count > 5) {
                chartDataRanges.push(currentRange);
              }
              currentRange = null;
            }
          }
        }
      }
      
      // Look for formulas that might be chart-related
      const formulas = [];
      for (let row = 0; row <= range.e.r; row++) {
        for (let col = 0; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          const cell = sheet[cellAddress];
          if (cell && cell.f) {
            formulas.push({ address: cellAddress, formula: cell.f });
          }
        }
      }
      
      if (formulas.length > 0) {
        console.log(`  Found ${formulas.length} formulas`);
        // Show first few formulas as examples
        formulas.slice(0, 5).forEach(f => {
          console.log(`    ${f.address}: ${f.formula}`);
        });
      }
      
      // Check for merged cells (often used in chart headers)
      if (sheet['!merges']) {
        console.log(`  Found ${sheet['!merges'].length} merged cell ranges`);
      }
    });
    
    // Note: XLSX library doesn't directly read chart objects from Excel files
    // Charts are embedded objects that require different parsing
    console.log('\n  NOTE: Chart objects themselves are not directly readable with XLSX library.');
    console.log('  You will need to manually identify charts by:');
    console.log('    1. Opening the Excel file');
    console.log('    2. Identifying which sheets have charts');
    console.log('    3. Noting the data ranges used by each chart');
    console.log('    4. Chart types (line, bar, pie, etc.)');
    
  } catch (error) {
    console.error(`Error reading ${filename}:`, error.message);
  }
});

console.log('\n\n=== NEXT STEPS ===');
console.log('1. Open each Excel file manually to identify charts');
console.log('2. Note: Sheet name, Chart type, Data range, Chart title');
console.log('3. Then recreate charts in Google Sheets using Google Sheets chart syntax');


