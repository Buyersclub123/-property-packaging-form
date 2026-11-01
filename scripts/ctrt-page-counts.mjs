// Reads the row count the CTRT PAGE renders for each view ("N records" in the header), in headless Edge.
// READ-ONLY: opens the page, switches views via the saved view id, reads the header. No edits, no GHL writes.
// Usage: node scripts/ctrt-page-counts.mjs [baseUrl] [viewId ...]   (default http://localhost:3000, every built-in view)
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const BASE = args.find((a) => a.startsWith('http')) || 'http://localhost:3000';
const OLD = ['builtin-bp', 'builtin-full-fc', 'builtin-settlement', 'builtin-ocean-rise', 'builtin-build-deposit', 'builtin-uncon',
  'builtin-pm-intro', 'builtin-huntly', 'builtin-golden-horizon', 'builtin-finance-tracking'];
const ids = args.filter((a) => !a.startsWith('http'));
const VIEWS = ids.length ? ids : [...OLD.flatMap((id) => [id, `${id}-new`, `${id}-mined`]),
  'builtin-valuation-access', 'builtin-fallen-deals', 'builtin-duplicate-records'];
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${path.join(process.env.TEMP || '.', 'ctrt-page-counts')}`,
  '--window-size=1600,1000', 'about:blank'], { stdio: 'ignore' });
try {
  let target;
  for (let i = 0; i < 30 && !target; i++) {
    await sleep(500);
    target = await fetch(`http://127.0.0.1:${PORT}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null);
  }
  if (!target) throw new Error('Edge did not start');
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let seq = 0;
  const pending = new Map();
  let dataRequestId = null, dataDone = false;
  ws.onmessage = (e) => {
    const m = JSON.parse(e.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); return; }
    if (m.method === 'Network.responseReceived' && /\/api\/contract-team-reporting(\?|$)/.test(m.params.response.url)) dataRequestId = m.params.requestId;
    if ((m.method === 'Network.loadingFinished' || m.method === 'Network.loadingFailed') && m.params.requestId === dataRequestId) dataDone = true;
  };
  const send = (method, params = {}) => new Promise((r) => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
  await send('Network.enable');
  await send('Page.enable');
  await send('Page.navigate', { url: `${BASE}/contract-team-reporting` });
  await sleep(3000);
  await evaluate(`localStorage.setItem('property-review-user-email', JSON.stringify('john.t@buyersclub.com.au'))`);

  const out = [];
  for (const view of VIEWS) {
    await evaluate(`localStorage.setItem('ctr-view-id', ${JSON.stringify(view)})`);
    dataRequestId = null; dataDone = false;
    await send('Page.reload', { ignoreCache: true });
    const t0 = Date.now();
    while (!dataDone && Date.now() - t0 < 180000) await sleep(500);
    // Wait for the grid to render the loaded data (header count + view name), up to 20 s.
    let r = {};
    for (let i = 0; i < 40 && !(r.count !== null && r.count !== undefined && r.view); i++) {
      await sleep(i === 0 ? 2500 : 500);
      const read = await evaluate(`(() => {
        const spans = [...document.querySelectorAll('span')];
        const n = spans.find((s) => /^\\d+ records$/.test(s.textContent.trim()));
        const v = spans.find((s) => s.textContent.trim().startsWith('View: '));
        return JSON.stringify({ count: n ? parseInt(n.textContent, 10) : null, view: v ? v.textContent.trim().replace(/^View: /, '').split(' | ')[0] : '' });
      })()`);
      r = JSON.parse(read || '{}');
    }
    out.push({ id: view, name: r.view, count: dataDone ? r.count : null });
    console.log(`${view}\t${r.view}\t${dataDone ? r.count : 'TIMEOUT'}`);
  }
  mkdirSync('scripts/tmp-ctrt-out', { recursive: true });
  const file = `scripts/tmp-ctrt-out/page-counts-${new Date().toISOString().slice(0, 10)}.json`;
  writeFileSync(file, JSON.stringify(out, null, 2));
  console.log(`Saved ${file}`);
  ws.close();
} finally {
  edge.kill();
}
