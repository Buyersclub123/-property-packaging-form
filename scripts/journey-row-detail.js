function detail(o){
  // Expanded opportunity row (live, read-only). Blank values follow the empty-cell rule.
  const NS='<span class="ns">Not set</span>', muted=t=>`<span class="ns">${t}</span>`;
  const val=v=>v==null||v===""?NS:`<b>${esc(String(v))}</b>`;
  const kv=(k,v)=>`<div class="kv"><span>${k}</span>${v}</div>`;
  const dt=d=>{if(typeof d==="string") d=pdate(d); return d?`<b>${fmt(d)}</b>`:NS};
  const tick=(k,on)=>`<span class="pill ${on?"done":"todo"}"><i></i>${k}</span>`;
  const days=n=>n==null?"":` <span class="cd soft">${n} day${n===1?"":"s"}</span>`;
  const word=(v,doneRe)=>!v?NS:`<span class="pill ${doneRe.test(v)?"done":"doing"}"><i></i>${esc(v)}</span>`;
  const isNew=o.type!=="est";

  const prices=o.prices||[], closing=prices.length?prices[0][1]:null;
  const short=!!o.short||(o.valAmt!=null&&closing!=null&&o.valAmt<closing);
  const valLine=o.valAmt==null?NS:`<b>${money(o.valAmt)}</b>${closing!=null?` <span class="more">vs ${money(closing)}</span>`:""}${short?` <span class="cap alert">Shortfall</span>`:""}`;
  const moneyB=`<div class="dt-group"><span class="f-lbl">Money</span>
    ${kv("Closing price",closing==null?NS:`<b>${money(closing)}</b>`)}
    ${prices.slice(1).map(([k,v])=>kv(`<span class="sub">${k}</span>`,v==null?NS:`<b>${money(v)}</b>`)).join("")}
    ${kv("Deposit paid",`<span class="ticks">${tick("Land",o.landDep)}${isNew?tick("Build",o.buildDep):""}</span>`)}
    ${kv("Valuation",valLine)}
    ${kv("Beds / baths / cars",val(o.format))}</div>`;

  const datesB=o.fell?`<div class="dt-group"><span class="f-lbl">Fell over</span>
      ${kv("Date",dt(o.date))}
      ${kv("Stage",`<b>${LANES[o.fell.lane].stages[o.fell.i]}</b>`)}
      ${kv("Reason",`<b class="alert-txt">${esc(o.reason||"")}</b>`)}</div>`
    :`<div class="dt-group"><span class="f-lbl">Dates</span>
      ${kv("Purchase date",dt(o.purchase))}
      ${kv("Exchange",dt(o.exchange))}
      ${kv("Unconditional",dt(o.uncond))}
      ${kv("Finance due",dt(o.finDue))}
      ${kv("Confirmed settlement",dt(o.settle))}
      ${kv("Land registration",isNew?val(o.landReg):muted("Not applicable"))}</div>`;

  const d=o.days||{};
  const valLabel=short?"Shortfall":o.valStep>=6?"Outcome received":o.valStep>=1?LANES.val.stages[o.valStep-1]:"Not started";
  const progressB=`<div class="dt-group"><span class="f-lbl">Progress</span>
    ${kv("Finance Status",o.finStatus?`<b>${esc(o.finStatus)}</b>${days(d.finance)}`:NS)}
    ${kv("Construction stage",!isNew?muted("Not applicable"):o.type==="nopr"?muted("No record"):o.buildStage?`<b>${esc(o.buildStage)}</b>${days(d.build)}`:muted("Not started"))}
    ${kv("Registration",isNew?word(o.landReg,/^registered$/i):muted("Not applicable"))}
    ${kv("Valuation",`<span class="val-marks dt-val" aria-label="Valuation steps">${states(o,"val").map((s,i)=>`<i class="${s}" ${tip("val",i,s)}></i>`).join("")}</span> <span class="more">${esc(valLabel)}</span>`)}
    ${kv("B&amp;P condition",word(o.bp,/complete|satisfied|approved|passed/i))}
    ${kv("PCI",!isNew?muted("Not applicable"):word(o.pci,/complete|passed|done/i))}</div>`;

  const peopleB=`<div class="dt-group"><span class="f-lbl">People</span>
    ${kv("Consultant",val(o.consultant))}
    ${kv("Assigned BA",val(o.ba))}
    ${kv("Contact",val(o.client))}
    ${kv("Broker",val(o.broker))}
    ${kv("Solicitor",val(o.solicitor))}
    ${kv("Builder",val(o.builder))}</div>`;

  const long=o.latest&&(o.latest.length>160||o.latest.split("\n").length>2);
  const latestB=`<div class="dt-group dt-latest"><span class="f-lbl">Latest status update</span>
    ${o.latest?`<div class="lsu">${esc(o.latest)}</div>${long?`<button type="button" class="lsu-more" onclick="var l=this.previousElementSibling;l.classList.toggle('full');this.textContent=l.classList.contains('full')?'Show less':'Show more'">Show more</button>`:""}`:NS}</div>`;

  return `<div class="detail d4">
    ${moneyB}${datesB}${progressB}${peopleB}
    ${latestB}
    <div class="d-foot"><div class="tbc">Live from GHL · read-only · <a href="${esc(o.ctrtLink||"/contract-team-reporting")}" target="_blank" rel="noopener noreferrer">Open in CTRT</a> · <a href="${esc(o.ghlLink||"")}" target="_blank" rel="noopener noreferrer">Open in GHL</a></div>
      <button class="collapse" data-collapse="${o.ref}">Collapse <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m3 7.5 3-3 3 3"/></svg></button></div>
  </div>`;
}
