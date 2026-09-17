'use client';

import { useEffect, useState, useCallback } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail } from '@/lib/userAuth';

if (typeof document !== 'undefined') document.title = 'EOI Template Admin';

// ============================================================================
// CONSTANTS
// ============================================================================

const STATES = ['NSW', 'VIC', 'QLD', 'WA', 'SA', 'TAS'] as const;
const TYPES = ['established', 'new_single', 'house_and_land'] as const;
const TYPE_LABELS: Record<string, string> = {
  established: 'Established',
  new_single: 'New (Single Contract)',
  house_and_land: 'H&L (Split Contract)',
};

// Fields per property type
const ESTABLISHED_FIELDS = ['notes', 'speculative_message', 'deposit_amount', 'deposit_payable', 'finance', 'building_pest', 'settlement'] as const;
const NEW_SINGLE_FIELDS = ['notes', 'speculative_message', 'deposit_amount', 'deposit_payable', 'finance', 'pci', 'commission', 'settlement'] as const;
const HL_FIELDS = ['notes', 'speculative_message', 'land_deposit', 'build_deposit', 'finance', 'pci', 'commission', 'settlement'] as const;

const FIELDS_BY_TYPE: Record<string, readonly string[]> = {
  established: ESTABLISHED_FIELDS,
  new_single: NEW_SINGLE_FIELDS,
  house_and_land: HL_FIELDS,
};

const FIELD_LABELS: Record<string, string> = {
  notes: 'Notes',
  speculative_message: 'Speculative Message',
  deposit_amount: 'Deposit Amount',
  deposit_payable: 'Deposit Payable',
  finance: 'Finance',
  building_pest: 'Building & Pest',
  pci: 'PCI',
  commission: 'Commission',
  settlement: 'Settlement',
  land_deposit: 'Deposit — Land Amount',
  build_deposit: 'Deposit — Build Amount',
};

// ============================================================================
// TYPES
// ============================================================================

interface ConditionRow {
  id: number;
  text: string;
  state: string | null;
  property_type: string | null;
  is_default: boolean;
  sort_order: number;
  usage_count: number;
}

interface AuditEntry {
  field_name: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  changed_at: string;
}

// ============================================================================
// STYLES
// ============================================================================

const inputCls = 'w-full px-2 py-1 text-xs rounded border bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500';
const labelCls = 'text-[10px] font-semibold text-gray-500 uppercase tracking-wide';
const btnPrimary = 'px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50';
const btnSecondary = 'px-3 py-1 text-xs rounded bg-gray-200 text-gray-700 hover:bg-gray-300';
const btnDanger = 'px-2 py-0.5 text-xs rounded bg-red-100 text-red-700 hover:bg-red-200';

// ============================================================================
// TABLE VIEW COMPONENT
// ============================================================================

