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
  d1:       {label:"Last 24 hours", range:[addD(TODAY,-1), TODAY]},
  d7:       {label:"Last 7 days",   range:[addD(TODAY,-6), TODAY]},
  ever:     {label:"All",         range:[D(2000,1,1), TODAY], sub:"Everything now in this stage", all:true},
  lastDay:  {label:"Yesterday",   range:[addD(TODAY,-1), addD(TODAY,-1)]},
  lastWeek: {label:"Last week",   range:[addD(MON,-7), addD(MON,-1)]},
  lastMonth:{label:"Last month",  range:[new Date(TODAY.getFullYear(), TODAY.getMonth()-1, 1), addD(MONTH1,-1)]},
};`);

swapBetween('const STD = [', '\nconst COLS = {', `const STD = ["d1","d7","ever"]; // quick snapshot: now + last 24 hours / last 7 days
// Rows are the opportunities now in each stage; "entered" = the stage change date (blank dates only count under All).
const inRange = (rows, pkey) => { const P = PERIODS[pkey]; if (P.all) return rows; const [a,b] = P.range; return rows.filter(x => x.d && x.d >= a && x.d <= b); };
const STAGES = J.stages, BUILD = J.build, FINANCE = J.finance;
const JOURNEYS = {sales:STAGES, construction:BUILD, finance:FINANCE,
  fallen:[{id:"fallen", phase:"fallen", name:"Deals Fallen Over", kind:"opp", rows:[]}],
  valshort:[{id:"valshort", phase:"valshort", name:"Val Shortfall", kind:"opp", rows:[]}]};
Object.values(JOURNEYS).flat().forEach(s=>{
  s.periods = s.periods || STD; s.head = s.head || "d7";
  s.rows.forEach(x => { x.d = pd(x.date); });
  s.counts = {}; if (s.hasLand) s.land = {};
  [...new Set([...s.periods, "ever"])].forEach(p => { const rs = inRange(s.rows, p); s.counts[p] = rs.length; if (s.land) s.land[p] = rs.filter(x => x.land).length; });
});
const DETAIL_CONSULTANTS = J.consultants;
const BAS = J.bas;
const fmt=d=>d.toLocaleDateString("en-AU",{day:"numeric",month:"short",year:"numeric"});
const fmtT=d=>d.toLocaleString("en-AU",{weekday:"short",day:"numeric",month:"short",hour:"numeric",minute:"2-digit"});
const DAY=86400000;

