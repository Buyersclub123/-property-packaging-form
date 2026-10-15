// Run: node --experimental-strip-types --test tests/propertyFields.test.mts
// Verifies the shared property calculations behave exactly like Step2PropertyDetails.tsx.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcTotalPrice, calcNetPrice, calcPropertyPrice, calcPriceGroup, calcCurrentYield, calcAppraisedYield,
  deriveAll, composePropertyAddress, parseExpiry, formatExpiry, contractTypeSimplified,
} from '../src/lib/propertyFields/calcs.ts';
import { validateValues, dependentsOf, isLocked, FIELD_BY_KEY, pruneHidden } from '../src/lib/propertyFields/registry.ts';
import { toGhlProperties, fromGhlProperties } from '../src/lib/propertyFields/ghlMap.ts';

const split = { propertyType: 'New', dealType: '01_hl_comms', dualOccupancy: 'No', landPrice: '285000', buildPrice: '350000', cashbackRebateType: 'cashback', cashbackRebateValue: '15000', rentAppraisalPrimaryTo: '550' };
const single = { propertyType: 'New', dealType: '02_single_comms', dualOccupancy: 'No', totalPrice: '650,000', cashbackRebateType: 'rebate', cashbackRebateValue: '20000', rentAppraisalPrimaryTo: '600' };
const est = { propertyType: 'Established', dealType: '05_established', dualOccupancy: 'No', acceptableAcquisitionTo: '$480,000', occupancyPrimary: 'tenanted', currentRentPrimary: '450', rentAppraisalPrimaryTo: '500' };
const estDual = { ...est, dualOccupancy: 'Yes', occupancySecondary: 'vacant', currentRentSecondary: '300', rentAppraisalSecondaryTo: '400' };

test('total price: split = land + build, single = typed, established = none', () => {
  assert.equal(calcTotalPrice(split), 635000);
  assert.equal(calcTotalPrice(single), 650000);
  assert.equal(calcTotalPrice(est), null);
  assert.equal(calcTotalPrice({ ...split, landPrice: 'TBC' }), null);
});

test('net price only for cashback type', () => {
  assert.equal(calcNetPrice(split), 620000);
  assert.equal(calcNetPrice(single), null);
  assert.equal(calcNetPrice({ ...split, cashbackRebateValue: 'TBC' }), null);
});

test('property price basis and price group bands', () => {
  assert.equal(calcPropertyPrice(est), 480000);
  assert.equal(calcPropertyPrice(split), 635000);
  assert.equal(calcPriceGroup(est), '300__500k');
  assert.equal(calcPriceGroup(split), '500__700k');
  assert.equal(calcPriceGroup({ ...single, totalPrice: '700000' }), '700_');
  assert.equal(calcPriceGroup({ ...est, acceptableAcquisitionTo: '250000' }), null);
});

test('current yield only when a unit is tenanted; dual sums tenanted units only', () => {
  assert.equal(calcCurrentYield(est), ((450 * 52) / 480000 * 100).toFixed(2));
  assert.equal(calcCurrentYield({ ...est, occupancyPrimary: 'vacant' }), null);
  // secondary vacant → its rent is ignored
  assert.equal(calcCurrentYield(estDual), ((450 * 52) / 480000 * 100).toFixed(2));
  assert.equal(calcCurrentYield({ ...estDual, occupancySecondary: 'tenanted' }), ((750 * 52) / 480000 * 100).toFixed(2));
  assert.equal(calcCurrentYield(split), null);
});

test('appraised yield uses primary To (+ secondary To when dual)', () => {
  assert.equal(calcAppraisedYield(split), ((550 * 52) / 635000 * 100).toFixed(2));
  assert.equal(calcAppraisedYield(estDual), ((900 * 52) / 480000 * 100).toFixed(2));
  assert.equal(calcAppraisedYield({ ...est, rentAppraisalPrimaryTo: 'TBC' }), null);
});

test('deriveAll formats yields as "~ x.xx%" and maps contract type', () => {
  const d = deriveAll(split);
  assert.equal(d.contractType, 'Split Contract');
  assert.equal(d.appraisedYield, `~ ${((550 * 52) / 635000 * 100).toFixed(2)}%`);
  assert.equal(d.yield, '');
  assert.equal(contractTypeSimplified('02_single_comms'), 'Single Contract');
  assert.equal(contractTypeSimplified('05_established'), 'Single Contract');
});

test('address composition', () => {
  assert.equal(composePropertyAddress({ streetNumber: '12', streetName: 'Riverside Drive', suburbName: 'Springfield', state: 'qld', postCode: '4300' }), '12 Riverside Drive Springfield QLD 4300');
  assert.equal(composePropertyAddress({ lotNumber: '142', streetName: 'Riverside Drive', suburbName: 'Springfield', state: 'QLD', postCode: '4300' }), 'Lot 142, Riverside Drive Springfield QLD 4300');
  assert.equal(composePropertyAddress({ lotNumber: '7', unitNumber: '1-2', streetNumber: '5', streetName: 'High St', suburbName: 'Ipswich', state: 'QLD', postCode: '4305' }), 'Lot 7, Units 1-2, 5 High St Ipswich QLD 4305');
});

