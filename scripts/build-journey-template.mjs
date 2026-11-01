// Builds src/app/(tools)/journey/journeyTemplate.ts from Claude's Journey Map mock-up (v0.21.html):
// keeps its markup, CSS and rendering, and swaps the sample arrays for window.JOURNEY (live data from /journey).
// Usage: node scripts/build-journey-template.mjs "<path to v0.21.html>"
import fs from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Pass the path to the mock-up HTML');
let html = fs.readFileSync(src, 'utf8').replace(/\r\n/g, '\n');

function swap(from, to) {
  if (!html.includes(from)) throw new Error(`Mock-up text not found: ${from.slice(0, 80)}`);
  html = html.replace(from, to);
}
function swapBetween(start, end, to) {
  const a = html.indexOf(start);
  const b = html.indexOf(end, a + start.length);
  if (a < 0 || b < 0) throw new Error(`Mock-up block not found: ${start.slice(0, 60)} … ${end.slice(0, 40)}`);
  html = html.slice(0, a) + to + html.slice(b);
}

swap('<span class="sample">Mock-up · sample data only</span>', '<span class="sample">Live from GHL · read-only</span>');
swap('<span class="asof">As at Sat 31 Oct 2026</span>', '<span class="asof" id="asof"></span>');

// ---- Journey tabs (Sales & Property, Construction, Finance): periods and stage lists from live data
swapBetween('const TODAY = new Date(2026, 9, 31);\nconst D = ', '\n\nconst PHASES', `const J = window.JOURNEY;
const pd = s => { const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(s || ""); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
const TODAY = pd(J.today);
const D = (y,m,d)=>new Date(y,m-1,d);
const addD = (d,n)=>new Date(d.getFullYear(), d.getMonth(), d.getDate()+n);
const MON = addD(TODAY, -((TODAY.getDay()+6)%7));
const FY = new Date(TODAY.getMonth()>=6 ? TODAY.getFullYear() : TODAY.getFullYear()-1, 6, 1);
const MONTH1 = new Date(TODAY.getFullYear(), TODAY.getMonth(), 1);
document.getElementById("asof").textContent = "As at " + TODAY.toLocaleDateString("en-AU",{weekday:"short",day:"numeric",month:"short",year:"numeric"});
const PERIODS = {
  today:    {label:"Today",       range:[TODAY, TODAY]},
  tomorrow: {label:"Tomorrow",    range:[addD(TODAY,1), addD(TODAY,1)]},
  week:     {label:"This week",   range:[MON, TODAY]},
  weekAll:  {label:"This week",   range:[MON, addD(MON,6)]},
  month:    {label:"This month",  range:[MONTH1, TODAY]},
  ytd:      {label:"YTD",         range:[FY, TODAY], sub:"FY from 1 Jul"},
  ever:     {label:"All",         range:[D(2000,1,1), TODAY], sub:"Everything now in this stage", all:true},
  lastDay:  {label:"Yesterday",   range:[addD(TODAY,-1), addD(TODAY,-1)]},
  lastWeek: {label:"Last week",   range:[addD(MON,-7), addD(MON,-1)]},
  lastMonth:{label:"Last month",  range:[new Date(TODAY.getFullYear(), TODAY.getMonth()-1, 1), addD(MONTH1,-1)]},
};`);

swapBetween('const STD = [', '\nconst COLS = {', `const STD = ["today","week","month","ytd","ever"];
// Rows are the opportunities now in each stage; "entered" = the stage change date (blank dates only count under All).
const inRange = (rows, pkey) => { const P = PERIODS[pkey]; if (P.all) return rows; const [a,b] = P.range; return rows.filter(x => x.d && x.d >= a && x.d <= b); };
const STAGES = J.stages, BUILD = J.build, FINANCE = J.finance;
const JOURNEYS = {sales:STAGES, construction:BUILD, finance:FINANCE,
  fallen:[{id:"fallen", phase:"fallen", name:"Deals Fallen Over", kind:"opp", rows:[]}],
  valshort:[{id:"valshort", phase:"valshort", name:"Val Shortfall", kind:"opp", rows:[]}]};
Object.values(JOURNEYS).flat().forEach(s=>{
  s.periods = s.periods || STD; s.head = s.head || "week";
  s.rows.forEach(x => { x.d = pd(x.date); });
  s.counts = {}; if (s.hasLand) s.land = {};
  s.periods.forEach(p => { const rs = inRange(s.rows, p); s.counts[p] = rs.length; if (s.land) s.land[p] = rs.filter(x => x.land).length; });
});
const DETAIL_CONSULTANTS = J.consultants;
const BAS = J.bas;
const fmt=d=>d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
const fmtT=d=>d.toLocaleString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
const DAY=86400000;

function records(stage, pkey, onlyMatches, onlyLand){
  const rows = inRange(stage.rows, pkey);
  const out = onlyLand ? rows.filter(x=>x.land) : rows.slice();
  out.sort((x,y)=>(y.d||0)-(x.d||0));
  return out;
}
`);
const NOT_SET = `'<span class="more">Not set</span>'`;
swap('const selBy={sales:"contacts", construction:"b-preba", finance:"f-pending",', 'const selBy={sales:STAGES[0].id, construction:BUILD[0].id, finance:FINANCE[0].id,');
swap('["Entered stage",x=>fmt(x.d)]', `["Entered stage",x=>x.d?fmt(x.d):${NOT_SET}]`);
swap('["Days in stage",x=>Math.max(0,', `["Days in stage",x=>!x.d?${NOT_SET}:Math.max(0,`);
swap('<p class="cols-note">Columns are placeholders. JT and Devin will define what each list shows per stage.</p>', '');

