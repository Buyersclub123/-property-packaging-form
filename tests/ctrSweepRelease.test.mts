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
  assert.equal(h.state.runs[0].failed, 1);
  assert.equal(h.state.alerts[0].type, 'link-sweep-failed');
});

test('Sweep search failures are logged, alerted and returned as HTTP 500 by both cron routes', async () => {
  for (const file of ['src/app/api/contract-team-reporting/link-sweep-cron/route.ts', 'src/app/api/contract-team-reporting/link-sweep-cron/full/route.ts']) {
    const h = createSandbox(); h.state.failSearch = true;
    const r = await h.load(file).GET({ nextUrl: new URL('https://test.invalid/cron') });
    assert.equal(r.status, 500);
    const body = await r.json();
    assert.equal(body.completed, false);
    assert.equal(body.failed, 1);
    assert.match(body.errors[0], /422/);
    assert.equal(h.state.runs[0].failed, 1);
    assert.equal(h.state.alerts[0].type, 'link-sweep-failed');
    assert.equal(h.state.writes.length, 0);
  }
});

test('Failed forced-dry sweep logs failure without sending mail or writing GHL', async () => {
  const h = createSandbox(); h.state.failSearch = true;
  const r = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true, forceDryRun: true });
  assert.equal(r.failed, 1); assert.equal(h.state.runs[0].failed, 1);
  assert.equal(h.state.alerts.length, 0); assert.equal(h.state.writes.length, 0);
});

test('Delta catches recently edited old purchases and uses last successful applied START, not failed/dry/end times', async () => {
  const h = createSandbox();
  h.state.runs.push(
    { run_id: '2026-11-19T10:00:00.000Z', at: '2026-11-19T10:04:50.000Z', failed: 0, dry_run: false },
    { run_id: '2026-11-19T10:15:00.000Z', at: '2026-11-19T10:16:00.000Z', failed: 1, dry_run: false },
    { run_id: '2026-11-19T10:30:00.000Z', at: '2026-11-19T10:31:00.000Z', failed: 0, dry_run: true },
  );
  h.state.records[0].updatedAt = '2025-01-01T00:00:00.000Z';
  h.state.opps[0].createdAt = '2020-01-01T00:00:00.000Z';
  h.state.opps[0].updatedAt = '2026-11-19T10:01:00.000Z';
  h.setField(LINK, '');
  const r = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: false });
  assert.equal(r.since, '2026-11-19T09:58:00.000Z');
  assert.equal(r.fixed, 1);
  assert.equal(h.state.searchRequests[0].method, 'POST');
  assert.equal(h.state.searchRequests[0].body.sort[0].field, 'date_updated');
});

test('Advanced opportunity search reads beyond 300 and paginates tied update timestamps', async () => {
  const h = createSandbox(), original = h.state.opps[0];
  h.state.opps = Array.from({ length: 401 }, (_, i) => ({ ...structuredClone(original), id: `opp${String(i).padStart(4, '0')}` }));
  const rows = await h.load('src/lib/ghlOpportunitySearch.ts').searchGhlOpportunities([], 'test');
  assert.equal(rows.length, 401); assert.equal(new Set(rows.map(r => r.id)).size, 401);
  assert.equal(h.state.searchRequests.length, 5);
});

test('Portal selects all eligible price-range clients despite hundreds of newer Settled records', async () => {
  const h = createSandbox(), base = structuredClone(h.state.opps[0]);
  const eligible = Array.from({ length: 17 }, (_, i) => ({ ...structuredClone(base), id: `client${i}`, pipelineStageId: i % 2 ? 'price500' : 'price800', createdAt: '2025-01-01T00:00:00Z' }));
  h.state.opps = [
    ...Array.from({ length: 550 }, (_, i) => ({ ...structuredClone(base), id: `settled${i}`, status: 'won', pipelineStageId: 'settled', createdAt: '2026-01-01T00:00:00Z' })),
    ...eligible,
    { ...structuredClone(base), id: 'conditional' },
    { ...structuredClone(base), id: 'openSettled', pipelineStageId: 'settled' },
    { ...structuredClone(base), id: 'otherpipeline', pipelineId: 'other', pipelineStageId: 'price500' },
    { ...structuredClone(base), id: 'closedproposal', status: 'lost', pipelineStageId: 'price800' },
  ];
  h.setField('xFKbtz7Lt1X2nNTeFSSH', 'Partner Name', eligible[0]);
  h.setField('d0iUirsqy4kdUVMpHLfD', 'partner@example.invalid', eligible[0]);
  h.setField('NXqFwEzo28k6lOkbyT5N', 'Test BA', eligible[0]);
  const response = await h.load('src/app/api/portal/opportunities/route.ts').GET();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  const { opportunities: rows, counts } = await response.json();
  assert.deepEqual(rows.map(r => r.id).sort(), eligible.map(r => r.id).sort());
  const row = rows.find(r => r.id === eligible[0].id);
  assert.equal(row.client, 'Release Test');
  assert.equal(row.partner, 'Partner Name');
  assert.equal(row.emails, 'client@example.invalid\npartner@example.invalid');
  assert.equal(row.assignedBA, 'Test BA');
  assert.equal(counts.total, 17);
  assert.deepEqual(counts.stages.map(s => [s.id, s.count]), [['price300', 0], ['price500', 8], ['price800', 9]]);
  assert.equal(h.state.searchRequests.length, 2);
  assert.equal(h.state.searchRequests[1].body.limit, 1);
  assert.equal(h.state.searchRequests[1].body.filters.some(f => f.field === 'pipeline_stage_id'), false);
  assert.equal(h.state.writes.length, 0);
});

