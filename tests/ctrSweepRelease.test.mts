import test from 'node:test';
import assert from 'node:assert/strict';
import sandbox from './sweepSandbox.cjs';
const { createSandbox, PT, LINK, REG, SETTLED } = sandbox;
const request = (body: unknown) => new Request('http://test/api', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('Finance groups retain Established and Single builds but only blank-stage Split purchases', () => {
  const mod = createSandbox().load('src/lib/ctrViewFilters.ts');
  const eq = (field: string, value: string) => ({ field, operator: 'equals', value });
  const groups = [
    { name: 'Established', filters: [eq('type','established')] },
    { name: 'New single', filters: [eq('type','new'),eq('contract','single_contract')] },
    { name: 'New split before construction', filters: [eq('type','new'),eq('contract','split_contract'),{field:'stage',operator:'is blank',value:''}] },
  ];
  const common = [eq('status','open'), {field:'settled',operator:'is blank',value:''},{field:'finance',operator:'in',value:'Pending finance,Valuation ordered,Application lodged'}];
  const rows = [
    {id:'established',type:'established',contract:'',stage:'',status:'open',settled:'',finance:'Pending finance'},
    {id:'single-build',type:'new',contract:'single_contract',stage:'slab',status:'open',settled:'',finance:'Application lodged'},
    {id:'split-land',type:'new',contract:'split_contract',stage:'',status:'open',settled:'',finance:'Valuation ordered'},
    {id:'split-build',type:'new',contract:'split_contract',stage:'preba',status:'open',settled:'',finance:'Pending finance'},
    {id:'missing',type:'',contract:'',stage:'',status:'open',settled:'',finance:'Pending finance'},
  ];
  rows.push({...rows[0],id:'settled',settled:'Yes'}, {...rows[1],id:'approved',finance:'Formally approved'}, {...rows[2],id:'won',status:'won'});
  assert.equal(JSON.stringify(mod.applyViewFilters(rows,common,groups).map((r:any)=>r.id)),JSON.stringify(['established','single-build','split-land']));
  assert.equal(JSON.stringify(mod.applyViewFilters(rows,common,JSON.parse(JSON.stringify(groups)))),JSON.stringify(mod.applyViewFilters(rows,common,groups)));
  assert.equal(mod.applyViewFilters(rows,common,[{name:'Incomplete',filters:[]}]).length,0);
  assert.match(mod.filterGroupsError([{name:'Incomplete',filters:[]}]),/at least one condition/);
  assert.equal(mod.applyViewFilters(rows,common).length,5);
  assert(mod.matchesViewFilter({stage:'Unconditional'},{field:'stage',operator:'in',value:'Conditional'}));
});

for (const [label, props, action] of [
  ['Established', { property_type: 'established' }, 'settle'],
  ['New single, blank stage', { contract_type: 'single_contract' }, 'settle'],
  ['New split, blank stage', {}, 'split'],
  ['New build in progress', { construction_stage: 'slab' }, 'report'],
  ['Blank property type', { property_type: '' }, 'report'],
  ['Blank contract type', { contract_type: '' }, 'report'],
  ['Handover', { construction_stage: 'handover' }, 'settle'],
] as const) {
  test(`Settlement rule: ${label}`, async () => {
    const h = createSandbox();
    Object.assign(h.state.records[0].properties, props);
    const mod = h.load('src/lib/ctrSettled.ts');
    assert.equal(mod.settledPlan(h.state.records[0].properties).action, action);
    const oldStage = h.state.opps[0].pipelineStageId;
    const summary = await mod.runSettled({ email: 'test', opportunityId: 'testopp', propertyRecordId: 'testrecord', oppBefore: structuredClone(h.state.opps[0]), statusInSameSave: false });
    assert.equal(summary.dryRun, false);
    if (action === 'settle') {
      assert.equal(h.state.opps[0].pipelineStageId, 'settled');
      assert.equal(h.state.records[0].properties.status, '04_settled');
      assert.equal(summary.verifiedValues.pipelineStage, 'Settled');
      assert.equal(summary.verifiedValues.co_status, '04_settled');
    } else if (action === 'split') {
      assert.equal(h.state.opps[0].pipelineStageId, oldStage);
      assert.equal(h.state.records[0].properties.status, '03_contr_exchanged');
      assert.equal(h.state.records[0].properties.construction_stage, 'preba');
      assert.equal(h.state.records[0].properties.land_registration, 'Registered');
      assert.equal(summary.verifiedValues.co_construction_stage, 'preba');
      assert.equal(summary.verifiedValues.co_land_registration, 'Registered');
      assert.equal(summary.verifiedValues.co_status, undefined);
    } else {
      assert.equal(h.state.writes.length, 0);
      assert.equal(h.state.alerts.length, 1);
      assert.equal(Object.keys(summary.verifiedValues).length, 0);
    }
  });
}

test('Settlement switch OFF: plans changes without writing GHL', async () => {
  const h = createSandbox(); h.state.settings.settled_apply = 'false';
  const result = await h.load('src/lib/ctrSettled.ts').runSettled({ opportunityId: 'testopp', propertyRecordId: 'testrecord', oppBefore: h.state.opps[0], statusInSameSave: false });
  assert.equal(result.dryRun, true); assert.equal(h.state.writes.length, 0);
  assert.equal(Object.keys(result.verifiedValues).length, 0);
});

test('Settlement read-back failures produce a failure alert', async () => {
  const h = createSandbox(); h.state.ignoreWrites = true;
  const result = await h.load('src/lib/ctrSettled.ts').runSettled({ opportunityId: 'testopp', propertyRecordId: 'testrecord', oppBefore: h.state.opps[0], statusInSameSave: false });
  assert.ok(result.steps.some((s: any) => s.result.includes('does not match')));
  assert.equal(h.state.alerts.length, 1);
  assert.equal(Object.keys(result.verifiedValues).length, 0);
});

test('Settlement preserves a status explicitly edited in the same save', async () => {
  const h = createSandbox();
  Object.assign(h.state.records[0].properties, { property_type: 'established', status: '01_available' });
  const result = await h.load('src/lib/ctrSettled.ts').runSettled({ opportunityId: 'testopp', propertyRecordId: 'testrecord', oppBefore: h.state.opps[0], statusInSameSave: true });
  assert.equal(result.verifiedValues.pipelineStage, 'Settled');
  assert.equal(result.verifiedValues.co_status, undefined);
  assert.equal(h.state.records[0].properties.status, '01_available');
});

test('CTRT handover edit invokes settlement, while unticking only clears the checkbox', async () => {
  const h = createSandbox();
  const route = h.load('src/app/api/contract-team-reporting/update/route.ts');
  let result = await route.PUT(request({ opportunityId: 'testopp', propertyRecordId: 'testrecord', changes: { co_construction_stage: 'handover' } }));
  assert.equal(result.status, 200);
  const saved = await result.json();
  assert.equal(saved.settled.verifiedValues.pipelineStage, 'Settled');
  assert.equal(saved.settled.verifiedValues.co_status, '04_settled');
  assert.equal(h.state.opps[0].pipelineStageId, 'settled');
  assert.equal(h.state.records[0].properties.status, '04_settled');
  h.state.writes.length = 0;
  result = await route.PUT(request({ opportunityId: 'testopp', propertyRecordId: 'testrecord', changes: { opp_settlement_confirmed: '' } }));
  assert.equal(result.status, 200); assert.equal(h.state.writes.length, 1);
  assert.equal(h.field(SETTLED).length, 0);
});

test('Speculative unlink requires destination/reason and a successful note before changes', async () => {
  const h = createSandbox();
  const route = h.load('src/app/api/deal-sheet/update-client/route.ts');
  const body = { recordId: 'testrecord', transitionType: 'reverted_to_speculative' };
  assert.equal((await route.POST(request(body))).status, 400);
  assert.equal(h.state.writes.length, 0);
  const target = h.load('src/lib/ghlPipelines.ts').ON_HOLD_STAGE_ID;
  h.state.failNotes = true;
  assert.equal((await route.POST(request({ ...body, handbackStageId: target, unlinkReason: 'Test reason' }))).status, 400);
  assert.equal(h.state.writes.length, 0);
  h.state.failNotes = false;
  assert.equal((await route.POST(request({ ...body, handbackStageId: target, unlinkReason: 'Test reason' }))).status, 200);
  assert.match(h.state.writes[0].path, /contacts\/testcontact\/notes/);
  assert.equal(h.state.opps[0].pipelineStageId, target);
  assert.equal(h.field(LINK), ''); assert.equal(h.field(REG), '');
  assert.equal(h.state.records[0].properties.linked_opportunity_id, '');
  assert.equal(h.state.records[0].properties.client_closed, 'SPECULATIVE EOI');
  assert.equal(h.state.acks.length, 1);
  assert.match(h.state.notes[0].body, /Previous values:.*Registered Address/);
});

test('All three acknowledgement tiles are needed; repeated ticks are idempotent and history is retained', async () => {
  const h = createSandbox(), mod = h.load('src/lib/unlinkAcks.ts');
  const id = await mod.addUnlinkAck({ recordId: 'testrecord', address: 'Test address', oppId: 'testopp', oppName: 'ZZZ RELEASE TEST', byEmail: 'test', byName: 'Test', reason: 'Test', stageId: 'hold', stageName: 'On Hold', noteId: 'note' });
  for (const tile of ['finance', 'finance', 'construction']) await mod.tickUnlinkAck(id, tile, 'test', 'Test');
  assert.equal((await mod.listUnlinkAcks(false)).length, 1);
  await mod.tickUnlinkAck(id, 'bppci', 'test', 'Test');
  assert.equal((await mod.listUnlinkAcks(false)).length, 0);
  assert.equal((await mod.listUnlinkAcks(true)).length, 1);
  assert.equal(h.state.ticks.length, 3);
});

test('Link writes both sides; reassignment clears old mirrors and preserves unrelated opportunity fields', async () => {
  const h = createSandbox();
  h.state.opps.push({ ...structuredClone(h.state.opps[0]), id: 'newopp', name: 'NEW TEST', customFields: [] });
  const route = h.load('src/app/api/deal-sheet/link-opportunity/route.ts');
  const result = await route.POST(request({ recordId: 'testrecord', opportunityId: 'newopp', opportunityName: 'NEW TEST', status: '03_contr_exchanged', totalPurchasePrice: '800000' }));
  assert.equal(result.status, 200);
  assert.equal(h.field(LINK), '');
  assert.equal(h.field(REG), 'Lot 999, Quick Test St Testville QLD 4000');
  assert.equal(h.field(LINK, h.state.opps[1]), 'testrecord');
  assert.equal(h.state.records[0].properties.linked_opportunity_id, 'newopp');
});

test('Sweep clears orphan mirrors only on open reporting-pipeline opportunities', async () => {
  const h = createSandbox(); h.state.records.length = 0;
  h.state.opps.push({ ...structuredClone(h.state.opps[0]), id: 'wonopp', status: 'won' });
  const result = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true });
  assert.equal(result.oppPassCleared, 1);
  assert.equal(h.field(LINK), ''); assert.equal(h.field(LINK, h.state.opps[1]), 'testrecord');
  assert.equal(h.field(REG), 'Lot 999, Quick Test St Testville QLD 4000');
});

