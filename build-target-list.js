const fs = require('fs');

// Simple CSV parser that handles quoted fields with commas and newlines
function parseCSV(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  let row = [];
  
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(current.trim());
        current = '';
      } else if (ch === '\n' || (ch === '\r' && text[i + 1] === '\n')) {
        if (ch === '\r') i++;
        row.push(current.trim());
        current = '';
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
      } else {
        current += ch;
      }
    }
  }
  if (current || row.length > 0) {
    row.push(current.trim());
    if (row.length > 1 || row[0] !== '') rows.push(row);
  }
  return rows;
}

// Read property list
const propText = fs.readFileSync('property-list.csv', 'utf-8');
const propRows = parseCSV(propText);
const propHeader = propRows[0];

// Find column indices
const typeCol = propHeader.indexOf('Type');
const statusCol = propHeader.indexOf('Status');
const addressCol = propHeader.indexOf('Property Address');
const recordIdCol = propHeader.indexOf('Record ID');

console.log(`Property list columns: Type=${typeCol}, Status=${statusCol}, Address=${addressCol}, RecordID=${recordIdCol}`);

// Filter to "01 Available" and categorize
const SPLIT_TYPES = ['01 Hl Comms'];
const SINGLE_TYPES = ['02 Single Comms', '03 Internal With Comms', '05 Established'];

const properties = {};
let availableCount = 0;
let skippedStatus = 0;
let skippedType = 0;

for (let i = 1; i < propRows.length; i++) {
  const row = propRows[i];
  if (!row[recordIdCol]) continue;
  
  const status = row[statusCol];
  const type = row[typeCol];
  const recordId = row[recordIdCol];
  const address = row[addressCol];
  
  if (status !== '01 Available') {
    skippedStatus++;
    continue;
  }
  
  let contractType;
  if (SPLIT_TYPES.includes(type)) {
    contractType = 'Split';
  } else if (SINGLE_TYPES.includes(type)) {
    contractType = 'Single';
  } else {
    skippedType++;
    console.log(`  Unknown type: "${type}" for ${address}`);
    continue;
  }
  
  // Deduplicate by record ID
  if (!properties[recordId]) {
    properties[recordId] = { recordId, address, type, contractType };
    availableCount++;
  }
}

console.log(`\nProperty list: ${availableCount} available, ${skippedStatus} skipped (wrong status), ${skippedType} skipped (unknown type)`);

// Read GHL extract
const ghlText = fs.readFileSync('ghl-extract.csv', 'utf-8');
const ghlRows = parseCSV(ghlText);
const ghlHeader = ghlRows[0];

const ghlRecordIdCol = ghlHeader.indexOf('Record ID');
const ghlAddressCol = ghlHeader.indexOf('Property Address');
const ghlFolderCol = ghlHeader.indexOf('folder_link');

console.log(`GHL columns: RecordID=${ghlRecordIdCol}, Address=${ghlAddressCol}, FolderLink=${ghlFolderCol}`);

// Build folder lookup
const folderMap = {};
for (let i = 1; i < ghlRows.length; i++) {
  const row = ghlRows[i];
  if (!row[ghlRecordIdCol]) continue;
  const folderLink = row[ghlFolderCol] || '';
  folderMap[row[ghlRecordIdCol]] = {
    address: row[ghlAddressCol],
    folderLink
  };
}

console.log(`GHL extract: ${Object.keys(folderMap).length} records`);

// Match and build target list
const targetList = [];
let matched = 0;
let noFolder = 0;
let notInGHL = 0;

for (const [recordId, prop] of Object.entries(properties)) {
  const ghl = folderMap[recordId];
  if (!ghl) {
    notInGHL++;
    console.log(`  Not in GHL: ${prop.address} (${recordId})`);
    continue;
  }
  if (!ghl.folderLink) {
    noFolder++;
    console.log(`  No folder link: ${prop.address} (${recordId})`);
    continue;
  }
  
  // Extract folder ID from URL
  const folderIdMatch = ghl.folderLink.match(/folders\/([a-zA-Z0-9_-]+)/);
  const folderId = folderIdMatch ? folderIdMatch[1] : '';
  
  if (!folderId) {
    noFolder++;
    console.log(`  Bad folder URL: ${ghl.folderLink}`);
    continue;
  }
  
  targetList.push({
    recordId,
    address: prop.address,
    type: prop.type,
    contractType: prop.contractType,
    folderId,
    folderLink: ghl.folderLink
  });
  matched++;
}

console.log(`\nMatched: ${matched}, No folder: ${noFolder}, Not in GHL: ${notInGHL}`);

// Sort by contract type then address
targetList.sort((a, b) => a.contractType.localeCompare(b.contractType) || a.address.localeCompare(b.address));

// Write target list CSV
const csvHeader = 'Record ID,Property Address,Type,Contract Type,Folder ID,Folder Link';
const csvRows = targetList.map(t => 
  `"${t.recordId}","${t.address}","${t.type}","${t.contractType}","${t.folderId}","${t.folderLink}"`
);

const csvOutput = [csvHeader, ...csvRows].join('\n');
fs.writeFileSync('interest-rate-target-list.csv', csvOutput);

console.log(`\nTarget list written to interest-rate-target-list.csv (${targetList.length} properties)`);
console.log(`\nBreakdown:`);
console.log(`  Split contract: ${targetList.filter(t => t.contractType === 'Split').length}`);
console.log(`  Single contract: ${targetList.filter(t => t.contractType === 'Single').length}`);