test('expiry parse/format round-trips', () => {
  assert.deepEqual(parseExpiry('March 2027 approx.'), { month: 'March', year: '2027', isTBC: false, isPeriodical: false });
  assert.deepEqual(parseExpiry('TBC'), { month: '', year: '', isTBC: true, isPeriodical: false });
  assert.equal(formatExpiry('March', '2027', false, false), 'March 2027');
  assert.equal(formatExpiry('', '', false, true), 'Periodical');
});

test('registry: dependents reset chain and locking', () => {
  assert.ok(dependentsOf('propertyType').includes('dwellingType'));
  assert.ok(dependentsOf('propertyType').includes('unitNumber'));
  assert.ok(dependentsOf('occupancyPrimary').includes('currentRentPrimary'));
  assert.equal(isLocked(FIELD_BY_KEY.dwellingType, { propertyType: 'New' }), true);
  assert.equal(isLocked(FIELD_BY_KEY.dwellingType, { propertyType: 'New', dualOccupancy: 'No' }), false);
});

test('registry: mandatory-when-shown validation per shape', () => {
  const base = { propertyType: 'Established', dualOccupancy: 'No', dwellingType: 'house', dealType: '05_established', status: '07_test_record',
    hasUnitNumbers: 'No', streetNumber: '5', streetName: 'High St', suburbName: 'Ipswich', state: 'QLD', postCode: '4305', lga: 'Ipswich',
    bedsPrimary: '3', bathPrimary: '2', garagePrimary: '1', yearBuilt: '1998', landSize: '600', title: 'torrens',
    asking: 'onmarket', askingText: '$500k', acceptableAcquisitionFrom: '450000', acceptableAcquisitionTo: '480000',
    occupancyPrimary: 'vacant', rentAppraisalPrimaryFrom: '450', rentAppraisalPrimaryTo: '500',
    agentName: 'A', agentMobile: '04', agentEmail: 'a@b.c', messageForBA: 'x' };
  assert.deepEqual(validateValues(base), {});
  const errs = validateValues({ ...base, occupancyPrimary: 'tenanted' });
  assert.ok(errs.currentRentPrimary && errs.expiryPrimary);
  assert.deepEqual(validateValues({ ...base, occupancyPrimary: 'tenanted', currentRentPrimary: '450', expiryPrimary: 'Periodical' }), {});
  // hidden fields never validated
  assert.equal(validateValues({ ...base, landPrice: '' }).landPrice, undefined);
  assert.ok(validateValues({ ...base, title: 'strata' }).bodyCorpPerQuarter);
  assert.ok(validateValues({ ...base, postCode: '43' }).postCode);
  assert.ok(validateValues({ ...base, streetNumber: '' }).streetNumber, 'street number mandatory for Established');
  // New single contract
  const newSingle = { ...base, propertyType: 'New', dealType: '02_single_comms', lotNumberNotApplicable: 'Yes', buildSize: '150', landRegistration: 'Registered', completionDate: 'TBC', totalPrice: '650000', cashbackRebateType: 'cashback', cashbackRebateValue: '20000' };
  delete (newSingle as Record<string, string>).yearBuilt; delete (newSingle as Record<string, string>).asking;
  assert.deepEqual(validateValues(newSingle), {});
  assert.equal(validateValues({ ...newSingle, streetNumber: '' }).streetNumber, undefined, 'street number may be blank for New');
  assert.ok(validateValues({ ...newSingle, lotNumberNotApplicable: 'No' }).lotNumber);
});