test('Sweep preserves manually changed links and reports address problems without changing Registered Address', async () => {
  const h = createSandbox();
  h.state.links.push({ record_id: 'testrecord', opp_id: 'oldopp', seen_at: new Date().toISOString() });
  let result = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true, forceDryRun: true });
  assert.equal(result.byKind.hand_changed, 1);
  assert.equal(h.state.writes.length, 0);
  h.state.links.length = 0; h.state.mismatches.length = 0;
  h.setField(REG, '49 Glendonald Road');
  result = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true, forceDryRun: true });
  assert.equal(result.byKind.address_mismatch, 1);
  assert.match(h.state.mismatches[0].detail, /no suburb/);
  assert.equal(h.field(REG), '49 Glendonald Road');
  assert.equal(h.state.writes.length, 0); assert.equal(h.state.alerts.length, 0);
  h.setField(REG, '49 Glendonald Road Testville');
  result = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true, forceDryRun: true });
  assert.equal(result.byKind.address_mismatch || 0, 0);
});

test('Sweep reports failed mirror read-back as a failure, not a successful repair', async () => {
  const h = createSandbox(); h.setField(LINK, ''); h.state.ignoreWrites = true;
  const result = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true });
  assert.equal(result.failed, 1);
  assert.equal(result.fixed, 0);
});