// ---- Opportunity Progress / Valuations / Deals Fallen Over: live opportunities
swap('const TODAY = new Date(2026, 9, 31);\nconst DAY = 86400000;\nconst LANES', 'const TODAY = (([y,m,d])=>new Date(y,m-1,d))(window.JOURNEY.today.split("-").map(Number));\nconst DAY = 86400000;\nconst LANES');
swap('est:{label:"ESTABLISHED",c:"var(--t-est)"}};', 'est:{label:"ESTABLISHED",c:"var(--t-est)"}, nopr:{label:"NO RECORD",c:"var(--muted)"}};');
swap('const CONSULTANTS = ["Consultant A","Consultant B","Consultant C"];', 'const CONSULTANTS = window.JOURNEY.consultants;');
swapBetween('// Current person per lane (sample placeholders)', '\nconst CFG = ', 'const ACTORS = {};');
swapBetween('/* Sample opportunities.', '\nfunction states(', `/* Live opportunities (built on /journey from the CTRT API).
   c: Property Team stage index (6 = settled, -1 = before Deal Closed); fin: Finance Status index (4 = formally approved,
   null = Not Tracked, missing = blank); build: Construction stage index; prop: Property Record status index. */
const OPPS = window.JOURNEY.opps;
const FALLEN = window.JOURNEY.fallen;
const pdate = s => { const m = /^(\\d{4})-(\\d{2})-(\\d{2})/.exec(s || ""); return m ? new Date(+m[1], m[2] - 1, +m[3]) : null; };
[...OPPS,...FALLEN].forEach(o=>{
  o.actors = {};
  o.finDue = pdate(o.finDue);
  o.settle = pdate(o.settle);
  o.valDate = pdate(o.valDate) || new Date(0);
  o.date = o.date || "";
});
`);
swap('      slot=`<span class="days', '      if(d!=null) slot=`<span class="days');
swap('OPPS.filter(o=>o.fin!=null && o.fin>=1)', 'OPPS.filter(o=>o.valStep>=0 || o.short)');
swap('(a.fin-b.fin)', '((a.fin??-1)-(b.fin??-1))');
swap('const PERIOD_FROM = {today:day0(TODAY), week:new Date(2026,9,26), month:new Date(2026,9,1), quarter:new Date(2026,9,1), ytd:new Date(2026,6,1)};',
  'const PERIOD_FROM = {today:day0(TODAY), week:new Date(TODAY.getFullYear(),TODAY.getMonth(),TODAY.getDate()-((TODAY.getDay()+6)%7)), month:new Date(TODAY.getFullYear(),TODAY.getMonth(),1), quarter:new Date(TODAY.getFullYear(),Math.floor(TODAY.getMonth()/3)*3,1), ytd:new Date(TODAY.getMonth()>=6?TODAY.getFullYear():TODAY.getFullYear()-1,6,1)};');

// Row detail: live prices, statuses, dates and people
swap('const money=n=>"$"+n.toLocaleString("en-AU");', 'const money=n=>n==null||isNaN(n)?"Not set":"$"+n.toLocaleString("en-AU");');
swapBetween('  const r=seed(o.ref), round=n=>Math.round(n/1000)*1000;', '\n  const st=(state,word)', '  const prices = o.prices;');
swapBetween('  if(isNew) status.push(["Registration"', '\n  if(o.reselling)', `  const word=(v,doneRe)=>!v?st("todo","Not set"): doneRe.test(v)?st("done",v):st("doing",v);
  if(isNew) status.push(["Registration", word(o.landReg,/^registered$/i)]);
  status.push(["B&P", word(o.bp,/complete|satisfied|approved|passed/i)]);
  status.push(["Valuation", valWord]);
  status.push(["PCI", !isNew?st("todo","Not applicable"): word(o.pci,/complete|passed|done/i)]);`);
swap('    const cd=d=>{const c=countdown(d);', '    const cd=d=>{if(!d) return `<span class="pill todo"><i></i>Not set</span>`; const c=countdown(d);');
swap('`<span class="pill done"><i></i>Settled ${fmt(o.settle)}</span>`', '`<span class="pill done"><i></i>Settled${o.settle?" "+fmt(o.settle):""}</span>`');
swap('const people=[["Consultant",o.consultant],["Contract",o.actors.contract],["Finance",o.fin===null?"Not tracked":o.actors.finance],["Construction",isNew?o.actors.build:"Not applicable"]];',
  'const people=[["Consultant",o.consultant||"Not set"],["Assigned BA",o.ba||"Not set"],["Contact",o.client||"Not set"]];');
swap('<div class="tbc">Fields to be confirmed · sample values</div>', '<div class="tbc">Live from GHL · read-only · <a href="${esc(o.ghlLink)}" target="_blank" rel="noopener noreferrer">Open in GHL</a></div>');

if (/OPP-2\d{4}|Sample Estate|seed\(o\.ref\)/.test(html)) throw new Error('Sample data still present in the template');

const out = `// Generated by scripts/build-journey-template.mjs from the Journey Map mock-up (v0.21). Do not edit by hand.\n/* eslint-disable */\nexport const JOURNEY_TEMPLATE = ${JSON.stringify(html)};\n`;
fs.writeFileSync(new URL('../src/app/(tools)/journey/journeyTemplate.ts', import.meta.url), out);
console.log(`journeyTemplate.ts written (${html.length} chars)`);