function TableView({
  userEmail,
  showToast,
}: {
  userEmail: string;
  showToast: (msg: string) => void;
}) {
  // All data: type → state → field → value
  const [allData, setAllData] = useState<Record<string, Record<string, Record<string, string>>>>({});
  const [editedCells, setEditedCells] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Conditions modal state
  const [condModal, setCondModal] = useState<{ state: string; ptype: string } | null>(null);
  const [condItems, setCondItems] = useState<ConditionRow[]>([]);
  const [condNewText, setCondNewText] = useState('');
  const [condLoading, setCondLoading] = useState(false);
  const [condSaving, setCondSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const data: Record<string, Record<string, Record<string, string>>> = {};
    const requests: { ptype: string; state: string; promise: Promise<Response> }[] = [];
    for (const ptype of TYPES) {
      data[ptype] = {};
      for (const st of STATES) {
        requests.push({
          ptype,
          state: st,
          promise: fetch(`/api/eoi/templates?state=${st}&type=${ptype}&_t=${Date.now()}`),
        });
      }
    }
    const responses = await Promise.all(requests.map((r) => r.promise));
    const jsons = await Promise.all(responses.map((r) => r.json()));
    for (let i = 0; i < requests.length; i++) {
      data[requests[i].ptype][requests[i].state] = jsons[i].values || {};
    }
    setAllData(data);
    setEditedCells({});
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  function cellKey(ptype: string, state: string, field: string) {
    return `${ptype}/${state}/${field}`;
  }

  function getCellValue(ptype: string, state: string, field: string) {
    const key = cellKey(ptype, state, field);
    if (key in editedCells) return editedCells[key];
    return allData[ptype]?.[state]?.[field] ?? '';
  }

  function setCellValue(ptype: string, state: string, field: string, value: string) {
    const key = cellKey(ptype, state, field);
    setEditedCells((prev) => ({ ...prev, [key]: value }));
  }

  function isCellDirty(ptype: string, state: string, field: string) {
    const key = cellKey(ptype, state, field);
    if (!(key in editedCells)) return false;
    return editedCells[key] !== (allData[ptype]?.[state]?.[field] ?? '');
  }

  async function saveAll() {
    const grouped: Record<string, { field_name: string; field_value: string }[]> = {};
    for (const [key, value] of Object.entries(editedCells)) {
      const [ptype, state, field] = key.split('/');
      const original = allData[ptype]?.[state]?.[field] ?? '';
      if (value === original) continue;
      const groupKey = `${state}/${ptype}`;
      if (!grouped[groupKey]) grouped[groupKey] = [];
      grouped[groupKey].push({ field_name: field, field_value: value });
    }

    const entries = Object.entries(grouped);
    if (entries.length === 0) {
      showToast('No changes to save');
      return;
    }

    setSaving(true);
    let totalUpdated = 0;
    for (const [groupKey, changes] of entries) {
      const [state, ptype] = groupKey.split('/');
      const res = await fetch('/api/eoi/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, property_type: ptype, changes, updated_by: userEmail }),
      });
      if (res.ok) {
        const d = await res.json();
        totalUpdated += d.updated;
      }
    }
    showToast(`Saved ${totalUpdated} change${totalUpdated !== 1 ? 's' : ''}`);
    await fetchAll();
    setSaving(false);
  }

  // ---- Conditions modal functions ----
  async function openCondModal(st: string, ptype: string) {
    setCondModal({ state: st, ptype });
    setCondNewText('');
    setCondLoading(true);
    try {
      const res = await fetch(`/api/eoi/templates?state=${st}&type=${ptype}&_t=${Date.now()}`);
      const data = await res.json();
      setCondItems(
        (data.special_conditions || [])
          .filter((c: ConditionRow) => c.is_default)
          .sort((a: ConditionRow, b: ConditionRow) => a.sort_order - b.sort_order)
      );
    } catch {
      showToast('Failed to load conditions');
    } finally {
      setCondLoading(false);
    }
  }

  function condMove(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= condItems.length) return;
    const next = [...condItems];
    [next[index], next[target]] = [next[target], next[index]];
    setCondItems(next);
  }

  function condRemove(index: number) {
    setCondItems(prev => prev.filter((_, i) => i !== index));
  }

  function condUpdate(index: number, text: string) {
    setCondItems(prev => prev.map((c, i) => i === index ? { ...c, text } : c));
  }

  async function condAdd() {
    if (!condNewText.trim() || !condModal) return;
    setCondSaving(true);
    try {
      const res = await fetch('/api/eoi/conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: condNewText.trim(), state: condModal.state, property_type: condModal.ptype }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setCondItems(prev => [...prev, {
        id: data.id, text: condNewText.trim(), state: condModal.state,
        property_type: condModal.ptype, is_default: true, sort_order: prev.length, usage_count: 0,
      }]);
      setCondNewText('');
      showToast('Condition added');
    } catch { showToast('Failed to add condition'); }
    finally { setCondSaving(false); }
  }

  async function condSave() {
    if (!condModal) return;
    setCondSaving(true);
    try {
      const payload = condItems.map((c, i) => ({ id: c.id, sort_order: i, is_default: true, text: c.text }));
      await fetch('/api/eoi/conditions/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state: condModal.state, property_type: condModal.ptype, conditions: payload }),
      });
      showToast('Conditions saved');
    } catch { showToast('Failed to save conditions'); }
    finally { setCondSaving(false); }
  }

  async function copyConditionsToAllStates(ptype: string) {
    // 1. Fetch conditions for all states, find first with conditions
    const allConds: Record<string, ConditionRow[]> = {};
    await Promise.all(STATES.map(async (st) => {
      const res = await fetch(`/api/eoi/templates?state=${st}&type=${ptype}&_t=${Date.now()}`);
      const data = await res.json();
      allConds[st] = (data.special_conditions || [])
        .filter((c: ConditionRow) => c.is_default)
        .sort((a: ConditionRow, b: ConditionRow) => a.sort_order - b.sort_order);
    }));
    const sourceState = STATES.find(st => allConds[st].length > 0);
    if (!sourceState) { showToast('No conditions found to copy'); return; }
    const sourceTexts = allConds[sourceState].map(c => c.text);

    setSaving(true);
    let copied = 0;
    for (const st of STATES) {
      if (st === sourceState) continue;
      // Create new conditions for this state
      const newIds: number[] = [];
      for (const text of sourceTexts) {
        const res = await fetch('/api/eoi/conditions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, state: st, property_type: ptype }),
        });
        if (res.ok) { const d = await res.json(); newIds.push(d.id); }
      }
      // Save order and mark as default
      await fetch('/api/eoi/conditions/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: st, property_type: ptype,
          conditions: newIds.map((id, i) => ({ id, sort_order: i, is_default: true })),
        }),
      });
      copied++;
    }
    setSaving(false);
    showToast(`Copied ${sourceTexts.length} conditions from ${sourceState} to ${copied} states`);
  }

  const hasChanges = Object.entries(editedCells).some(([key, value]) => {
    const [ptype, state, field] = key.split('/');
    return value !== (allData[ptype]?.[state]?.[field] ?? '');
  });

  if (loading) return <div className="text-xs text-gray-500 py-8 text-center">Loading all states…</div>;

  return (
    <div>
      {TYPES.map((ptype) => {
        const fields = FIELDS_BY_TYPE[ptype];
        return (
          <div key={ptype} className="bg-white rounded border border-gray-200 p-4 mb-4">
            <div className="text-xs font-bold mb-3">{TYPE_LABELS[ptype]}</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 border-b border-gray-200 text-[10px] font-semibold text-gray-500 w-32">Field</th>
                    {STATES.map((st) => (
                      <th key={st} className="text-left px-2 py-1 border-b border-gray-200 text-[10px] font-semibold text-gray-500">{st}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fields.map((field) => (
                    <tr key={field} className="hover:bg-gray-50">
                      <td className="px-2 py-1.5 border-b border-gray-100 text-[10px] font-semibold text-gray-600">
                        {FIELD_LABELS[field] || field}
                        {field === 'notes' && (
                          <p className="text-[9px] text-gray-400 italic mt-0.5 font-normal">&apos;Please do not send the contract directly to the purchaser&apos; is automatically included in every EOI email.</p>
                        )}
                        {field === 'speculative_message' && (
                          <p className="text-[9px] text-gray-400 italic mt-0.5 font-normal">Shown as a banner when the EOI is speculative (no linked opportunity).</p>
                        )}
                        <button
                          onClick={() => {
                            const src = STATES.map(s => getCellValue(ptype, s, field)).find(v => v.trim());
                            if (!src) return;
                            STATES.forEach(s => setCellValue(ptype, s, field, src));
                          }}
                          className="text-[9px] text-blue-500 hover:text-blue-700 mt-1 font-normal block"
                        >
                          → Copy to all states
                        </button>
                      </td>
                      {STATES.map((st) => (
                        <td key={st} className="px-1 py-1 border-b border-gray-100 align-top">
                          <textarea
                            value={getCellValue(ptype, st, field)}
                            onChange={(e) => {
                              setCellValue(ptype, st, field, e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = e.target.scrollHeight + 'px';
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = el.scrollHeight + 'px';
                              }
                            }}
                            rows={1}
                            className={`w-full px-1.5 py-0.5 text-[11px] rounded border bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none overflow-hidden ${
                              isCellDirty(ptype, st, field) ? 'border-amber-400 ring-1 ring-amber-400' : 'border-gray-200'
                            }`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Special Conditions row */}
                  <tr>
                    <td className="px-2 py-1.5 border-b border-gray-100 text-[10px] font-semibold text-gray-600">
                      Special Conditions
                      <button
                        onClick={() => copyConditionsToAllStates(ptype)}
                        disabled={saving}
                        className="text-[9px] text-blue-500 hover:text-blue-700 mt-1 font-normal block disabled:opacity-50"
                      >
                        → Copy to all states
                      </button>
                    </td>
                    {STATES.map(st => (
                      <td key={st} className="px-1 py-1.5 border-b border-gray-100 text-center">
                        <button onClick={() => openCondModal(st, ptype)}
                          className="px-2 py-0.5 text-[10px] rounded border border-gray-300 text-gray-600 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700">
                          Edit
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
      {hasChanges && (
        <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-amber-300 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] py-3 px-4 flex justify-end -mx-4 mt-4">
          <button onClick={saveAll} disabled={saving} className="px-5 py-2 text-sm font-bold rounded bg-amber-500 text-white hover:bg-amber-600 shadow-lg ring-2 ring-amber-300 animate-pulse disabled:opacity-50 disabled:animate-none">
            {saving ? 'Saving…' : `Save All Changes (${Object.keys(editedCells).length})`}
          </button>
        </div>
      )}

      {/* ---- Conditions Modal ---- */}
      {condModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setCondModal(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-gray-800">
                Special Conditions — {condModal.state} / {TYPE_LABELS[condModal.ptype] || condModal.ptype}
              </h3>
              <button onClick={() => setCondModal(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">&times;</button>
            </div>

            {condLoading ? (
              <div className="text-xs text-gray-500 py-4 text-center">Loading…</div>
            ) : (
              <>
                {condItems.length === 0 && (
                  <div className="text-xs text-gray-400 py-2">No conditions for this state/type.</div>
                )}

                <div className="space-y-2 mb-3">
                  {condItems.map((cond, i) => (
                    <div key={cond.id} className="flex gap-1.5 items-start">
                      <div className="flex flex-col gap-0.5 pt-0.5">
                        <button onClick={() => condMove(i, -1)} disabled={i === 0}
                          className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move up">▲</button>
                        <button onClick={() => condMove(i, 1)} disabled={i === condItems.length - 1}
                          className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30" title="Move down">▼</button>
                      </div>
                      <span className="text-[10px] text-gray-400 pt-1 w-4 shrink-0">{i + 1}.</span>
                      <textarea value={cond.text} onChange={e => condUpdate(i, e.target.value)}
                        rows={1} className={`${inputCls} flex-1 resize-none overflow-hidden`}
                        ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                        onInput={e => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                      />
                      <button onClick={() => condRemove(i)} className={`${btnDanger} shrink-0 mt-0.5`} title="Remove">✕</button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 mb-3">
                  <input value={condNewText} onChange={e => setCondNewText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && condAdd()}
                    placeholder="Add a new condition…" className={`${inputCls} flex-1`} />
                  <button onClick={condAdd} disabled={!condNewText.trim() || condSaving} className={btnSecondary}>+ Add</button>
                </div>

                <div className="flex justify-end">
                  <button onClick={condSave} disabled={condSaving}
                    className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50">
                    {condSaving ? 'Saving…' : 'Save Conditions'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function EoiTemplateAdminPage() {
  // User identification
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [emailInput, setEmailInput] = useState('');
  const [emailError, setEmailError] = useState('');

  // View mode
  const [view, setView] = useState<'form' | 'table'>('form');

  // State/type selection (form view)
  const [state, setState] = useState<string>('NSW');
  const [propertyType, setPropertyType] = useState<string>('established');

  // Template values
  const [values, setValues] = useState<Record<string, string>>({});
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [establishedValues, setEstablishedValues] = useState<Record<string, string> | null>(null);

  // Special conditions
  const [conditions, setConditions] = useState<ConditionRow[]>([]);
  const [newConditionText, setNewConditionText] = useState('');

  

  // Global CC list
  const [ccEmails, setCcEmails] = useState<string[]>([]);
  const [ccEmailsSaved, setCcEmailsSaved] = useState<string[]>([]);
  const [ccNewEmail, setCcNewEmail] = useState('');
  const [ccSaving, setCcSaving] = useState(false);
  const [ccPropertyOn, setCcPropertyOn] = useState(true);
  const [ccPropertyOnSaved, setCcPropertyOnSaved] = useState(true);
  const [ccBaOn, setCcBaOn] = useState(true);
  const [ccBaOnSaved, setCcBaOnSaved] = useState(true);

  // Audit log
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  // ---- Auth ----------------------------------------------------------------
  useEffect(() => {
    setUserEmail(getUserEmail());
  }, []);

  function handleEmailSubmit() {
    const validation = validateUserEmail(emailInput);
    if (!validation.isValid) {
      setEmailError(validation.error || 'Invalid email');
      return;
    }
    saveUserEmail(emailInput);
    setUserEmail(validation.email);
    setEmailError('');
  }

  // ---- Toast ---------------------------------------------------------------
  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }

  // ---- Fetch template data -------------------------------------------------
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/eoi/templates?state=${state}&type=${propertyType}&_t=${Date.now()}`);
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setValues(data.values || {});
      setEditedValues(data.values || {});
      setEstablishedValues(data.establishedValues || null);
      setConditions(
        (data.special_conditions || [])
          .filter((c: ConditionRow) => c.is_default)
          .sort((a: ConditionRow, b: ConditionRow) => a.sort_order - b.sort_order)
      );
      setAuditLog(data.audit_log || []);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
    } finally {
      setLoading(false);
    }
  }, [state, propertyType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ---- Global CC list -------------------------------------------------------
  const fetchCcList = useCallback(async () => {
    try {
      const res = await fetch(`/api/eoi/templates?state=GLB&type=all&_t=${Date.now()}`);
      if (!res.ok) return;
      const data = await res.json();
      const raw = data.values?.cc_list || '';
      const emails = raw.split(',').map((e: string) => e.trim()).filter((e: string) => e.includes('@'));
      setCcEmails(emails);
      setCcEmailsSaved(emails);
      const propOn = data.values?.cc_include_property !== 'false';
      setCcPropertyOn(propOn);
      setCcPropertyOnSaved(propOn);
      const baOn = data.values?.cc_include_ba !== 'false';
      setCcBaOn(baOn);
      setCcBaOnSaved(baOn);
    } catch {}
  }, []);

  useEffect(() => { fetchCcList(); }, [fetchCcList]);

  function addCcEmail() {
    const email = ccNewEmail.trim().toLowerCase();
    if (!email || !email.includes('@') || ccEmails.includes(email)) return;
    setCcEmails(prev => [...prev, email]);
    setCcNewEmail('');
  }

  function removeCcEmail(email: string) {
    setCcEmails(prev => prev.filter(e => e !== email));
  }

  async function saveCcList() {
    setCcSaving(true);
    try {
      const res = await fetch('/api/eoi/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state: 'GLB', property_type: 'all',
          changes: [
            { field_name: 'cc_list', field_value: ccEmails.join(', ') },
            { field_name: 'cc_include_property', field_value: String(ccPropertyOn) },
            { field_name: 'cc_include_ba', field_value: String(ccBaOn) },
          ],
          updated_by: userEmail,
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      setCcEmailsSaved([...ccEmails]);
      setCcPropertyOnSaved(ccPropertyOn);
      setCcBaOnSaved(ccBaOn);
      showToast('CC list saved');
    } catch { showToast('Failed to save CC list'); }
    finally { setCcSaving(false); }
  }

  const ccHasChanges = JSON.stringify(ccEmails) !== JSON.stringify(ccEmailsSaved) || ccPropertyOn !== ccPropertyOnSaved || ccBaOn !== ccBaOnSaved;

  // ---- Save template values ------------------------------------------------
  const activeFields = FIELDS_BY_TYPE[propertyType] || ESTABLISHED_FIELDS;

  async function saveValues() {
    const changes: { field_name: string; field_value: string }[] = [];
    for (const field of activeFields) {
      if (editedValues[field] !== values[field]) {
        changes.push({ field_name: field, field_value: editedValues[field] || '' });
      }
    }
    if (changes.length === 0) {
      showToast('No changes to save');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/eoi/templates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state,
          property_type: propertyType,
          changes,
          updated_by: userEmail || 'unknown',
        }),
      });
      if (!res.ok) throw new Error('Save failed');
      const data = await res.json();
      showToast(`Saved ${data.updated} change${data.updated !== 1 ? 's' : ''}`);
      await fetchData();
    } catch (err) {
      console.error('Save error:', err);
      showToast('Save failed — check console');
    } finally {
      setSaving(false);
    }
  }

  // ---- Condition management ------------------------------------------------
  async function saveConditionOrder() {
    const payload = conditions.map((c, i) => ({
      id: c.id,
      sort_order: i,
      is_default: true,
    }));

    setSaving(true);
    try {
      await fetch('/api/eoi/conditions/order', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state, property_type: propertyType, conditions: payload }),
      });
      showToast('Conditions saved');
      await fetchData();
    } catch {
      showToast('Failed to save conditions');
    } finally {
      setSaving(false);
    }
  }

  function moveCondition(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= conditions.length) return;
    const next = [...conditions];
    [next[index], next[target]] = [next[target], next[index]];
    setConditions(next);
  }

  function removeCondition(index: number) {
    setConditions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateConditionText(index: number, text: string) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, text } : c)));
  }

  async function addCondition() {
    if (!newConditionText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/eoi/conditions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newConditionText.trim(), state, property_type: propertyType }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setConditions((prev) => [
        ...prev,
        {
          id: data.id,
          text: newConditionText.trim(),
          state,
          property_type: propertyType,
          is_default: true,
          sort_order: prev.length,
          usage_count: 0,
        },
      ]);
      setNewConditionText('');
      showToast('Condition added');
    } catch {
      showToast('Failed to add condition');
    } finally {
      setSaving(false);
    }
  }

  

  // ---- Check for inherited values ------------------------------------------
  function isInherited(field: string): boolean {
    if (propertyType === 'established' || !establishedValues) return false;
    if (field !== 'finance') return false;
    return values[field] === establishedValues[field];
  }

  const hasValueChanges = activeFields.some((f) => editedValues[f] !== values[f]);

  // ---- Auth gate -----------------------------------------------------------
  if (!userEmail) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="bg-white rounded border border-gray-200 p-6 w-[360px]">
          <h1 className="text-sm font-bold mb-2">EOI Template Admin</h1>
          <p className="text-xs text-gray-500 mb-4">Enter your @buyersclub.com.au email to continue</p>
          <input
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
            placeholder="your.name@buyersclub.com.au"
            className={inputCls}
          />
          {emailError && <p className="text-xs text-red-600 mt-1">{emailError}</p>}
          <button onClick={handleEmailSubmit} className={`${btnPrimary} mt-3 w-full`}>
            Continue
          </button>
        </div>
      </div>
    );
  }

  // ---- Main render ---------------------------------------------------------
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-green-600 text-white text-xs px-4 py-2 rounded shadow-lg">
          {toast}
        </div>
      )}

      <div className={`mx-auto px-4 py-6 ${view === 'table' ? 'max-w-6xl' : 'max-w-3xl'}`}>
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-lg font-bold">EOI Template Admin</h1>
          <div className="flex gap-1">
            <button
              onClick={() => setView('form')}
              className={`px-3 py-1 text-xs rounded ${view === 'form' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Form View
            </button>
            <button
              onClick={() => setView('table')}
              className={`px-3 py-1 text-xs rounded ${view === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
            >
              Table View
            </button>

          </div>
        </div>
        <p className="text-[11px] text-gray-500 mb-4">
          Edit the default terms that pre-populate EOI forms. Changes are audited.
          Logged in as <span className="font-medium">{userEmail}</span>
        </p>

        {/* Global CC Recipients */}
        <div className="bg-white rounded border border-gray-200 p-4 mb-4">
          <div className="text-xs font-bold mb-2">CC Recipients (all EOIs)</div>
          <p className="text-[9px] text-gray-400 italic mb-2">
            These emails will be CC&apos;d on every EOI. property@buyersclub.com.au and the assigned BA are always included automatically.
          </p>
          {/* Toggleable default recipients + added emails */}
          <div className="flex flex-wrap gap-1.5 mb-2">
            <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border cursor-pointer ${ccPropertyOn ? 'bg-green-50 text-green-800 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
              <input type="checkbox" checked={ccPropertyOn} onChange={e => setCcPropertyOn(e.target.checked)} className="w-3 h-3" />
              property@buyersclub.com.au
            </label>
            <label className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] border cursor-pointer ${ccBaOn ? 'bg-green-50 text-green-800 border-green-200' : 'bg-gray-50 text-gray-400 border-gray-200 line-through'}`}>
              <input type="checkbox" checked={ccBaOn} onChange={e => setCcBaOn(e.target.checked)} className="w-3 h-3" />
              Assigned BA
            </label>
            {ccEmails.map(email => (
              <span key={email} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-50 text-[10px] text-blue-800 border border-blue-200">
                {email}
                <button onClick={() => removeCcEmail(email)} className="text-blue-400 hover:text-red-500 font-bold leading-none" title="Remove">&times;</button>
              </span>
            ))}
          </div>
          {/* Add new */}
          <div className="flex gap-2 items-center">
            <input
              value={ccNewEmail}
              onChange={e => setCcNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addCcEmail()}
              placeholder="Add email address…"
              className={`${inputCls} flex-1`}
            />
            <button onClick={addCcEmail} disabled={!ccNewEmail.trim() || !ccNewEmail.includes('@')} className={`${btnSecondary} disabled:opacity-50`}>
              + Add
            </button>
          </div>
          {/* Save */}
          {ccHasChanges && (
            <div className="flex justify-end mt-2">
              <button
                onClick={saveCcList}
                disabled={ccSaving}
                className="px-3 py-1 text-xs rounded bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
              >
                {ccSaving ? 'Saving…' : 'Save CC List'}
              </button>
            </div>
          )}
        </div>

        {view === 'table' ? (
          <TableView userEmail={userEmail} showToast={showToast} />
        ) : (
          <>
            {/* State / Type selectors */}
            <div className="flex gap-3 mb-5">
              <div>
                <div className={labelCls}>State</div>
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className={`${inputCls} w-24`}
                >
                  {STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <div className={labelCls}>Type</div>
                <select
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                  className={`${inputCls} w-52`}
                >
                  {TYPES.map((t) => (
                    <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
            </div>

            {loading ? (
              <div className="text-xs text-gray-500 py-8 text-center">Loading…</div>
            ) : (
              <>
                {/* ---- Terms section ---- */}
                <div className="bg-white rounded border border-gray-200 p-4 mb-4">
                  <div className="text-xs font-bold mb-3">Terms</div>
                  <div className="space-y-3">
                    {activeFields.map((field) => (
                      <div key={field}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={labelCls}>{FIELD_LABELS[field] || field}</span>
                          {isInherited(field) && (
                            <span className="text-[9px] italic text-gray-400">inherited from Established</span>
                          )}
                        </div>
                        {field === 'notes' || field === 'speculative_message' ? (
                          <>
                            <textarea
                              value={editedValues[field] || ''}
                              onChange={(e) =>
                                setEditedValues((prev) => ({ ...prev, [field]: e.target.value }))
                              }
                              rows={2}
                              className={`${inputCls} resize-none overflow-hidden ${
                                editedValues[field] !== values[field] ? 'ring-1 ring-amber-400' : ''
                              }`}
                              ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                              onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                            />
                            {field === 'notes' && (
                              <p className="text-[9px] text-gray-400 italic mt-0.5">The sentence &apos;Please do not send the contract directly to the purchaser&apos; is automatically included in every EOI email — you do not need to add it here.</p>
                            )}
                            {field === 'speculative_message' && (
                              <p className="text-[9px] text-gray-400 italic mt-0.5">Shown as a banner at the top of the email when the EOI is speculative (no linked opportunity).</p>
                            )}
                          </>
                        ) : (
                          <input
                            value={editedValues[field] || ''}
                            onChange={(e) =>
                              setEditedValues((prev) => ({ ...prev, [field]: e.target.value }))
                            }
                            className={`${inputCls} ${
                              editedValues[field] !== values[field] ? 'ring-1 ring-amber-400' : ''
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  {hasValueChanges && (
                    <div className="sticky bottom-0 z-10 bg-white/95 backdrop-blur border-t border-amber-300 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] py-3 px-4 flex justify-end -mx-4 mt-4">
                      <button
                        onClick={saveValues}
                        disabled={saving}
                        className="px-5 py-2 text-sm font-bold rounded bg-amber-500 text-white hover:bg-amber-600 shadow-lg ring-2 ring-amber-300 animate-pulse disabled:opacity-50 disabled:animate-none"
                      >
                        {saving ? 'Saving…' : 'Save All Changes'}
                      </button>
                    </div>
                  )}
                </div>

                {/* ---- Special Conditions section ---- */}
                <div className="bg-white rounded border border-gray-200 p-4 mb-4">
                  <div className="text-xs font-bold mb-3">
                    Special Conditions
                    <span className="font-normal text-gray-400 ml-2">
                      {conditions.length} active
                    </span>
                  </div>

                  {conditions.length === 0 && (
                    <div className="text-xs text-gray-400 py-2">No conditions for this state/type.</div>
                  )}

                  <div className="space-y-2 mb-3">
                    {conditions.map((cond, i) => (
                      <div key={cond.id} className="flex gap-1.5 items-start group">
                        <div className="flex flex-col gap-0.5 pt-0.5">
                          <button
                            onClick={() => moveCondition(i, -1)}
                            disabled={i === 0}
                            className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            title="Move up"
                          >
                            ▲
                          </button>
                          <button
                            onClick={() => moveCondition(i, 1)}
                            disabled={i === conditions.length - 1}
                            className="text-[10px] text-gray-400 hover:text-gray-700 disabled:opacity-30"
                            title="Move down"
                          >
                            ▼
                          </button>
                        </div>
                        <span className="text-[10px] text-gray-400 pt-1 w-4 shrink-0">{i + 1}.</span>
                        <textarea
                          value={cond.text}
                          onChange={(e) => updateConditionText(i, e.target.value)}
                          rows={1}
                          className={`${inputCls} flex-1 resize-none overflow-hidden`}
                          ref={(el) => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                          onInput={(e) => { const t = e.currentTarget; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                        />
                        <button
                          onClick={() => removeCondition(i)}
                          className={`${btnDanger} shrink-0 mt-0.5`}
                          title="Remove"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add new condition */}
                  <div className="flex gap-2 mb-2">
                    <input
                      value={newConditionText}
                      onChange={(e) => setNewConditionText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && addCondition()}
                      placeholder="Add a new condition…"
                      className={`${inputCls} flex-1`}
                    />
                    <button onClick={addCondition} disabled={!newConditionText.trim()} className={btnSecondary}>
                      + Add
                    </button>
                  </div>

                  <div className="flex justify-end">
                    <button onClick={saveConditionOrder} disabled={saving} className={btnPrimary}>
                      {saving ? 'Saving…' : 'Save Conditions'}
                    </button>
                  </div>
                </div>

                {/* ---- Audit Log section ---- */}
                <div className="bg-white rounded border border-gray-200 p-4">
                  <div className="text-xs font-bold mb-2">Audit Log</div>
                  {auditLog.length === 0 ? (
                    <div className="text-xs text-gray-400">No changes recorded yet.</div>
                  ) : (
                    <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                      {auditLog.map((entry, i) => (
                        <div key={i} className="text-[11px] text-gray-600">
                          <span className="text-gray-400">
                            {new Date(entry.changed_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}
                          </span>
                          {' — '}
                          <span className="font-medium">{entry.changed_by}</span>
                          {' changed '}
                          <span className="font-medium">{entry.field_name}</span>
                          <div className="ml-4 text-[10px]">
                            <span className="text-red-500 line-through">{entry.old_value || '(empty)'}</span>
                            {' → '}
                            <span className="text-green-600">{entry.new_value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
