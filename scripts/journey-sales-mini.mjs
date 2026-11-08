// Journey Sales: mini activity table under the Sales tiles (JT). Counts per Meeting source (default) or Consultant for the chosen period.
// Collapsible, collapsed by default; the open/closed choice is remembered in localStorage.
// Applied as exact-text swaps by build-journey-template.mjs; salesMini runs in the template page, so its globals live there.
/* global JOURNEYS, records, PERIODS, n, esc, miniBy, miniP, miniOpen */

function salesMini() {
  const opt = (v, label, cur) => `<option value="${v}"${v === cur ? ' selected' : ''}>${label}</option>`;
  const head = `<div class="mini-head"><button type="button" id="mini-tog" class="mini-tog" aria-expanded="${miniOpen}">${miniOpen ? '▾' : '▸'} Activity by</button><select id="mini-by">${opt('lead', 'Meeting source', miniBy)}${opt('cons', 'Consultant', miniBy)}</select><select id="mini-p">${['d1', 'd7'].map((p) => opt(p, PERIODS[p].label, miniP)).join('')}</select></div>`;
  if (!miniOpen) return `<div class="mini">${head}</div>`;
  const NR = 'Not recorded';
  const T = JOURNEYS.sales.filter((s) => s.phase === 'sales' && !s.chip && !s.detached);
  const lead = miniBy === 'lead';
  const skip = T.map((s) => !lead && s.kind === 'contact');
  const key = (s, x) => (lead ? x.meetingSource || NR : s.kind === 'contact' ? null : x.consultant || 'Not assigned');
  const m = new Map();
  const tot = T.map(() => 0);
  T.forEach((s, i) => records(s, miniP).forEach((x) => {
    const k = key(s, x);
    if (k == null) return;
    tot[i]++;
    if (!m.has(k)) m.set(k, T.map(() => 0));
    m.get(k)[i]++;
  }));
  const sum = (v) => v.reduce((a, b) => a + b, 0);
  const rows = [...m.entries()].sort((a, b) => Number(a[0] === NR) - Number(b[0] === NR) || sum(b[1]) - sum(a[1]));
  const cell = (v, i) => `<td>${skip[i] ? '—' : n(v)}</td>`;
  return `<div class="mini">${head}`
    + `<table><thead><tr><th>${lead ? 'Meeting source' : 'Consultant'}</th>${T.map((s) => `<th>${esc(s.short || s.name)}</th>`).join('')}</tr></thead><tbody>`
    + rows.map(([k, v]) => `<tr${k === NR ? ' class="nr"' : ''}><td>${esc(k)}</td>${v.map(cell).join('')}</tr>`).join('')
    + `<tr class="tot"><td>Total</td>${tot.map(cell).join('')}</tr></tbody></table></div>`;
}

const CSS = `.mini{margin:6px 8px 0;font-size:13px;max-width:620px}
.mini-head{display:flex;gap:8px;align-items:center;font-weight:600;margin-bottom:4px}
.mini-head select{font:inherit;font-weight:500;padding:2px 6px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)}
.mini-tog{font:inherit;font-weight:600;background:none;border:0;padding:0;cursor:pointer;color:var(--ink)}
.mini table{border-collapse:collapse;width:100%;background:var(--bg);border:1px solid var(--line)}
.mini th,.mini td{padding:4px 10px;border-bottom:1px solid var(--line);text-align:right;white-space:nowrap}
.mini th:first-child,.mini td:first-child{text-align:left}
.mini th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:var(--muted)}
.mini tr.tot td{font-weight:700}
.mini tr.nr td:first-child{color:#b42318;font-weight:600}
.phase.collapsed .mini{display:none}
`;

export const MINI_STATE = 'let miniBy="lead", miniP="d7", miniOpen=(()=>{try{return localStorage.getItem("journey:miniOpen")==="1"}catch{return false}})();';
export const MINI_LISTENERS = 'track.addEventListener("change",e=>{if(e.target.id==="mini-by"){miniBy=e.target.value;renderTrack()}if(e.target.id==="mini-p"){miniP=e.target.value;renderTrack()}});\n'
  + 'track.addEventListener("click",e=>{if(!e.target.closest("#mini-tog"))return;miniOpen=!miniOpen;try{localStorage.setItem("journey:miniOpen",miniOpen?"1":"0")}catch{}renderTrack()});\n';
export const MINI_CSS = CSS;
export const MINI_FN = salesMini.toString();

export const SALES_MINI_SWAPS = [
  ['.asat{', `${CSS}.asat{`],
  ['\nfunction renderTrack(){', `\n${MINI_STATE}\n${MINI_FN}\nfunction renderTrack(){`],
  [
    "(refreshes every 15 min)</span>'); }",
    "(refreshes every 15 min)</span>'); }\n  if(tab===\"sales\"){ const ph=track.querySelector('.node[data-id=\"contacts\"]')?.closest(\".phase\"); if(ph) ph.insertAdjacentHTML(\"beforeend\", salesMini()); }",
  ],
  ['panel.addEventListener("click",e=>{', `${MINI_LISTENERS}panel.addEventListener("click",e=>{`],
];
