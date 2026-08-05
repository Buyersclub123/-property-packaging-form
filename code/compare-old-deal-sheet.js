const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQuotes = !inQuotes; }
    else if (line[i] === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += line[i]; }
  }
  result.push(current.trim());
  return result;
}

function norm(s) {
  return s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
}

// Load old deal sheet
const oldLines = fs.readFileSync('c:/Users/User/OneDrive/John Arthur Investments/Temp to send/olde deal sheet.csv', 'utf8').split('\n');
const oldHeader = parseCSVLine(oldLines[0]);
const addrCol = oldHeader.indexOf('Address_Deal');
const statusCol = 3;
const oldAddresses = oldLines.slice(1).map(l => {
  const r = parseCSVLine(l);
  return { addr: r[addrCol] || '', status: r[statusCol] || '' };
}).filter(r => r.addr.length > 5);

// Load match results
const matchLines = fs.readFileSync('c:/Users/User/Downloads/match-results.csv', 'utf8').split('\n');
const oppAddresses = matchLines.slice(1).map(l => {
  const r = parseCSVLine(l);
  return { addr: r[3] || '', confirmed: r[4] || '' };
}).filter(r => r.addr.length > 5);

console.log('Old deal sheet addresses:', oldAddresses.length);
console.log('Construction opportunities:', oppAddresses.length);
console.log('');

// Match each opportunity against old deal sheet
let hits = [];
for (const opp of oppAddresses) {
  const on = norm(opp.addr);
  const ot = on.split(' ').filter(t => t.length > 2);
  if (ot.length < 2) continue;

  for (const old of oldAddresses) {
    const dn = norm(old.addr);
    const dt = dn.split(' ').filter(t => t.length > 2);
    const common = ot.filter(t => dt.includes(t)).length;
    const score = common / Math.max(ot.length, dt.length);
    if (common >= 3 && score >= 0.4) {
      hits.push({
        oppAddr: opp.addr.substring(0, 70),
        oldAddr: old.addr.substring(0, 70),
        oldStatus: old.status,
        confirmed: opp.confirmed,
        score: Math.round(score * 100),
        common
      });
      break; // best match per opp
    }
  }
}

console.log('=== MATCHES FOUND: ' + hits.length + ' ===\n');
hits.sort((a, b) => b.score - a.score);
hits.forEach(h => {
  console.log('Score: ' + h.score + '% | Old Status: ' + h.oldStatus + ' | Already confirmed: ' + (h.confirmed || 'no'));
  console.log('  Opp:  ' + h.oppAddr);
  console.log('  Old:  ' + h.oldAddr);
  console.log('');
});
