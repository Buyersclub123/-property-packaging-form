const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const PDF_FOLDER_ID = '13ywQvtmPS-FEXWXDJihdVd4I_PljJV7A';
const SHARED_DRIVE_ID = '0AFVxBPJiTmjPUk9PVA';

async function main() {
  // Load credentials from .env.local
  const envFile = fs.readFileSync(path.join(__dirname, '.env.local'), 'utf8');
  const match = envFile.match(/GOOGLE_SHEETS_CREDENTIALS='(.+?)'\s*\n/s);
  if (!match) throw new Error('GOOGLE_SHEETS_CREDENTIALS not found in .env.local');
  const credentials = JSON.parse(match[1]);

  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });

  const drive = google.drive({ version: 'v3', auth });

  console.log('Querying "Deal Sheet Email PDFs" folder...\n');

  // Get all PDFs in the folder
  let allFiles = [];
  let pageToken = null;

  do {
    const res = await drive.files.list({
      q: `'${PDF_FOLDER_ID}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, size, modifiedTime, createdTime)',
      orderBy: 'name, modifiedTime desc',
      pageSize: 1000,
      pageToken: pageToken || undefined,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      driveId: SHARED_DRIVE_ID,
      corpora: 'drive',
    });
    allFiles = allFiles.concat(res.data.files || []);
    pageToken = res.data.nextPageToken;
  } while (pageToken);

  console.log(`Total files in folder: ${allFiles.length}\n`);

  // Group by filename (which is recordId.pdf or similar)
  const grouped = {};
  for (const file of allFiles) {
    const key = file.name;
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(file);
  }

  const uniqueNames = Object.keys(grouped).length;
  const duplicates = Object.entries(grouped).filter(([, files]) => files.length > 1);

  console.log(`Unique filenames: ${uniqueNames}`);
  console.log(`Filenames with duplicates: ${duplicates.length}\n`);

  if (duplicates.length === 0) {
    console.log('No duplicates found!');
    return;
  }

  // Analyse duplicates
  console.log('=== DUPLICATE ANALYSIS ===\n');
  
  let sameSize = 0;
  let diffSize = 0;

  for (const [name, files] of duplicates.slice(0, 20)) { // Show first 20
    const sizes = files.map(f => parseInt(f.size || '0'));
    const dates = files.map(f => f.modifiedTime);
    const allSameSize = sizes.every(s => s === sizes[0]);

    if (allSameSize) sameSize++;
    else diffSize++;

    console.log(`📄 ${name} (${files.length} copies)`);
    for (const f of files) {
      console.log(`   ID: ${f.id} | Size: ${f.size} bytes | Modified: ${f.modifiedTime}`);
    }
    if (!allSameSize) {
      console.log(`   ⚠️  DIFFERENT SIZES — content has changed between versions`);
    } else {
      console.log(`   ✓ Same size — likely identical content`);
    }
    console.log('');
  }

  if (duplicates.length > 20) {
    console.log(`... and ${duplicates.length - 20} more duplicates not shown\n`);
  }

  console.log('=== SUMMARY ===');
  console.log(`Total files: ${allFiles.length}`);
  console.log(`Unique records: ${uniqueNames}`);
  console.log(`Records with duplicates: ${duplicates.length}`);
  console.log(`  - Same size (likely unchanged): ${sameSize}`);
  console.log(`  - Different size (content changed): ${diffSize}`);
  
  if (diffSize > 0) {
    console.log('\n⚠️  Some PDFs have DIFFERENT content between versions.');
    console.log('This means either:');
    console.log('  a) Data changed between approval stages (expected — Packager/QA/BA), OR');
    console.log('  b) GHL fields were changed and a re-submission regenerated the PDF');
  }
}

main().catch(console.error);
