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
swap('<span class="step">${i+1}</span>', '<span class="step">${list0.slice(0,i+1).filter(x=>!x.detached).length}</span>');
swap('Stage ${idx+1} of ${steps} · ', 'Stage ${list.slice(0,idx+1).filter(x=>!x.detached).length} of ${steps} · ');
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
    const right=rows[0][rows[0].length-1].offsetLeft+rows[0][rows[0].length-1].offsetWidth;
    rows.forEach((r,k)=>{
      if(k>0){ const w=r[r.length-1].offsetLeft+r[r.length-1].offsetWidth-r[0].offsetLeft; r[0].style.marginLeft=Math.max(0,right-w)+"px"; r[0].classList.add("wrap-first"); }
      if(k<rows.length-1){ const end=r[r.length-1]; end.classList.add("wrap-last","wrap-down"); }
    });
    rows.forEach((r,k)=>{ if(k<rows.length-1){ const end=r[r.length-1], below=rows[k+1][rows[k+1].length-1]; end.style.setProperty("--drop",(below.offsetTop-end.offsetTop)+"px"); } });
  });
}
let fixWrapT; window.addEventListener("resize",()=>{clearTimeout(fixWrapT); fixWrapT=setTimeout(fixWrap,80);});

function renderPanel(){`);

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
.node.wrap-first::before{left:50%}
.node.wrap-last::before{right:50%}
.node.wrap-down::after{content:"";position:absolute;left:calc(50% - 1.5px);top:34px;width:3px;height:var(--drop,0);background:var(--line);z-index:0}
.node.hold{width:104px;opacity:.7}
.node.hold .circle{width:88px;height:50px;border-color:var(--line);border-style:dashed;border-width:2px}
.node.hold .circle b{font-size:16px;color:var(--muted)}
.node.hold .name{font-size:11px;font-weight:600;color:var(--muted)}
</style>`);

if (/OPP-2\d{4}|Sample Estate|seed\(o\.ref\)/.test(html)) throw new Error('Sample data still present in the template');

const out = `// Generated by scripts/build-journey-template.mjs from the Journey Map mock-up (v0.21). Do not edit by hand.\n/* eslint-disable */\nexport const JOURNEY_TEMPLATE = ${JSON.stringify(html)};\n`;
fs.writeFileSync(new URL('../src/app/(tools)/journey/journeyTemplate.ts', import.meta.url), out);
console.log(`journeyTemplate.ts written (${html.length} chars)`);
