// Walks the portal in a real browser and checks the ADDRESS BAR matches the page at every step.
// Usage: npx --yes playwright@1.47.0 ... (chromium must be installed). Read-only; prints PASS/FAIL per step.
import { chromium } from 'playwright';

const BASE = process.env.BASE || 'http://localhost:3000';
const NI = '/team/resources/new-initiatives';
const tools = ['journey', 'review-outcomes', 'portfolio', 'inbox-mining', 'purchase-analytics', 'guide'];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1366, height: 800 } });
page.setDefaultTimeout(120000);
let fails = 0;
const check = (label, want) => {
  const got = new URL(page.url()).pathname.replace(/\/$/, '') || '/';
  const ok = got === want;
  if (!ok) fails++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label.padEnd(58)} bar=${got}${ok ? '' : '  expected ' + want}`);
};
const settle = async () => { await page.waitForLoadState('domcontentloaded'); await page.waitForTimeout(1500); };

// 1. Home -> Resources -> New Initiatives
await page.goto(BASE + '/'); await settle(); check('home', '/');
await page.goto(BASE + NI); await settle(); check('New Initiatives direct', NI);

// 2. Each tool: tile click from New Initiatives, then Back, read the bar both times
for (const t of tools) {
  await page.goto(BASE + NI); await settle();
  const link = page.locator(`a[href="${NI}/${t}"]`).first();
  if (!(await link.count())) { console.log(`FAIL  tile for ${t} not found on New Initiatives`); fails++; continue; }
  await link.click(); await settle();
  check(`tile -> ${t}`, `${NI}/${t}`);
  // Back link: inside the Journey iframe for journey; top-level for the rest (guide is a static page)
  if (t === 'journey') {
    // let a background refresh happen (srcDoc change) before leaving, as a user would
    await page.waitForTimeout(4000);
    const frame = page.frames().find((f) => f !== page.mainFrame());
    const back = frame ? frame.locator('a.backlink') : page.locator('a:has-text("Back")');
    await back.first().click(); await settle();
  } else {
    const back = page.locator(`a[href="${NI}"]`).first();
    if (!(await back.count())) { console.log(`FAIL  Back link not found on ${t}`); fails++; continue; }
    await back.click(); await settle();
  }
  check(`${t} -> Back`, NI);
}

// 3. The exact JT path: Journey -> Back -> New Initiatives -> Sales Meeting Outcomes
await page.goto(BASE + `${NI}/journey`); await settle();
await page.waitForSelector('iframe', { timeout: 120000 }); await page.waitForTimeout(4000);
const fr = page.frames().find((f) => f !== page.mainFrame());
await fr.locator('a.backlink').first().click(); await settle();
check('JT path: Journey -> Back', NI);
await page.locator(`a[href="${NI}/review-outcomes"]`).first().click(); await settle();
check('JT path: -> Sales Meeting Outcomes', `${NI}/review-outcomes`);
await page.goBack(); await settle(); check('browser Back from Outcomes', NI);

// 4. Old flat URLs redirect to the new ones
for (const [oldP, newP] of [['/journey', `${NI}/journey`], ['/review-outcomes', `${NI}/review-outcomes`], ['/new-initiatives', NI], ['/guide', `${NI}/guide`]]) {
  await page.goto(BASE + oldP); await settle(); check(`redirect ${oldP}`, newP);
}

await browser.close();
console.log(fails ? `\n${fails} FAIL(S)` : '\nALL PASS');
process.exit(fails ? 1 : 0);