test('Portal GHL stage counts remain complete when its client list is truncated', async () => {
  const h = createSandbox({ fetch: async (url, options) => {
    const response = await h.fetch(url, options);
    if (new URL(url).pathname === '/opportunities/search' && JSON.parse(options.body).limit === 100) {
      const data = await response.json(); data.opportunities = data.opportunities.slice(0, 11);
      return Response.json(data);
    }
    return response;
  } });
  const base = structuredClone(h.state.opps[0]);
  h.state.opps = Array.from({ length: 17 }, (_, i) => ({ ...structuredClone(base), id: `client${i}`, pipelineStageId: 'price500' }));
  const response = await h.load('src/app/api/portal/opportunities/route.ts').GET();
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.opportunities.length, 11);
  assert.equal(data.counts.total, 17);
  assert.equal(data.counts.stages.find(s => s.id === 'price500').count, 17);
  assert.equal(h.state.writes.length, 0);
});

test('Portal fails visibly on unavailable, missing or inconsistent GHL stage counts', async () => {
  for (const kind of ['unavailable', 'missingStage', 'wrongTotal']) {
    const h = createSandbox({ fetch: async (url, options) => {
      const response = await h.fetch(url, options);
      if (new URL(url).pathname === '/opportunities/search' && JSON.parse(options.body).limit === 1) {
        if (kind === 'unavailable') return Response.json({ error: 'Unavailable' }, { status: 503 });
        const data = await response.json();
        if (kind === 'missingStage') data.stageAggregations = data.stageAggregations.filter(s => s.pipelineStageId !== 'price300');
        if (kind === 'wrongTotal') data.total++;
        return Response.json(data);
      }
      return response;
    } });
    h.state.opps[0].pipelineStageId = 'price500';
    const response = await h.load('src/app/api/portal/opportunities/route.ts').GET();
    assert.equal(response.status, 502);
    assert.equal((await response.json()).counts, undefined);
    assert.equal(h.state.writes.length, 0);
  }
});

test('Portal contact read failure is an error, never a partial client list', async () => {
  const h = createSandbox(); h.state.opps[0].pipelineStageId = 'price500'; h.state.contacts.length = 0;
  const response = await h.load('src/app/api/portal/opportunities/route.ts').GET();
  assert.equal(response.status, 502);
  assert.match((await response.json()).error, /could not read GHL/);
  assert.equal(h.state.writes.length, 0);
});

test('Incomplete or repeating opportunity/Property Record pagination fails before any mirror clear', async () => {
  for (const kind of ['opportunity', 'property', 'propertyRepeat']) {
    const h = createSandbox({ fetch: async (url, options) => {
      if (kind === 'opportunity' && new URL(url).pathname === '/opportunities/search') return Response.json({ opportunities: Array.from({ length: 100 }, (_, i) => ({ id: `opp${i}` })) });
      if (kind === 'property' && new URL(url).pathname.endsWith('/records/search')) return Response.json({ records: Array.from({ length: 100 }, (_, i) => ({ id: `rec${i}`, properties: {} })) });
      if (kind === 'propertyRepeat' && new URL(url).pathname.endsWith('/records/search')) return Response.json({ records: Array.from({ length: 100 }, (_, i) => ({ id: `rec${i}`, properties: {}, searchAfter: [100] })) });
      return h.fetch(url, options);
    } });
    const r = await h.load('src/lib/linkSweep.ts').runLinkSweep({ full: true });
    assert.equal(r.failed, 1); assert.match(r.errors[0], /without a cursor|repeated its pagination cursor/);
    assert.equal(h.state.writes.length, 0);
  }
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