test('ghl payload: whitelist, conventions, derived values, system fields', () => {
  const values = { propertyType: 'New', dualOccupancy: 'Yes', dwellingType: 'duplex', dealType: '01_hl_comms', status: '07_test_record',
    lotNumber: '42', hasUnitNumbers: 'No', streetName: 'Bloom Rd', suburbName: 'Nikenbah', state: 'QLD', postCode: '4655', lga: 'Fraser Coast',
    bedsPrimary: '3', bedsSecondary: '2', bathPrimary: '2.5', bathSecondary: '1', garagePrimary: '1', garageSecondary: '1',
    landRegistration: 'Registered', landSize: '450', buildSize: '200', title: 'torrens',
    landPrice: '285000', buildPrice: '350000', cashbackRebateType: 'cashback', cashbackRebateValue: '15000',
    rentAppraisalPrimaryFrom: '400', rentAppraisalPrimaryTo: '420', rentAppraisalSecondaryFrom: '300', rentAppraisalSecondaryTo: '320',
    agentName: 'Agent', agentMobile: '0400', agentEmail: 'agent@x.com', messageForBA: 'quick',
    // junk that must never reach GHL
    why_this_property: 'x', projectIdentifier: 'PROJ-1', acceptableAcquisitionTo: '999999' };
  const { properties: p, propertyAddress } = toGhlProperties({ values, userEmail: 'john.t@buyersclub.com.au', sourcer: 'nathan.f@buyersclub.com.au' });
  assert.equal(propertyAddress, 'Lot 42, Bloom Rd Nikenbah QLD 4655');
  assert.equal(p.property_address, propertyAddress);
  assert.deepEqual(p.quick_record, ['Yes']);
  assert.equal(p.packager_approved, 'Approved');
  assert.equal(p.qa_approved, 'Approved');
  assert.equal(p.packager, 'john.t');
  assert.equal(p.packager_email, 'john.t@buyersclub.com.au');
  assert.equal(p.sourcer, 'nathan.f');
  assert.equal(p.single_or_dual_occupancy, 'dual_occupancy');
  assert.equal(p.bath_primary, '2point5');
  assert.equal(p.contract_type, 'Split Contract');
  assert.equal(p.total_price, '635000');
  assert.equal(p.net_price, 620000);
  assert.equal(p.price_group, '500__700k');
  assert.equal(p.appraised_yield, `~ ${((740 * 52) / 635000 * 100).toFixed(2)}%`);
  assert.equal(p.unit__lot, undefined);
  assert.equal(p.acceptable_acquisition__to, undefined, 'hidden-for-shape field must not be written');
  assert.equal((p as Record<string, unknown>).why_this_property, undefined);
  assert.equal((p as Record<string, unknown>).project_identifier, undefined);
  assert.equal(p.yield, undefined);
});

test('ghl payload: lot N/A omits lot_number; asking mapped like 02b', () => {
  const values = { propertyType: 'New', dualOccupancy: 'No', dealType: '02_single_comms', lotNumber: 'ignored', lotNumberNotApplicable: 'Yes', hasUnitNumbers: 'Yes', unitNumber: '3', streetNumber: '9', streetName: 'A St', suburbName: 'B', state: 'NSW', postCode: '2000', totalPrice: '500000', cashbackRebateType: 'rebate', cashbackRebateValue: '1000' };
  const { properties: p } = toGhlProperties({ values, userEmail: 'u@buyersclub.com.au', sourcer: '' });
  assert.equal(p.lot_number, undefined);
  assert.equal(p.property_address, 'Unit 3, 9 A St B NSW 2000');
  assert.equal(p.unit__lot, '3');
  assert.equal(p.total_price, '500000', 'single contract total_price comes from the typed field');
  assert.equal(p.net_price, undefined);
  const est = toGhlProperties({ values: { propertyType: 'Established', dealType: '05_established', dualOccupancy: 'No', asking: 'prelaunch_opportunity', streetName: 'x', suburbName: 'y', state: 'QLD', postCode: '4000' }, userEmail: 'u@buyersclub.com.au', sourcer: '' });
  assert.equal(est.properties.asking, 'pre-launch opportunity');
  assert.equal(est.properties.contract_type, 'Single Contract');
});

test('copy from GHL: only registry fields, neverCopy blank, project/overlay dropped, tri-plus forced to choose', () => {
  const v = fromGhlProperties({
    property_type: 'Established', deal_type: '05_established', single_or_dual_occupancy: 'single_occupancy', dwelling_type: 'block_of_units',
    lot_number: '5', unit__lot: '2', street_number: '10', street_name: 'Main St', suburb_name: 'Town', state: 'qld', post_code: '4000', lga: 'LGA',
    beds_primary: '3', bath_primary: '1point5', title: 'strata', body_corp__per_quarter: '800', asking: 'off-market', status: '01_available',
    project_identifier: 'PROJ', project_address: 'X', flood: 'Yes', why_this_property: 'long text', quick_record: ['Yes'],
    agent_name: 'Bob', message_for_ba: 'msg', rent_appraisal_primary_to: '500', acceptable_acquisition__to: '480000',
  });
  assert.equal(v.propertyType, 'Established');
  assert.equal(v.dualOccupancy, 'No');
  assert.equal(v.dwellingType, '', 'tri-plus dwelling types are not valid for a quick record');
  assert.equal(v.lotNumber, undefined);
  assert.equal(v.unitNumber, undefined);
  assert.equal(v.streetNumber, undefined);
  assert.equal(v.streetName, 'Main St');
  assert.equal(v.state, 'QLD');
  assert.equal(v.bathPrimary, '1.5');
  assert.equal(v.asking, 'offmarket');
  assert.equal(v.status, undefined, 'status is chosen fresh for the quick record');
  assert.equal((v as Record<string, string>).projectIdentifier, undefined);
  assert.equal((v as Record<string, string>).flood, undefined);
  assert.equal(v.agentName, 'Bob');
  assert.equal(v.messageForBA, undefined, 'BA message is never copied');
  assert.equal(Object.keys(pruneHidden(v)).includes('bodyCorpPerQuarter'), true);
});
