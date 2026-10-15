'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserEmailPrompt } from '@/components/UserEmailPrompt';
import { getUserEmail } from '@/lib/userAuth';
import {
  FIELDS, SECTIONS, FIELD_BY_KEY, dependentsOf, fieldOptions, fieldWidth, isDual, isLocked, isVisible, validateValues, hasCashbackRebate,
} from '@/lib/propertyFields/registry';
import type { FieldDef, SectionId, Values } from '@/lib/propertyFields/registry';
import { deriveAll, composePropertyAddress, formatCurrency, priceGroupLabel } from '@/lib/propertyFields/calcs';
import { FieldInput } from './FieldInput';
import { geocodeAddress } from '@/lib/geocoder';
import { DuplicateAddressDialog } from '@/components/DuplicateAddressDialog';
import type { DuplicateAddressMatch } from '@/components/DuplicateAddressDialog';
import type { Tone } from './FieldInput';

// Styled to match the Property Packaging Form (light, white cards, gold primary button).
const T = {
  bg: 'bg-gray-50', headerBg: 'bg-white', border: 'border-gray-200', text: 'text-gray-900', headerText: 'text-gray-900', card: 'bg-white shadow-lg',
  input: '', label: 'text-gray-700', muted: 'text-gray-500', lockedBg: 'bg-gray-100 text-gray-400', copiedRing: 'ring-2 ring-amber-300',
};
type ThemeTokens = typeof T;


// Apply a change and reset dependents that are no longer valid (D24 — same cascade as the packaging tool).
function applyChange(prev: Values, key: string, value: string): Values {
  if (prev[key] === value) return prev;
  const next: Values = { ...prev, [key]: value };
  for (const depKey of dependentsOf(key)) {
    const f = FIELD_BY_KEY[depKey];
    if (!f || next[depKey] === undefined || next[depKey] === '') continue;
    const stillValid =
      isVisible(f, next) && !isLocked(f, next) &&
      (!f.options || fieldOptions(f, next).some((o) => o.value === next[depKey]));
    if (!stillValid) delete next[depKey];
  }
  return next;
}

function QuickRecordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const copyFrom = params.get('copyFrom') || '';

  const t = T;

  const [userEmail, setUserEmail] = useState<string | null>(null);
  useEffect(() => { setUserEmail(getUserEmail()); }, []);

  const [values, setValues] = useState<Values>({});
  const [copiedKeys, setCopiedKeys] = useState<Set<string>>(new Set());
  const [sourceAddress, setSourceAddress] = useState('');
  const [sourceIsProject, setSourceIsProject] = useState(false);
  const [sourcer, setSourcer] = useState('');
  const [sourcerOptions, setSourcerOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(!!copyFrom);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touchedSave, setTouchedSave] = useState(false);
  const [lgaState, setLgaState] = useState<{ status: 'idle' | 'loading' | 'ok' | 'error'; message?: string }>({ status: 'idle' });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [dupWarning, setDupWarning] = useState<{ matches: DuplicateAddressMatch[]; mode: 'info' | 'confirm' } | null>(null);
  const [noStreetConfirm, setNoStreetConfirm] = useState(false);
  const [dupCheckNote, setDupCheckNote] = useState<string | null>(null);
  // Address validation (mirrors packaging tool Step 1: one address box → Geoscape → fills fields; "Edit Address Fields" unlocks them)
  const [addressQuery, setAddressQuery] = useState('');
  const [addressVerified, setAddressVerified] = useState(false);
  const [addressFieldsEditable, setAddressFieldsEditable] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [showValidateBox, setShowValidateBox] = useState(true);
  const [created, setCreated] = useState<{ recordId: string; propertyAddress: string; missing: string[]; quickRecordStored: unknown } | null>(null);

  // Sourcer list (same source as the packaging form)
  useEffect(() => {
    fetch('/api/sourcers').then((r) => r.json()).then((d) => { if (Array.isArray(d.sourcers)) setSourcerOptions(d.sourcers); }).catch(() => setSourcerOptions([]));
  }, []);

  // Copy mode: load source record (registry fields only)
  useEffect(() => {
    if (!copyFrom) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/deal-sheet/quick-record?copyFrom=${encodeURIComponent(copyFrom)}`, { cache: 'no-store' });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to load source record');
        if (cancelled) return;
        setValues(data.values || {});
        setCopiedKeys(new Set(Object.keys(data.values || {})));
        setSourceAddress(data.sourceAddress || '');
        setSourceIsProject(!!data.sourceIsProject);
        setSourcer(data.sourcer || '');
        setAddressFieldsEditable(true);
        setShowValidateBox(false); // copy mode: address already populated — validate box collapsed behind a link
        if (data.values?.lga) setLgaState({ status: 'ok' });
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Failed to load source record');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [copyFrom]);

  const setValue = useCallback((key: string, value: string) => {
    setValues((prev) => applyChange(prev, key, value));
    setCopiedKeys((prev) => { if (!prev.has(key)) return prev; const n = new Set(prev); n.delete(key); return n; });
  }, []);

  // Packaging-tool defaults: cashback type/value when the deal type carries cashback/rebate (Step2 lines 116-130)
  useEffect(() => {
    if (!hasCashbackRebate(values)) return;
    setValues((prev) => {
      if (prev.cashbackRebateType && prev.cashbackRebateValue) return prev;
      return { ...prev, cashbackRebateType: prev.cashbackRebateType || 'cashback', cashbackRebateValue: prev.cashbackRebateValue || '20000' };
    });
  }, [values.dealType]); // eslint-disable-line react-hooks/exhaustive-deps

  // Packaging-tool rule: dual occupancy auto-selects "has unit numbers = Yes" (Step1 lines 133-146)
  useEffect(() => {
    if (values.dualOccupancy === 'Yes' && values.hasUnitNumbers !== 'Yes') setValues((prev) => ({ ...prev, hasUnitNumbers: 'Yes' }));
  }, [values.dualOccupancy]); // eslint-disable-line react-hooks/exhaustive-deps

  // LGA auto-resolve from Suburb + State + Post Code (D12) — waits for a valid 4-digit postcode
  const lgaReqRef = useRef(0);
  useEffect(() => {
    const suburb = (values.suburbName || '').trim();
    const state = (values.state || '').trim();
    const postCode = (values.postCode || '').trim();
    if (!suburb || !state || !/^\d{4}$/.test(postCode)) { setLgaState({ status: 'idle' }); return; }
    if (copiedKeys.has('lga') && values.lga) return; // carried from source; only re-resolve if suburb/state edited
    const reqId = ++lgaReqRef.current;
    setLgaState({ status: 'loading' });
    const handle = setTimeout(async () => {
      try {
        const res = await fetch('/api/lookups/resolve-lga', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ suburb, state, postCode }) });
        const data = await res.json();
        if (reqId !== lgaReqRef.current) return;
        if (data.success && data.lga) { setValues((prev) => ({ ...prev, lga: data.lga })); setLgaState({ status: 'ok' }); }
        else { setValues((prev) => { const n = { ...prev }; delete n.lga; return n; }); setLgaState({ status: 'error', message: data.error || 'Could not resolve LGA' }); }
      } catch (e) {
        if (reqId !== lgaReqRef.current) return;
        setLgaState({ status: 'error', message: e instanceof Error ? e.message : 'LGA lookup failed' });
      }
    }, 600);
    return () => clearTimeout(handle);
  }, [values.suburbName, values.state, values.postCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const derived = useMemo(() => deriveAll(values), [values]);
  const previewAddress = useMemo(() => composePropertyAddress({
    lotNumber: values.lotNumberNotApplicable === 'Yes' ? '' : values.lotNumber,
    unitNumber: values.hasUnitNumbers === 'Yes' ? values.unitNumber : '',
    streetNumber: values.streetNumber, streetName: values.streetName, suburbName: values.suburbName, state: values.state, postCode: values.postCode,
  }), [values]);

  useEffect(() => { if (touchedSave) setErrors(validateValues(values)); }, [values, touchedSave]);

  const runValidation = (): boolean => {
    setTouchedSave(true);
    const errs = validateValues(values);
    if (lgaState.status === 'error' || (!values.lga && values.suburbName && values.state)) errs.lga = lgaState.message || 'LGA has not been resolved';
    if (!sourcer.trim()) errs.sourcer = 'Sourcer is required';
    setErrors(errs);
    if (Object.keys(errs).length) {
      const first = document.querySelector('[data-field-error]');
      first?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return false;
    }
    return true;
  };

  const createRecord = async () => {
    if (!userEmail) return;
    setSaving(true); setSaveError(null);
    try {
      const { status, ...rest } = values;
      const res = await fetch('/api/deal-sheet/quick-record', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: rest, status, sourcer, userEmail }),
      });
      const data = await res.json();
      if (!data.success) {
        if (data.fieldErrors) setErrors(data.fieldErrors);
        throw new Error(data.error + (data.detail ? `: ${data.detail}` : ''));
      }
      setCreated({ recordId: data.recordId, propertyAddress: data.propertyAddress, missing: data.missing || [], quickRecordStored: data.quickRecordStored });
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to create record');
    } finally {
      setSaving(false);
    }
  };

  const handleValidateAddress = async () => {
    const q = addressQuery.trim();
    if (!q) { setAddressError('Enter an address to validate.'); return; }
    setValidatingAddress(true); setAddressError(null);
    try {
      const result = await geocodeAddress(q);
      const m = result.bestMatch || result.suggestions?.[0];
      if (!m || !m.suburbName || !m.state) {
        setAddressVerified(false);
        setAddressError('Address not found by Geoscape. Check the address, or click "Edit Address Fields" to enter it manually.');
        return;
      }
      setValues((prev) => {
        const next: Values = { ...prev, streetNumber: m.streetNumber || '', streetName: m.streetName || '', suburbName: m.suburbName || '', state: (m.state || '').toUpperCase(), postCode: m.postCode || '' };
        delete next.lga; // re-resolve for the validated suburb/state/postcode
        return next;
      });
      setCopiedKeys((prev) => { const n = new Set(prev); ['streetNumber', 'streetName', 'suburbName', 'state', 'postCode', 'lga'].forEach((k) => n.delete(k)); return n; });
      setAddressQuery(m.formattedAddress || q);
      setAddressVerified(true);
      setAddressFieldsEditable(false);
      // Same as the packaging tool: check GHL for an existing record as soon as the address is validated (informational)
      fetch('/api/ghl/check-address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyAddress: m.formattedAddress || q }) })
        .then(async (res) => {
          if (!res.ok) return;
          const d = await res.json();
          if (Array.isArray(d.matchingRecords) && d.matchingRecords.length) setDupWarning({ matches: d.matchingRecords, mode: 'info' });
        })
        .catch(() => { /* non-blocking */ });
    } catch (e) {
      setAddressVerified(false);
      setAddressError(e instanceof Error ? e.message : 'Address validation failed.');
    } finally {
      setValidatingAddress(false);
    }
  };

  const handleSave = async (skipStreetCheck = false) => {
    if (!runValidation()) return;
    if (!skipStreetCheck && !(values.streetNumber || '').trim()) { setNoStreetConfirm(true); return; }
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch('/api/ghl/check-address', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ propertyAddress: previewAddress }) });
      const data = await res.json();
      const matches: DuplicateAddressMatch[] = Array.isArray(data.matchingRecords) ? data.matchingRecords : [];
      if (matches.length) {
        setSaving(false);
        setDupWarning({ matches, mode: 'confirm' });
        return;
      }
      setDupCheckNote(data.success === false ? 'The duplicate-address check could not run for this record.' : null);
    } catch {
      setDupCheckNote('The duplicate-address check could not run for this record.');
    }
    await createRecord();
  };

  const resetForAnother = () => {
    setValues({}); setCopiedKeys(new Set()); setSourceAddress(''); setSourceIsProject(false); setErrors({}); setTouchedSave(false); setCreated(null); setSaveError(null); setLgaState({ status: 'idle' });
    setAddressQuery(''); setAddressVerified(false); setAddressFieldsEditable(false); setAddressError(null); setDupCheckNote(null); setShowValidateBox(true); setUnlockedGroups(new Set());
    router.replace('/deal-sheet/quick-record');
  };

  const shapeReady = !!(values.propertyType && values.dualOccupancy && values.dwellingType && values.dealType && values.status);

  // "Clear" groups — Property Description is split in three (format / land & title / build); other sections clear whole.
  const DESCRIPTION_GROUPS: { title: string; keys: string[] }[] = [
    { title: 'Configuration', keys: ['bedsPrimary', 'bedsSecondary', 'bathPrimary', 'bathSecondary', 'garagePrimary', 'garageSecondary', 'carportPrimary', 'carportSecondary', 'carspacePrimary', 'carspaceSecondary'] },
    { title: 'Land & Title', keys: ['landSize', 'title', 'bodyCorpPerQuarter'] },
    { title: 'Land Registration', keys: ['landRegistration'] },
    { title: 'Completion / Year Built', keys: ['completionDate', 'yearBuilt'] },
    { title: 'Build Size', keys: ['buildSize'] },
  ];
  const DECISION_KEYS = ['propertyType', 'dualOccupancy', 'dwellingType', 'dealType', 'status', 'lotNumber', 'lotNumberNotApplicable', 'hasUnitNumbers', 'unitNumber'];
  const SECTION_GROUP_KEYS: Record<string, string[]> = {
    decision: DECISION_KEYS,
    price: ['asking', 'askingText', 'totalPrice', 'landPrice', 'buildPrice', 'cashbackRebateType', 'cashbackRebateValue', 'acceptableAcquisitionFrom', 'acceptableAcquisitionTo'],
    rental: ['occupancyPrimary', 'occupancySecondary', 'currentRentPrimary', 'currentRentSecondary', 'expiryPrimary', 'expirySecondary', 'rentAppraisalPrimaryFrom', 'rentAppraisalPrimaryTo', 'rentAppraisalSecondaryFrom', 'rentAppraisalSecondaryTo'],
  };
  // key -> group id (description sub-groups use their title)
  const groupOfKey: Record<string, string> = {};
  Object.entries(SECTION_GROUP_KEYS).forEach(([g, keys]) => keys.forEach((k) => { groupOfKey[k] = g; }));
  DESCRIPTION_GROUPS.forEach((g) => g.keys.forEach((k) => { groupOfKey[k] = g.title; }));
  // Copy mode: every group starts locked until the user chooses "Retain & edit" or "Clear".
  const [unlockedGroups, setUnlockedGroups] = useState<Set<string>>(new Set());
  const isGroupLocked = (g: string) => !!copyFrom && !unlockedGroups.has(g);
  const unlockGroup = (g: string) => setUnlockedGroups((prev) => new Set(prev).add(g));
  const clearKeys = (keys: string[], group?: string) => {
    setValues((prev) => { const n = { ...prev }; keys.forEach((k) => delete n[k]); return n; });
    setCopiedKeys((prev) => { const n = new Set(prev); keys.forEach((k) => n.delete(k)); return n; });
    if (group) unlockGroup(group);
  };
  const GroupActions = ({ group, keys }: { group: string; keys: string[] }) => (
    <div className="flex items-center gap-2">
      {isGroupLocked(group) && (
        <>
          <button type="button" onClick={() => unlockGroup(group)} className="btn-secondary text-sm px-4 py-1.5">Retain &amp; edit</button>
          <span className="text-sm text-gray-500">or</span>
        </>
      )}
      <button type="button" onClick={() => clearKeys(keys, group)} className="btn-secondary text-sm px-4 py-1.5">Clear</button>
    </div>
  );

  const renderField = (f: FieldDef) => {
    if (!isVisible(f, values)) return null;
    if (f.key === 'lotNumberNotApplicable') return null; // rendered with lotNumber
    if (f.key === 'noMessageForBA') return null; // rendered with messageForBA
    const isAddressField = ['streetNumber', 'streetName', 'suburbName', 'state', 'postCode'].includes(f.key);
    const group = groupOfKey[f.key];
    const locked = isLocked(f, values) || (isAddressField && addressVerified && !addressFieldsEditable) || (!!group && isGroupLocked(group));
    const err = errors[f.key];
    const node = (
      <FieldInput key={f.key} field={f} values={values} locked={locked} error={err} copied={copiedKeys.has(f.key)} tone={t} onChange={setValue} />
    );
    if (f.key === 'lotNumber') {
      const na = values.lotNumberNotApplicable === 'Yes';
      return (
        <div key="lotNumberGroup" className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-3 items-end" data-field-error={err ? '' : undefined}>
          <FieldInput field={{ ...f, required: !na }} values={na ? { ...values, lotNumber: '' } : values} locked={locked || na} error={err} copied={copiedKeys.has('lotNumber')} tone={t} onChange={setValue} />
          <label className={`flex items-center gap-2 text-sm text-gray-700 pb-2 ${locked ? 'opacity-50' : 'cursor-pointer'}`}>
            <input type="checkbox" className="w-4 h-4" checked={na} disabled={locked} onChange={(e) => {
              setValues((prev) => ({ ...prev, lotNumberNotApplicable: e.target.checked ? 'Yes' : '', lotNumber: e.target.checked ? '' : prev.lotNumber || '' }));
            }} />
            Not Applicable
          </label>
        </div>
      );
    }
    if (f.key === 'dealType' && copyFrom && sourceIsProject) {
      return (
        <div key={f.key} data-field-error={err ? '' : undefined} className="md:col-span-2">
          {node}
          <p className="text-xs mt-1 text-blue-700">Copied from a project record. Quick records are created as individual lots — there is no project grouping. Contract type carried over from the source.</p>
        </div>
      );
    }
    if (f.key === 'messageForBA') {
      const none = values.noMessageForBA === 'Yes';
      const empty = !(values.messageForBA || '').trim();
      return (
        <div key={f.key} data-field-error={err ? '' : undefined} className="md:col-span-2">
          {empty && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2">
              <input type="checkbox" className="w-5 h-5" checked={none} onChange={(e) => setValues((prev) => ({ ...prev, noMessageForBA: e.target.checked ? 'Yes' : '' }))} />
              No message needed
            </label>
          )}
          <FieldInput field={{ ...f, required: !none }} values={values} locked={locked || none} error={err} copied={false} tone={t} onChange={(k, v) => { setValue(k, v); if (v.trim()) setValues((prev) => ({ ...prev, noMessageForBA: '' })); }} />
        </div>
      );
    }
    if (f.key === 'lga') {
      return (
        <div key={f.key} data-field-error={err ? '' : undefined}>
          {node}
          {lgaState.status === 'idle' && !values.lga && <p className={`text-xs mt-1 ${t.muted}`}>Enter Suburb, State and Post Code to resolve LGA.</p>}
          {lgaState.status === 'loading' && <p className={`text-xs mt-1 ${t.muted}`}>Resolving LGA…</p>}
          {lgaState.status === 'error' && <p className="text-xs mt-1 text-red-600">{lgaState.message}</p>}
        </div>
      );
    }
    return <div key={f.key} data-field-error={err ? '' : undefined} className={fieldWidth(f, values) === 'full' ? 'md:col-span-2' : ''}>{node}</div>;
  };

  const renderSection = (s: { id: SectionId; title: string }) => {
    const fields = FIELDS.filter((f) => f.section === s.id && isVisible(f, values) && f.key !== 'lotNumberNotApplicable' && f.key !== 'noMessageForBA');
    if (!fields.length) return null;
    return (
      <Section key={s.id} t={t} title={s.title} dim={s.id !== 'address' && !shapeReady}
        actions={SECTION_GROUP_KEYS[s.id] ? <GroupActions group={s.id} keys={SECTION_GROUP_KEYS[s.id]} /> : undefined}>
        {s.id === 'address' && !showValidateBox && (
          <div className="md:col-span-2 pb-2">
            <button type="button" onClick={() => setShowValidateBox(true)} className="text-sm text-blue-700 underline">Validate a different address</button>
          </div>
        )}
        {s.id === 'address' && showValidateBox && (
          <div className="md:col-span-2 space-y-3 pb-4 mb-2 border-b border-gray-200">
            <div>
              <label className="label-field">Property Address (Street Number Only - <span className="text-blue-700">No Unit Numbers</span>)</label>
              <p className="text-xs text-gray-500 mb-2">Enter the street address to validate it through Geoscape and fill in the fields below. Lot and unit numbers are captured separately.</p>
              <div className="flex gap-2">
                <input type="text" className="input-field flex-1" value={addressQuery} placeholder="e.g., 4 Osborne Circuit Maroochydore QLD 4558"
                  onChange={(e) => { setAddressQuery(e.target.value); setAddressVerified(false); }}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleValidateAddress(); } }} />
                <button type="button" onClick={handleValidateAddress} disabled={validatingAddress} className="btn-primary whitespace-nowrap">
                  {validatingAddress ? 'Validating…' : 'Validate Address'}
                </button>
              </div>
            </div>
            {addressVerified && (
              <span className="inline-block bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded">✓ Verified - Address validated through Geoscape</span>
            )}
            {addressError && <p className="text-sm text-red-600">{addressError}</p>}
            {addressVerified && !addressFieldsEditable && (
              <div>
                <button type="button" onClick={() => setAddressFieldsEditable(true)} className="btn-secondary">Edit Address Fields</button>
                <span className="text-xs text-gray-500 ml-3">Use this for lot-only / H&amp;L addresses or to correct a field.</span>
              </div>
            )}
          </div>
        )}
        {s.id === 'description' ? (
          <>
            {DESCRIPTION_GROUPS.map((g) => {
              const groupFields = fields.filter((f) => g.keys.includes(f.key));
              if (!groupFields.length) return null;
              return (
                <div key={g.title} className="md:col-span-2">
                  <div className="flex items-center gap-4 mb-3">
                    <h3 className="text-base font-semibold text-gray-800">{g.title}</h3>
                    <GroupActions group={g.title} keys={g.keys} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 mb-2 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">{groupFields.map(renderField)}</div>
                </div>
              );
            })}
          </>
        ) : s.id === 'rental' && isDual(values) ? (
          <>
            {(['A', 'B'] as const).map((unit) => {
              const keys = unit === 'A'
                ? ['occupancyPrimary', 'currentRentPrimary', 'expiryPrimary', 'rentAppraisalPrimaryFrom', 'rentAppraisalPrimaryTo']
                : ['occupancySecondary', 'currentRentSecondary', 'expirySecondary', 'rentAppraisalSecondaryFrom', 'rentAppraisalSecondaryTo'];
              return (
                <div key={unit} className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit {unit}</h4>
                  <div className="space-y-4">
                    {fields.filter((f) => keys.includes(f.key)).map((f) => renderField({ ...f, width: 'full' }))}
                  </div>
                </div>
              );
            })}
          </>
        ) : fields.map(renderField)}
      </Section>
    );
  };

  if (!userEmail) {
    return (
      <div className={`min-h-screen ${t.bg} ${t.text} flex items-center justify-center p-6`}>
        <div className="max-w-md w-full"><UserEmailPrompt onEmailSet={setUserEmail} /></div>
      </div>
    );
  }

  if (created) {
    return (
      <div className={`min-h-screen ${t.bg} ${t.text}`}>
        <Header t={t} />
        <div className="max-w-2xl mx-auto p-6">
          <div className={`${t.card} rounded-lg p-6 space-y-3`}>
            <h2 className="text-2xl font-bold">Quick record created</h2>
            <p className="text-base">{created.propertyAddress}</p>
            <p className={`text-sm ${t.muted} flex items-center gap-2`}>
              Record ID: <code>{created.recordId}</code>
              <button type="button" onClick={() => { navigator.clipboard.writeText(created.recordId); setCopiedId(true); setTimeout(() => setCopiedId(false), 1500); }}
                className="px-2 py-0.5 rounded border border-gray-300 text-xs text-gray-700 hover:bg-gray-100">{copiedId ? 'Copied' : 'Copy'}</button>
            </p>
            <p className={`text-xs ${t.muted}`}>quick_record stored as: <code>{JSON.stringify(created.quickRecordStored)}</code></p>
            {dupCheckNote && <p className="text-xs text-amber-700">{dupCheckNote}</p>}
            {created.missing.length > 0 && (
              <p className="text-xs text-amber-500">GHL did not echo back: {created.missing.join(', ')} — check the record in GHL.</p>
            )}
            <div className="flex gap-2 pt-2">
              <button onClick={() => router.push('/deal-sheet')} className="btn-primary">Back to Deal Sheet</button>
              <button onClick={resetForAnother} className="btn-secondary">Create another</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${t.bg} ${t.text} pb-28`}>
      <Header t={t} right={
        <button onClick={() => router.push('/deal-sheet')} className="btn-secondary">Back to Deal Sheet</button>
      } />

      {loading && (
        <div className="fixed inset-0 bg-white/80 flex items-center justify-center z-[900]">
          <div className={`${t.card} rounded-lg px-8 py-6 flex items-center gap-4`}>
            <div className="w-6 h-6 border-4 border-gray-300 border-t-primary-600 rounded-full animate-spin" />
            <div>
              <p className="text-base font-semibold text-gray-900">Loading property details…</p>
              <p className="text-sm text-gray-600">Please wait while the source record is fetched from GHL.</p>
            </div>
          </div>
        </div>
      )}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        {loadError && <p className="text-sm text-red-500">{loadError}</p>}

        {copyFrom && sourceAddress && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm flex items-center justify-between">
            <span>Copying from: <strong>{sourceAddress}</strong>. Each section is locked with the source values — choose <strong>Retain &amp; edit</strong> to keep and adjust them, or <strong>Clear</strong> to start that section fresh. Lot / Unit / Street Number must be entered.</span>
            <code className={t.muted}>{copyFrom}</code>
          </div>
        )}

        {SECTIONS.filter((s) => s.id === 'address').map(renderSection)}

        {/* Decision tree + sourcer */}
        <Section t={t} title="Decision Tree" actions={<GroupActions group="decision" keys={DECISION_KEYS} />}>
          {FIELDS.filter((f) => f.section === 'decision').map(renderField)}
          <div>
            <label className="label-field">Sourcer *</label>
            <select className={`input-field ${errors.sourcer ? 'border-red-500' : ''}`} value={sourcer} onChange={(e) => { setSourcer(e.target.value); setErrors((prev) => { const n = { ...prev }; delete n.sourcer; return n; }); }}>
              <option value="">Select...</option>
              {sourcer && !sourcerOptions.includes(sourcer) && <option value={sourcer}>{sourcer}</option>}
              {sourcerOptions.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            {errors.sourcer && <p className="text-xs mt-1 text-red-600">{errors.sourcer}</p>}
          </div>
        </Section>

        {!shapeReady && (
          <p className={`text-sm ${t.muted}`}>Complete the Decision Tree to unlock the remaining sections.</p>
        )}

        {SECTIONS.filter((s) => s.id !== 'decision' && s.id !== 'address').map(renderSection)}
        {saveError && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>}
      </div>

      {/* Sticky derived strip */}
      <div className={`fixed bottom-0 left-0 right-0 ${t.headerBg} border-t ${t.border}`}>
        <div className="max-w-5xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
          <Derived label="Address" value={previewAddress} t={t} wide />
          <Derived label="Contract" value={derived.contractType || ''} t={t} />
          <Derived label="Total" value={derived.totalPrice !== null ? formatCurrency(String(derived.totalPrice)) : ''} t={t} />
          <Derived label="Net" value={derived.netPrice !== null ? formatCurrency(String(derived.netPrice)) : ''} t={t} />
          <Derived label="Price group" value={priceGroupLabel(derived.priceGroup)} t={t} />
          <Derived label="Yield" value={derived.yield} t={t} />
          <Derived label="Appraised yield" value={derived.appraisedYield} t={t} />
          <div className="ml-auto flex items-center gap-2">
            {touchedSave && Object.keys(errors).length > 0 && <span className="text-red-600">{Object.keys(errors).length} field(s) need attention</span>}
            <button onClick={() => handleSave()} disabled={saving || loading} className="btn-primary">
              {saving ? 'Saving…' : 'Create quick record'}
            </button>
          </div>
        </div>
      </div>

      {noStreetConfirm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setNoStreetConfirm(false)}>
          <div className={`${t.bg} ${t.text} border ${t.border} rounded-lg max-w-md w-full p-5 space-y-3`} onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg">No street number entered</h3>
            <p className="text-sm">The address will be saved as <strong>{previewAddress}</strong>. Continue without a street number, or go back and add it?</p>
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setNoStreetConfirm(false)} className="btn-secondary">Go back and edit</button>
              <button onClick={() => { setNoStreetConfirm(false); handleSave(true); }} className="btn-primary">Continue without it</button>
            </div>
          </div>
        </div>
      )}

      {dupWarning && (
        <DuplicateAddressDialog
          matches={dupWarning.matches}
          confirmLabel={dupWarning.mode === 'confirm' ? 'Yes, create anyway' : 'OK, understood'}
          onConfirm={() => { const mode = dupWarning.mode; setDupWarning(null); if (mode === 'confirm') createRecord(); }}
          onCancel={() => setDupWarning(null)}
        />
      )}
    </div>
  );
}

