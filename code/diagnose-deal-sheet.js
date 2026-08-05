// Diagnostic: Fetch ALL records from GHL custom objects and summarize
const fs = require('fs');
const content = fs.readFileSync('.env.local', 'utf8');
const env = {};
content.replace(/\r/g, '').split('\n').forEach(l => {
  const m = l.match(/^([^=#]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
});

const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
const API_BASE = 'https://services.leadconnectorhq.com/objects';

async function fetchAllRecords() {
  const allRecords = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const res = await fetch(`${API_BASE}/${GHL_OBJECT_ID}/records/search`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + env.GHL_BEARER_TOKEN,
        'Version': '2021-07-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ locationId: env.GHL_LOCATION_ID, page, pageLimit: 100 }),
    });

    const data = await res.json();
    console.log(`Page ${page}: status=${res.status}, records=${data.records ? data.records.length : 0}, meta=${JSON.stringify(data.meta)}`);

    if (data.records && data.records.length > 0) {
      allRecords.push(...data.records);
      page++;
      if (data.records.length < 100) hasMore = false;
    } else {
      hasMore = false;
    }

    if (page > 20) { console.log('HIT SAFETY LIMIT'); hasMore = false; }
  }

  return allRecords;
}

async function main() {
  console.log('=== GHL Custom Objects Diagnostic ===\n');
  const records = await fetchAllRecords();
  console.log(`\nTotal records fetched: ${records.length}\n`);

  // Group by packager
  const byPackager = {};
  records.forEach(r => {
    const packager = r.properties.packager || '(blank)';
    byPackager[packager] = (byPackager[packager] || 0) + 1;
  });
  console.log('By Packager:');
  Object.entries(byPackager).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // Group by status
  const byStatus = {};
  records.forEach(r => {
    const status = r.properties.status || '(blank)';
    byStatus[status] = (byStatus[status] || 0) + 1;
  });
  console.log('\nBy Status:');
  Object.entries(byStatus).sort((a, b) => b[1] - a[1]).forEach(([k, v]) => console.log(`  ${k}: ${v}`));

  // List all records with key fields
  console.log('\n=== All Records ===');
  console.log('ID | Packager | Status | Address');
  console.log('-'.repeat(120));
  records.forEach(r => {
    const p = r.properties;
    console.log(`${r.id} | ${(p.packager||'').padEnd(15)} | ${(p.status||'').padEnd(25)} | ${p.property_address || ''}`);
  });
}

main().catch(e => console.error(e));
