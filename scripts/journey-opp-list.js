  // Opportunity Progress: collapsible sections (Property Team stage, then Finance / Construction pipeline until cutover).
  // Lane headers are repeated at the top of each section and stay sticky while it scrolls.
  const head=`<div class="d head"><span class="f-lbl">Opportunity</span>${ROW_LANES.map(l=>`<span class="f-lbl">${LANES[l].name}</span>`).join("")}</div>`;
  const row=o=>`<div class="item${o.ref===openRef?" open":""}${o.short?" short":""}"><div class="d" role="button" tabindex="0" aria-expanded="${o.ref===openRef}" data-ref="${o.ref}">
      <div style="min-width:0"><div class="o-name" title="${esc(o.name)}">${esc(o.name)}</div>
        ${addr(o)}
        <div class="d-sub"><span>${esc(o.client)}</span>${ptype(o)}</div></div>
      ${ROW_LANES.map(l=>seg(o,l)).join("")}
    </div>${o.ref===openRef?detail(o):""}</div>`;
  const order=[...GROUP_ORDER, ...[...new Set(OPPS.map(o=>o.group||"Other"))].filter(g=>!GROUP_ORDER.includes(g))];
  const groups=order.map(g=>[g,OPPS.filter(o=>(o.group||"Other")===g)]).filter(([,l])=>l.length);
  if(!openGroups) openGroups=new Set(groups.length?[groups[0][0]]:[]);
  const dups=OPPS_ALL.filter(o=>o.smsfDup).length;
  const toggle=dups?`<label class="dup-toggle"><input type="checkbox" id="hide-dup"${hideDup?" checked":""}> Hide SMSF Construction duplicates (${dups})</label>`:"";
  const bar=`<div class="grp-bar">${toggle}<span class="grp-btns"><button type="button" class="grp-all" data-all="1">Expand all</button><button type="button" class="grp-all" data-all="0">Collapse all</button></span></div>`;
  return `${bar}<div class="d-wrap"><div class="d-table">${groups.map(([g,l])=>`<details class="grp" data-grp="${esc(g)}"${openGroups.has(g)?" open":""}><summary><span class="grp-name">${esc(g)}</span><span class="grp-n">${l.length}</span></summary>${head}${l.map(row).join("")}</details>`).join("")}</div></div>`;