function Header({ t, right }: { t: ThemeTokens; right?: React.ReactNode }) {
  return (
    <div className={`${t.headerBg} border-b ${t.border}`}>
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <img src="/logo.jpg" alt="Buyers Club" className="h-10 w-auto" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quick Property Record</h1>
            <p className="text-sm text-gray-600">Create a minimal property record for linking — no packaged email, PDF or folder.</p>
          </div>
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-500 text-black">QUICK</span>
        </div>
        {right}
      </div>
    </div>
  );
}

function Section({ t, title, dim, actions, children }: { t: ThemeTokens; title: string; dim?: boolean; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className={`${t.card} rounded-lg p-6 ${dim ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-4 mb-4 pb-2 border-b">
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </section>
  );
}

function Derived({ label, value, t, wide }: { label: string; value: string; t: ThemeTokens; wide?: boolean }) {
  return (
    <div className={`flex items-baseline gap-1 ${wide ? 'basis-full md:basis-auto md:max-w-xs truncate' : ''}`}>
      <span className={t.muted}>{label}:</span>
      <span className="font-medium truncate" title={value}>{value || '—'}</span>
    </div>
  );
}

export default function QuickRecordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-900 text-gray-300 flex items-center justify-center text-sm">Loading…</div>}>
      <QuickRecordInner />
    </Suspense>
  );
}
