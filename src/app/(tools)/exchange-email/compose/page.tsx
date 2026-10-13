'use client';

// Exchange Email composer — PROOF OF CONCEPT.
// Opened from the Contract Team Reporting Tool via /exchange-email/compose?oppId=<opportunity id>.
// Left: every dynamic value with its data source (for review). Right: rendered email.
// Sends via Gmail as the logged-in user. No DB logging, no GHL write-back.

import React, { useEffect, useMemo, useState } from 'react';
import { getUserEmail, saveUserEmail, validateUserEmail } from '@/lib/userAuth';
import { buildExchangeEmailData, renderExchangeSubject } from '@/lib/exchange-email';
import type { ExchangeEmailData, ExchangeFieldSource, ExchangeSource, LastEoiPayload } from '@/lib/exchange-email';

const SOURCE_COLOURS: Record<ExchangeSource, string> = {
  Opportunity: '#2563eb',
  'Property Review': '#16a34a',
  'Last EOI': '#9333ea',
  Static: '#6b7280',
  TBD: '#b45309',
};

export default function ExchangeEmailComposePage() {
  const [authEmail, setAuthEmail] = useState('');
  const [userEmailInput, setUserEmailInput] = useState('');
  const [oppId, setOppId] = useState('');

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [row, setRow] = useState<Record<string, string> | null>(null);
  const [lastEoi, setLastEoi] = useState<LastEoiPayload | null>(null);
  const [lastEoiNote, setLastEoiNote] = useState('');

  const [previewHtml, setPreviewHtml] = useState('');
  const [extraRecipients, setExtraRecipients] = useState('');
  const [writeBack, setWriteBack] = useState<Record<string, boolean>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSending, setReviewSending] = useState(false);
  const [reviewResult, setReviewResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<{ ok: boolean; message: string } | null>(null);

  // ---- auth -----------------------------------------------------------------
  useEffect(() => {
    const saved = getUserEmail();
    if (saved) setAuthEmail(saved);
    const p = new URLSearchParams(window.location.search);
    setOppId(p.get('oppId') || '');
  }, []);

  function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    const v = validateUserEmail(userEmailInput);
    if (v.isValid && v.email) { saveUserEmail(v.email); setAuthEmail(v.email); }
    else alert(v.error || 'Invalid email');
  }

  // ---- load the CTRT row for this opportunity --------------------------------
  useEffect(() => {
    if (!authEmail || !oppId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError('');
      try {
        const res = await fetch(`/api/contract-team-reporting?_t=${Date.now()}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`Report fetch failed (HTTP ${res.status})`);
        const records = (await res.json()) as Record<string, string>[];
        const found = records.find((r) => r.id === oppId);
        if (!found) throw new Error(`Opportunity ${oppId} was not found in the Contract Team Reporting data (it may be closed or outside the 4 reported pipelines).`);
        if (cancelled) return;
        setRow(found);

        if (found.co_record_id) {
          const eoiRes = await fetch(`/api/eoi/last-send?recordId=${encodeURIComponent(found.co_record_id)}&_t=${Date.now()}`, { cache: 'no-store' });
          if (eoiRes.ok) {
            const d = await eoiRes.json();
            if (!cancelled) { setLastEoi((d.payload || {}) as LastEoiPayload); setLastEoiNote(`Last EOI sent ${new Date(d.sentAt).toLocaleString('en-AU')} (${d.eventType})`); }
          } else if (eoiRes.status === 404) {
            if (!cancelled) setLastEoiNote('No sent EOI found for the linked Property Review record.');
          } else {
            if (!cancelled) setLastEoiNote(`Could not load last EOI (HTTP ${eoiRes.status}).`);
          }
        } else {
          setLastEoiNote('No linked Property Review record — EOI deposit cannot be looked up.');
        }
      } catch (err) {
        if (!cancelled) setLoadError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [authEmail, oppId]);

  // ---- build data + sources ---------------------------------------------------
  const built = useMemo(() => (row ? buildExchangeEmailData(row, lastEoi) : null), [row, lastEoi]);
  const emailData: ExchangeEmailData | null = built?.data ?? null;
  const sources: ExchangeFieldSource[] = built?.sources ?? [];

  // ---- preview ----------------------------------------------------------------
  useEffect(() => {
    if (!emailData) return;
    let cancelled = false;
    fetch('/api/exchange-email/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emailData }),
    })
      .then((r) => (r.ok ? r.text() : Promise.reject(new Error(`Preview failed (HTTP ${r.status})`))))
      .then((html) => { if (!cancelled) setPreviewHtml(html); })
      .catch((err) => { if (!cancelled) setPreviewHtml(`<p style="color:#b91c1c;padding:16px">${err.message}</p>`); });
    return () => { cancelled = true; };
  }, [emailData]);

  const recipients = useMemo(() => {
    const extras = extraRecipients.split(/[,;\s]+/).map((e) => e.trim()).filter((e) => e.includes('@'));
    return Array.from(new Set([authEmail, ...extras].filter(Boolean)));
  }, [authEmail, extraRecipients]);

  async function handleSend() {
    if (!emailData) return;
    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch('/api/exchange-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentBy: authEmail, to: recipients, emailData }),
      });
      const d = await res.json();
      if (res.ok && d.status === 'sent') setSendResult({ ok: true, message: `Sent to ${d.to.join(', ')}` });
      else setSendResult({ ok: false, message: d.error || `Send failed (HTTP ${res.status})` });
    } catch (err) {
      setSendResult({ ok: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setSending(false);
    }
  }

  async function handleSendReview() {
    if (!row) return;
    setReviewSending(true);
    setReviewResult(null);
    try {
      const res = await fetch('/api/exchange-email/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentBy: authEmail,
          oppId,
          oppName: row.name || '',
          address: row.co_property_address || row.registeredAddress || '',
          notes: reviewNotes,
          items: sources.map((s) => ({
            section: s.section, label: s.label, value: s.value, source: s.source, from: s.from,
            writeBack: !!writeBack[s.key], comment: comments[s.key] || '',
          })),
        }),
      });
      const d = await res.json();
      if (res.ok && d.status === 'sent') setReviewResult({ ok: true, message: `Review sent to ${d.to}${d.cc?.length ? ` (cc ${d.cc.join(', ')})` : ''}` });
      else setReviewResult({ ok: false, message: d.error || `Send failed (HTTP ${res.status})` });
    } catch (err) {
      setReviewResult({ ok: false, message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      setReviewSending(false);
    }
  }

  // ---- auth gate ---------------------------------------------------------------
  if (!authEmail) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', background: '#f3f4f6', fontFamily: 'Calibri, Segoe UI, Arial, sans-serif' }}>
        <form onSubmit={handleAuth} style={{ background: '#fff', padding: 32, borderRadius: 6, maxWidth: 380, width: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Exchange Email (POC)</h2>
          <p style={{ fontSize: 12, color: '#6b7280', marginBottom: 16 }}>Enter your @buyersclub.com.au email to continue</p>
          <input type="email" value={userEmailInput} onChange={(e) => setUserEmailInput(e.target.value)} placeholder="your.name@buyersclub.com.au"
            style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '8px 12px', fontSize: 14, marginBottom: 12 }} />
          <button type="submit" style={{ width: '100%', background: '#FBD721', border: 'none', borderRadius: 4, padding: '10px 12px', fontSize: 14, fontWeight: 700, cursor: 'pointer' }}>
            Continue
          </button>
        </form>
      </div>
    );
  }

  if (!oppId) {
    return <div style={{ textAlign: 'center', paddingTop: 120, color: '#6b7280' }}>No oppId provided. Open this from the Contract Team Reporting Tool.</div>;
  }

  const sections = Array.from(new Set(sources.map((s) => s.section)));

  return (
    <div style={{ fontFamily: 'Calibri, Segoe UI, Arial, sans-serif', background: '#f3f4f6', minHeight: '100vh', color: '#111' }}>
      <style>{`@media print { .no-print { display: none !important; } .print-full { width: 100% !important; } }`}</style>

      {/* Top bar */}
      <div className="no-print" style={{ background: '#2A2A2A', color: '#fff', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Exchange Email <span style={{ background: '#FBD721', color: '#2A2A2A', fontSize: 10, padding: '2px 6px', borderRadius: 2, marginLeft: 6, letterSpacing: 1 }}>POC</span></span>
        <span style={{ fontSize: 12, color: '#d1d5db' }}>{row?.name || ''}{row?.co_property_address ? ` — ${row.co_property_address}` : ''}</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#d1d5db' }}>Sending as <strong style={{ color: '#fff' }}>{authEmail}</strong></span>
      </div>

      {loading && <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Loading opportunity data…</div>}
      {loadError && <div style={{ margin: 16, padding: 12, background: '#fee2e2', border: '1px solid #fca5a5', color: '#991b1b', borderRadius: 4 }}>{loadError}</div>}

      {row && emailData && (
        <div style={{ display: 'flex', gap: 16, padding: 16, alignItems: 'flex-start' }}>
          {/* ---------- LEFT: data sources ---------- */}
          <div className="no-print" style={{ width: 440, flexShrink: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, fontSize: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Data sources</h3>
              <button
                onClick={() => {
                  if (!previewHtml) return;
                  const w = window.open('', '_blank');
                  if (!w) return;
                  w.document.open();
                  w.document.write(previewHtml.replace('</body>', '<script>window.onload=function(){window.print();}</script></body>'));
                  w.document.close();
                }}
                disabled={!previewHtml}
                style={{ marginLeft: 'auto', fontSize: 11, padding: '3px 8px', border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
              >
                Print email
              </button>
            </div>
            <p style={{ color: '#6b7280', margin: '0 0 8px 0' }}>
              Review each value and where it comes from. Tick &quot;Write back&quot; and add comments, then use &quot;Send review to JT&quot; at the bottom — the ticks do not change anything in the POC.
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {(Object.keys(SOURCE_COLOURS) as ExchangeSource[]).map((s) => (
                <span key={s} style={{ fontSize: 10, color: '#fff', background: SOURCE_COLOURS[s], padding: '1px 6px', borderRadius: 10 }}>{s}</span>
              ))}
            </div>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 10 }}>{lastEoiNote}</div>

            <div style={{ padding: 8, background: '#fffbe6', border: '1px solid #fde68a', borderRadius: 4, marginBottom: 10 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>What is the &quot;Write back&quot; tick for?</div>
              <div style={{ color: '#4b5563', fontSize: 11 }}>
                Please tick the write back box if the functionality to write the data back to GHL is desirable. Use the Comments box for any comments or feedback on each field.
              </div>
            </div>

            {sections.map((section) => (
              <div key={section} style={{ marginBottom: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5, color: '#4D4D4D', borderBottom: '1px solid #e5e7eb', padding: '4px 0', marginBottom: 4 }}>{section}</div>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {sources.filter((s) => s.section === section).map((s) => (
                      <tr key={s.key} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '3px 4px', width: 110, fontWeight: 600, verticalAlign: 'top' }}>{s.label}</td>
                        <td style={{ padding: '3px 4px', verticalAlign: 'top' }}>
                          <div style={{ color: s.value ? '#111' : '#9ca3af' }}>{s.value || (s.source === 'TBD' ? 'placeholder' : 'N/A')}</div>
                          <div style={{ fontSize: 10, color: '#6b7280' }}>
                            <span style={{ color: '#fff', background: SOURCE_COLOURS[s.source], padding: '0 5px', borderRadius: 8, marginRight: 4 }}>{s.source}</span>
                            {s.from}
                          </div>
                          <textarea
                            value={comments[s.key] || ''}
                            rows={1}
                            onChange={(e) => {
                              setComments((p) => ({ ...p, [s.key]: e.target.value }));
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            placeholder="Comment for review…"
                            style={{ width: '100%', marginTop: 3, border: '1px solid #e5e7eb', borderRadius: 3, padding: '2px 5px', fontSize: 11, resize: 'none', overflow: 'hidden', lineHeight: 1.4, background: comments[s.key] ? '#fffbe6' : '#fff' }}
                          />
                        </td>
                        <td style={{ padding: '3px 4px', width: 60, textAlign: 'center', verticalAlign: 'top' }} title="Write back to GHL? (visual only)">
                          {section !== 'Rental Assessment' && s.key !== 'propertyAddress' && (
                            <>
                              <label style={{ fontSize: 9, color: '#6b7280', display: 'block' }}>Write back</label>
                              <input type="checkbox" checked={!!writeBack[s.key]} onChange={(e) => setWriteBack((p) => ({ ...p, [s.key]: e.target.checked }))} />
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

            <div style={{ marginTop: 6, padding: 8, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Static text (part of the template)</div>
              <div style={{ color: '#6b7280', fontSize: 11 }}>Shayur Sumer, Fathima Rahim, Duo Insurance details, the &quot;REMOVE IF LUKES CLIENT&quot; note and all body sentences are hard-coded from the current manual template.</div>
            </div>

            <div style={{ marginTop: 10, padding: 8, border: '1px solid #e5e7eb', borderRadius: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>General review notes</div>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                rows={4}
                placeholder="Anything about the template, wording, missing fields, process…"
                style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 12, resize: 'vertical' }}
              />
              <button onClick={handleSendReview} disabled={reviewSending}
                style={{ marginTop: 6, width: '100%', background: '#2A2A2A', color: '#FBD721', border: 'none', borderRadius: 4, padding: '8px 12px', fontWeight: 700, cursor: reviewSending ? 'wait' : 'pointer', opacity: reviewSending ? 0.6 : 1 }}>
                {reviewSending ? 'Sending review…' : 'Send review to JT'}
              </button>
              <div style={{ fontSize: 10, color: '#6b7280', marginTop: 4 }}>Emails the write-back ticks, comments and notes for this opportunity to john.t@buyersclub.com.au (cc you), sent from your account.</div>
              {reviewResult && (
                <div style={{ marginTop: 6, padding: 6, borderRadius: 4, fontSize: 11, background: reviewResult.ok ? '#dcfce7' : '#fee2e2', color: reviewResult.ok ? '#166534' : '#991b1b' }}>
                  {reviewResult.message}
                </div>
              )}
            </div>
          </div>

          {/* ---------- RIGHT: recipients + preview ---------- */}
          <div className="print-full" style={{ flex: 1, minWidth: 0 }}>
            <div className="no-print" style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, padding: 12, marginBottom: 12, fontSize: 12 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Subject</div>
                  <div style={{ color: '#374151' }}>{renderExchangeSubject(emailData)}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap', marginTop: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>To</div>
                  <span style={{ background: '#e5e7eb', padding: '3px 8px', borderRadius: 10 }}>{authEmail}</span>
                </div>
                <div style={{ flex: 1, minWidth: 240 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>Additional recipients (comma separated)</div>
                  <input value={extraRecipients} onChange={(e) => setExtraRecipients(e.target.value)} placeholder="name@buyersclub.com.au, other@example.com"
                    style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 4, padding: '6px 8px', fontSize: 12 }} />
                </div>
                <button onClick={handleSend} disabled={sending || !previewHtml}
                  style={{ background: '#FBD721', border: 'none', borderRadius: 4, padding: '8px 16px', fontWeight: 700, cursor: sending ? 'wait' : 'pointer', opacity: sending ? 0.6 : 1 }}>
                  {sending ? 'Sending…' : `Send to ${recipients.length} recipient${recipients.length === 1 ? '' : 's'}`}
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#6b7280', marginTop: 6 }}>
                POC safety: the email is only delivered to the addresses above. Client, broker and solicitor addresses shown in the body are not used as recipients.
              </div>
              {sendResult && (
                <div style={{ marginTop: 8, padding: 8, borderRadius: 4, background: sendResult.ok ? '#dcfce7' : '#fee2e2', color: sendResult.ok ? '#166534' : '#991b1b', border: `1px solid ${sendResult.ok ? '#86efac' : '#fca5a5'}` }}>
                  {sendResult.message}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 6, overflow: 'hidden' }}>
              {previewHtml ? (
                <iframe title="Exchange email preview" srcDoc={previewHtml} style={{ width: '100%', height: 'calc(100vh - 220px)', minHeight: 700, border: 'none' }} />
              ) : (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Rendering preview…</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