test('Full sweep still repairs linked won and other-pipeline opportunities outside the open pipeline search', async () => {
  for (const patch of [{status:'won'}, {pipelineId:'other-pipeline'}]) {
    const h=createSandbox();Object.assign(h.state.opps[0],patch);h.setField(LINK,'');
    const result=await h.load('src/lib/linkSweep.ts').runLinkSweep({full:true});
    assert.equal(result.oppsChecked,1);
    assert.equal(result.fixed,1);
    assert.equal(h.field(LINK),'testrecord');
    assert.equal(result.failed,0);
  }
});

test('Sweep counts a failed orphan-mirror clear as a failure and retains the mismatch', async () => {
  const h = createSandbox(); h.state.records.length = 0; h.state.ignoreWrites = true;
  const result = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true });
  assert.equal(result.failed, 1);
  assert.equal(result.oppPassCleared, 0);
  assert.equal(result.byKind.not_pointing_back, 1);
});

test('Stamp uses first detection for blank dates and preserves existing dates', async () => {
  const h = createSandbox();
  const p = h.state.records[0].properties;
  p.construction_stage = 'slab'; p.status_change_date = '2026-11-10';
  h.state.snapshots.push({ object: 'property_record', record_id: 'testrecord', field: 'construction_stage', value: 'preba' }, { object: 'property_record', record_id: 'testrecord', field: 'status', value: '02_eoi' });
  h.state.firstDetections.push({ object: 'property_record', record_id: 'testrecord', field: 'construction_stage', first: '2026-11-12' });
  const result = await h.load('src/lib/ctrStamp.ts').runStamp();
  assert.equal(result.stamped, 1); assert.equal(result.skippedDateSet, 1);
  assert.equal(p.construction_stage_change_date.slice(0, 10), '2026-11-12');
  assert.equal(p.status_change_date, '2026-11-10');
});

test('Backdate cutoff lists older changes without writing; newer blank dates are read back', async () => {
  const h = createSandbox();
  h.state.records[0].properties.construction_stage = 'slab';
  h.state.snapshots.push({ object: 'property_record', record_id: 'testrecord', field: 'construction_stage', value: 'preba' }, { object: 'property_record', record_id: 'testrecord', field: 'status', value: '02_eoi' });
  h.state.firstDetections.push({ object: 'property_record', record_id: 'testrecord', field: 'construction_stage', first: '2026-11-12' }, { object: 'property_record', record_id: 'testrecord', field: 'status', first: '2026-11-03' });
  const result = await h.load('src/lib/ctrStamp.ts').backdateStamps({ since: '2026-11-08', write: true });
  assert.equal(result.counts.written, 1); assert.equal(result.counts.preSince, 1);
  assert.equal(result.counts.failed, 0); assert.equal(h.state.records[0].properties.status_change_date, undefined);
});
