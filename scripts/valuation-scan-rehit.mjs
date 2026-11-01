// Re-applies the current valuation rules to saved scan JSON (valscan-*.json) without reading Gmail again:
// POSTs each file's quotes to the local dev server, drops quotes the rules now ignore, rewrites hits in place.
// Usage: node scripts/valuation-scan-rehit.mjs <dir>
import fs from 'node:fs';
import path from 'node:path';

const [dir] = process.argv.slice(2);
for (const f of fs.readdirSync(dir).filter((x) => /^valscan-.*\.json$/.test(x))) {
  const file = path.join(dir, f);
  const j = JSON.parse(fs.readFileSync(file, 'utf8'));
  const ev = j.threads.flatMap((t) => t.evidence);
  if (!ev.length) continue;
  const res = await fetch('http://localhost:3000/api/inbox-mining/valuation-scan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: ev.map((e) => ({ quote: e.quote, at: e.at })) }),
  });
  const out = await res.json();
  if (out.error) throw new Error(`${f}: ${out.error}`);
  let i = 0;
  let dropped = 0;
  for (const t of j.threads) {
    t.evidence = t.evidence.filter((e) => {
      const r = out.results[i++];
      e.hits = r.hits;
      if (!r.keep) dropped++;
      return r.keep;
    });
  }
  j.threads = j.threads.filter((t) => t.evidence.length);
  fs.writeFileSync(file, JSON.stringify(j));
  console.log(f, 'quotes', ev.length, 'dropped', dropped);
}
