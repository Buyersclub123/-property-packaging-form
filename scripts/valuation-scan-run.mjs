// Runs the read-only valuation scan for one mailbox over the last N days in 7-day chunks against the
// local dev server, saving one JSON per chunk: <outDir>/valscan-<mailbox>-<nn>.json. Skips chunks already saved.
// Usage: node scripts/valuation-scan-run.mjs <mailbox-local-part> <days> <outDir>
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 200)}`));
        }
      });
    });
    req.setTimeout(3_600_000, () => req.destroy(new Error('timed out after 60 min')));
    req.on('error', reject);
  });
}

// Optional 4th arg: a fixed end (ISO) so a restarted run keeps the same chunk boundaries.
const [box, daysArg, outDir, endArg] = process.argv.slice(2);
const days = parseInt(daysArg || '90', 10);
fs.mkdirSync(outDir, { recursive: true });
const end = endArg ? new Date(endArg) : new Date();
const since = new Date(end.getTime() - days * 86400000);
const chunks = [];
for (let t = since.getTime(); t < end.getTime(); t += 7 * 86400000) {
  chunks.push([new Date(t), new Date(Math.min(t + 7 * 86400000, end.getTime()))]);
}
// Optional 5th arg 'reverse': newest chunk first, so a second runner on the same mailbox meets the first in the middle.
const order = chunks.map((_, i) => i);
if (process.argv[6] === 'reverse') order.reverse();
for (const i of order) {
  const file = path.join(outDir, `valscan-${box}-${String(i).padStart(2, '0')}.json`);
  if (fs.existsSync(file)) continue;
  const [from, to] = chunks[i];
  const url = `http://localhost:3000/api/inbox-mining/valuation-scan?mailbox=${box}@buyersclub.com.au&from=${from.toISOString()}&to=${to.toISOString()}&since=${since.toISOString()}`;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // node:http rather than fetch: busy weeks take over 5 minutes and fetch gives up waiting for headers at 5.
      const j = await getJson(url);
      if (j.error) throw new Error(j.error);
      fs.writeFileSync(file, JSON.stringify({ ...j, from, to, since }));
      console.log(new Date().toISOString(), box, i + 1, '/', chunks.length, 'listed', j.listed, 'threads', j.threads.length);
      break;
    } catch (e) {
      console.log(new Date().toISOString(), box, i + 1, 'attempt', attempt, 'failed:', e.message);
      if (attempt === 3) process.exitCode = 1;
    }
  }
}
console.log('done', box);