function records(stage, pkey, onlyMatches, onlyLand){
  const rows = inRange(stage.rows, pkey);
  const out = onlyLand ? rows.filter(x=>x.land) : rows.slice();
  out.sort((x,y)=>(x.d?x.d.getTime():Infinity)-(y.d?y.d.getTime():Infinity)); // longest in stage first; unknown dates last
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

// Drill-down: sortable columns; default oldest stage entry first so long-stayers stand out.
swap('  const shown=rows.slice(0,100), filtered=rows.length!==all.length;',
  `  if(dSort.i>=0 && cols[dSort.i]){ const v=x=>{const t=String(cols[dSort.i][1](x)).replace(/<[^>]+>/g,"").trim(); const n=Number(t.replace(/[$,]/g,"")); return t===""||t==="Not set"?null:!isNaN(n)&&/\\d/.test(t)?n:t.toLowerCase();};
    rows.sort((a,b)=>{const x=v(a),y=v(b); if(x===y) return 0; if(x==null) return 1; if(y==null) return -1; return (x<y?-1:1)*dSort.dir;}); }
  const shown=rows.slice(0,100), filtered=rows.length!==all.length;`);
swap('<thead><tr>${cols.map(c=>`<th>${c[0]}</th>`).join("")}</tr></thead>',
  '<thead><tr>${cols.map((c,i)=>`<th data-sort="${i}" style="cursor:pointer" title="Sort">${c[0]}${dSort.i===i?(dSort.dir>0?" ▲":" ▼"):""}</th>`).join("")}</tr></thead>');
swap('let dq="", dCons="", dBA="", dSat="";', 'let dq="", dCons="", dBA="", dSat="", dSort={i:-1,dir:1};\npanel.addEventListener("click",e=>{const th=e.target.closest&&e.target.closest("th[data-sort]"); if(!th) return; const i=+th.dataset.sort; dSort = dSort.i===i ? {i, dir:-dSort.dir} : {i, dir:/Days/.test(th.textContent)?-1:1}; refreshDetail();});');

// On Hold marker (detached, grey) at the start of Property Team; step numbers skip detached tiles.
swap('const first=i===0||s.detached||(stair&&list0[i-1].phase!==s.phase),', 'const first=i===0||s.detached||list0[i-1].detached||(stair&&list0[i-1].phase!==s.phase),');
swap('<button class="node${first?" first":""}${last?" last":""}"', '<button class="node${first?" first":""}${last?" last":""}${s.hold?" hold":""}"');
// No stage-number badges on tiles (stages are still changing).
swap('<span class="step">${i+1}</span>', '');
swap('Stage ${idx+1} of ${steps} · ', '');
// A lane wider than the screen continues on the row below, right-aligned under the last tile, joined by a drop line.
swap('    </div>`).join("");\n}\n\nfunction renderPanel(){', `    </div>\`).join("");
  fixWrap();
}
function fixWrap(){
  track.querySelectorAll(".nodes").forEach(box=>{
    const nodes=[...box.children];
    nodes.forEach(nd=>{nd.style.marginLeft="";nd.style.removeProperty("--drop");nd.classList.remove("wrap-first","wrap-last","wrap-down");});
    const rows=[]; nodes.forEach(nd=>{const r=rows[rows.length-1]; if(r&&r[0].offsetTop===nd.offsetTop) r.push(nd); else rows.push([nd]);});
    if(rows.length<2) return;
    // Overflow tiles sit directly below the last tile of the row above, joined by a short vertical line.
    for(let k=1;k<rows.length;k++){
      const above=rows[k-1][rows[k-1].length-1], first=rows[k][0];
      first.style.marginLeft=Math.max(0,above.offsetLeft-first.offsetLeft)+"px"; first.classList.add("wrap-first");
      above.classList.add("wrap-last","wrap-down"); above.style.setProperty("--drop",(first.offsetTop-above.offsetTop)+"px");
    }
  });
}
let fixWrapT; window.addEventListener("resize",()=>{clearTimeout(fixWrapT); fixWrapT=setTimeout(fixWrap,80);});

function renderPanel(){`);

// Reconciliation: "All" prominent, a ≠ GHL flag on tiles whose All differs, and the per-stage reconciliation panel.
// One number per tile: All (bold). Period movement stays in the panel below.
swap('<b>${n(s.counts[s.head])}</b><small>${PERIODS[s.head].label.toLowerCase()}</small></span>',
  '<b>${n(s.counts[s.tileKey||"ever"])}</b><small>${s.tileKey?PERIODS[s.tileKey].label.toLowerCase():"now"}</small>${s.mismatch?`<i class="neq" title="All differs from GHL: see reconciliation">≠ GHL</i>`:""}</span>');
// Counts supplied by the server (e.g. GHL contacts) are used as-is.
swap('  s.counts = {}; if (s.hasLand) s.land = {};\n  [...new Set', '  s.counts = s.fixedCounts || {}; if (s.hasLand) s.land = {};\n  if (!s.fixedCounts) [...new Set');
swap('    <div class="cards">${cards}</div>\n', '    <div class="cards">${cards}</div>\n    ${s.recon||""}\n');
// Derived filter chips (not stages) on the Finance tab.
swap('const list0=JOURNEYS[tab], sel=selBy[tab], groups={};', 'const list0=JOURNEYS[tab].filter(s=>!s.chip), sel=selBy[tab], groups={};');
swap('  fixWrap();\n}\nfunction fixWrap(){', `  const nw=JOURNEYS[tab].filter(s=>s.notWired);
  if(nw.length){ const ph=track.querySelector('.node[data-id="'+nw[0].id+'"]')?.closest(".phase"); if(ph) ph.insertAdjacentHTML("beforeend", '<div class="nw-overlay">Sales figures coming — these tiles will read from the Review Outcomes tool and GHL contacts. Nothing to do here yet.</div>'); }
  if(tab==="sales" && J.salesAsAt){ const h=track.querySelector('.node[data-id="contacts"]')?.closest(".phase")?.querySelector(".phase-head"); if(h) h.insertAdjacentHTML("beforeend", '<span class="asat">as at '+new Date(J.salesAsAt).toLocaleTimeString("en-AU",{hour:"2-digit",minute:"2-digit",timeZone:"Australia/Sydney"})+' (refreshes every 15 min)</span>'); }
  const chips=JOURNEYS[tab].filter(s=>s.chip);
  if(chips.length) track.insertAdjacentHTML("beforeend", \`<div class="chipbar"><span class="chipbar-lbl">Derived filters (not stages)</span>\${chips.map(c=>\`<button class="node chip" data-id="\${c.id}" aria-pressed="\${c.id===sel}">\${esc(c.name)} <b>\${n(c.counts.ever)}</b>\${c.mismatch?'<i class="neq">≠ GHL</i>':""}</button>\`).join("")}</div>\`);
  fixWrap();
}
function fixWrap(){`);

// Tiles with no data source yet: count 0 plus a "not wired" note (never removed).
swap('<span class="name">${s.name}</span>', '<span class="name">${s.name}</span>${s.notWired?`<small class="nw">not wired</small>`:""}');
swap('    ${stageDef(s)}\n', '    ${stageDef(s)}\n    ${s.notWired?`<p class="hint nw">Not wired yet: no data source for this tile, so it shows 0.</p>`:""}\n');
// No linked Property Record: Construction and Property Record lanes read "No record".
swap('if(o.type==="est") return null;', 'if(o.type==="est"||o.type==="nopr") return null;');
swap('} else if(lane==="prop"){', '} else if(lane==="prop"){\n    if(o.type==="nopr") return null;');
swap('if(!st) return {t:"Not applicable",cls:"state-todo"};', 'if(!st) return {t:o.type==="nopr"&&(lane==="prop"||lane==="build")?"No record":"Not applicable",cls:"state-todo"};');
// Contract lane estimated from dates (opps outside Property Team): dotted bar + tooltip.
swap('<div class="bar">${st.map((s,i)=>`<i class="${s}" ${tip(l,i,s,o)}></i>`).join("")}</div>',
  '<div class="bar${l==="contract"&&o.cEst?" est":""}"${l==="contract"&&o.cEst?` title="estimated from dates"`:""}>${st.map((s,i)=>`<i class="${s}" ${l==="contract"&&o.cEst?"":tip(l,i,s,o)}></i>`).join("")}</div>');
swap('</style>', `#opp .seg .bar.est i{background:transparent;box-shadow:inset 0 0 0 1.5px var(--todo);outline:none}
#opp .seg .bar.est i.done{background:transparent;box-shadow:none;border:1.5px dotted var(--done)}
#opp .seg .bar.est i.doing{background:transparent;box-shadow:none;border:1.5px dotted var(--doing)}
.nw{display:block;font-size:10px;font-style:italic;color:var(--muted)}
.asat{font-weight:600;letter-spacing:0;text-transform:none;margin-left:6px}
.node.wrap-first::before{left:50%}
.node.wrap-last::before{right:50%}
.node.wrap-down::after{content:"";position:absolute;left:calc(50% - 1.5px);top:34px;width:3px;height:var(--drop,0);background:var(--line);z-index:0}
.node.hold{width:124px;opacity:.7}
.node.hold .circle{width:112px;height:50px;border-color:var(--line);border-style:dashed;border-width:2px}
.node .name{position:relative;z-index:1;background:var(--bg);padding:0 2px}
/* One page at laptop width: smaller tiles, sections stacked left-aligned (no staircase). */
.track.stair .phase,.track.stair .phase:first-child,.track.stair .phase:last-child{align-self:flex-start}
.node{width:118px;gap:6px}
.node::before,.node.wrap-down::after{top:28px}
.circle{width:106px;height:58px;border-radius:12px}
.circle b{font-size:22px}
.node .name{font-size:11.5px;max-width:112px}
.node.hold{width:96px}
.node.hold .circle{width:84px;height:46px}
.phase{position:relative}
.nw-overlay{position:absolute;inset:22px -4px -4px -4px;display:flex;align-items:center;justify-content:center;text-align:center;padding:8px 16px;background:rgba(255,255,255,.78);backdrop-filter:blur(1px);border:1.5px dashed var(--line);border-radius:12px;font-size:13px;font-weight:600;color:var(--muted);z-index:3}
.node.hold .circle b{font-size:16px;color:var(--muted)}
.node.hold .name{font-size:11px;font-weight:600;color:var(--muted)}
.circle small b.all{font-weight:800;color:var(--ink)}
.neq{position:absolute;bottom:-9px;left:50%;transform:translateX(-50%);font-style:normal;font-size:9.5px;font-weight:700;color:#fff;background:#C2410C;border-radius:999px;padding:1px 6px;white-space:nowrap}
.card[data-period="ever"]{border:2px solid var(--ink)}
.card[data-period="ever"] .num{font-size:36px}
.recon-wrap{background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 16px;display:flex;flex-direction:column;gap:10px}
.recon-wrap h4{margin:0;font-size:13px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.recon table{border-collapse:collapse;font-size:13px;min-width:320px}
.recon td{padding:3px 10px 3px 0}
.recon td.n{text-align:right;font-variant-numeric:tabular-nums;font-weight:700}
.recon tr.bad td{color:#C2410C}
.recon tr.ok td,.recon p.ok{color:#15803D}
.recon ul{margin:6px 0 0;padding-left:18px;font-size:12.5px}
.recon details{display:inline;margin-left:6px}
.recon summary{display:inline;cursor:pointer;color:var(--muted);font-size:11.5px}
.recon + .recon{border-top:1px dashed var(--line);padding-top:10px}
.chipbar{flex-basis:100%;display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:6px}
.chipbar-lbl{font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--muted);margin-right:4px}
.chipbar .node.chip{width:auto;flex-direction:row;gap:6px;padding:5px 12px;border:1.5px dashed var(--line);border-radius:999px;font-size:12px;font-weight:600;background:var(--bg)}
.chipbar .node.chip::before{display:none}
.chipbar .node.chip .neq{position:static;transform:none}
.chipbar .node.chip[aria-pressed="true"]{border-style:solid;border-color:var(--brand-ink);background:var(--brand);color:var(--brand-ink)}
</style>`);

// Clicking a tile opens its record list straight away (All; movement-only tiles open on their head period).
swap('selBy[tab]=b.dataset.id;detail=null;render()});', 'selBy[tab]=b.dataset.id;const st=JOURNEYS[tab].find(x=>x.id===b.dataset.id);detail={period:st&&st.periods.includes("ever")?"ever":(st?st.head:"ever"),matches:false,land:false};render()});');
swap('</style>', '.recon-wrap>summary{cursor:pointer;font-weight:700;list-style:none}\n.recon-wrap>summary::-webkit-details-marker{display:none}\n.rok{color:#2e7d32}.rbad{color:#c62828}\n.rmore{font-size:12px;color:var(--muted);text-decoration:underline;font-weight:500;margin-left:8px}\n</style>');

// Duplicate contacts group (visibility only; merging is a later build).
swap('const OPP_KINDS=["opp","fin","property"];', 'COLS.dup=[["New contact",x=>x.client],["Existing match",x=>x.existing],["Match on",x=>x.why],["Created",x=>x.d?fmt(x.d):""],["Created by",x=>x.createdBy||\'<span class="more">Unknown</span>\'],["Existing since",x=>x.existingCreated]];\nPHASES.dups={name:"Duplicate contacts · new in the last 7 days",color:"var(--muted)"};\nconst OPP_KINDS=["opp","fin","property"];');

if (/OPP-2\d{4}|Sample Estate|seed\(o\.ref\)/.test(html)) throw new Error('Sample data still present in the template');

const out = `// Generated by scripts/build-journey-template.mjs from the Journey Map mock-up (v0.21). Do not edit by hand.\n/* eslint-disable */\nexport const JOURNEY_TEMPLATE = ${JSON.stringify(html)};\n`;
fs.writeFileSync(new URL('../src/app/(tools)/journey/journeyTemplate.ts', import.meta.url), out);
console.log(`journeyTemplate.ts written (${html.length} chars)`);
