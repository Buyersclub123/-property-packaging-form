// EoiEmailTemplate — pure email renderer.
// Produces inline-styled HTML-table email compatible with all major email clients.
// Used by both the preview endpoint and the send route via renderToStaticMarkup.
//
// No 'use client' — works in both client rendering and server-side
// renderToStaticMarkup. Hooks are intentionally avoided so it can
// be used in either context without issues.

import React from 'react';
import type { EoiEmailData, EoiPurchaser } from '@/lib/eoi-email';

// Re-export the types so other modules can import from here if needed
export type { EoiEmailData, EoiPurchaser };

// ---- Constants (matching eoi-email.ts exactly) --------------------------------

const CHARCOAL = '#4D4D4D';
const CHARCOAL_DARK = '#2A2A2A';
const YELLOW = '#FBD721';
const ROW_GREY = '#E0E0E0';
const TEXT = '#111111';
const FONT = "Calibri,'Segoe UI',Arial,sans-serif";
const FONT_SIZE = '13px';
const LOGO_URL = 'https://property-packaging-form.vercel.app/logo.jpg';

// ---- HTML escape (for dangerouslySetInnerHTML) --------------------------------

function esc(s: string): string {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ---- Shared inline styles ---------------------------------------------------

const labelSty: React.CSSProperties = {
  background: ROW_GREY, textAlign: 'right', width: 140, fontWeight: 700,
  padding: '6px 10px', verticalAlign: 'top', borderBottom: '1px solid #bbb',
  fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT,
};

const valueSty: React.CSSProperties = {
  background: '#fff', padding: '6px 10px', verticalAlign: 'top',
  borderBottom: '1px solid #ddd', fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT,
};

const subLabelSty: React.CSSProperties = {
  background: ROW_GREY, textAlign: 'right', width: 100, fontWeight: 700,
  padding: '6px 10px', fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT,
};

const subValueSty: React.CSSProperties = {
  background: '#fff', padding: '6px 10px',
  fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT,
  wordWrap: 'break-word',
};

const sectionHeadSty: React.CSSProperties = {
  background: CHARCOAL, color: YELLOW, textAlign: 'center', fontWeight: 600,
  letterSpacing: 1, padding: '8px 10px', fontSize: FONT_SIZE, fontFamily: FONT,
};

// ---- Props ------------------------------------------------------------------

interface EoiEmailTemplateProps {
  data: EoiEmailData;
  /** @deprecated No longer used — component always renders read-only */
  editable?: boolean;
}

// ---- Component --------------------------------------------------------------

export function EoiEmailTemplate({ data }: EoiEmailTemplateProps) {
  const isHL = data.propertyType === 'house_and_land' || data.propertyType === 'hl_split';
  const isEstablished = data.propertyType === 'established';

  // ---- Notes HTML ----
  const rawNotes = data.notes || '';
  const notesHtml = esc(rawNotes)
    .replace(/CONTRACTS@BUYERSCLUB\.COM\.AU/g, '<a href="mailto:contracts@buyersclub.com.au" style="color:#188bf6">CONTRACTS@BUYERSCLUB.COM.AU</a>')
    .replace(/\n/g, '<br/>');

  // ---- Conditions (B2 fix: strip prefixes then filter, no double filter) ----
  const processedConditions = data.specialConditions
    .map(c => c.replace(/^[\s]*[-\u2013\u2014\u2022]\s*/, '').trim())
    .filter(c => c.length > 0);

  // ---- Purchasers ----
  const displayPurchasers = data.purchasers.filter(p => p.name?.trim());
  const pairCount = Math.ceil(displayPurchasers.length / 2);

  // ---- LVR display ----
  const lvrDisplay = data.lvr ? (data.lvr.includes('%') ? data.lvr : `${data.lvr}%`) : '';

  return (
    <>
      <div style={{ maxWidth: 720, margin: '0 auto', background: '#fff', overflow: 'hidden', border: '1px solid #ccc' }}>

        {/* ======== HEADER ======== */}
        <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `3px solid ${YELLOW}` }}>
          <tbody><tr>
            <td style={{ padding: '14px 16px', verticalAlign: 'middle', width: 120 }}>
              <img src={LOGO_URL} alt="Buyers Club" style={{ height: 50, width: 'auto' }} />
            </td>
            <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: CHARCOAL_DARK, letterSpacing: '-0.5px', fontFamily: FONT }}>
                Expression of Interest
              </span>
            </td>
            <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
              <span style={{ background: CHARCOAL_DARK, color: YELLOW, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, fontFamily: FONT }}>
                {data.state.toUpperCase()}
              </span>
              {'\u00a0'}
              <span style={{ background: YELLOW, color: CHARCOAL_DARK, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, fontFamily: FONT }}>
                {data.propertyTypeLabel}
              </span>
            </td>
          </tr></tbody>
        </table>

        {/* ======== BODY ======== */}
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>

            {/* ============ SPECULATIVE BANNER ============ */}
            {data.speculativeMessage && (
              <tr>
                <td colSpan={4} style={{ padding: '10px 14px', fontSize: '18px', color: '#1e40af', fontWeight: 600, textAlign: 'center', background: '#eff6ff', borderBottom: `2px solid ${YELLOW}`, fontFamily: FONT, fontStyle: 'italic' }}>
                  <span dangerouslySetInnerHTML={{ __html: esc(data.speculativeMessage).replace(/\n/g, '<br/>') }} />
                </td>
              </tr>
            )}

            {/* ============ PROPERTY ============ */}
            <tr><td colSpan={4} style={sectionHeadSty}>PROPERTY</td></tr>

            {/* Property Address */}
            <tr>
              <td style={labelSty}>Property Address</td>
              <td colSpan={3} style={valueSty}>
                <strong>{data.propertyAddress || '\u2014'}</strong>
              </td>
            </tr>

            {/* Notes */}
            <tr>
              <td style={{ ...labelSty, verticalAlign: 'top' }}>Notes</td>
              <td colSpan={3} style={{ ...valueSty, verticalAlign: 'top' }}>
                <span dangerouslySetInnerHTML={{ __html: notesHtml }} />
              </td>
            </tr>

            {/* Warning — hidden for speculative EOIs (no client details to protect) */}
            {!data.speculativeMessage && (
              <tr>
                <td colSpan={4} style={{ padding: '6px 10px', fontSize: FONT_SIZE, color: '#b91c1c', fontWeight: 600, textAlign: 'center', borderBottom: '1px solid #ddd', fontFamily: FONT }}>
                  Please do not send the contract directly to the purchaser
                </td>
              </tr>
            )}

            {/* ============ TERMS ============ */}
            <tr><td colSpan={4} style={sectionHeadSty}>TERMS</td></tr>

            {/* ---- Price ---- */}
            {isHL && (data.landPrice || data.buildPrice) ? (
              /* H&L price: Land / Build / Total */
              <tr>
                <td style={labelSty}>Price</td>
                <td colSpan={3} style={valueSty}>
                  {data.landPrice && <>Land: <strong>{data.landPrice}</strong><br /></>}
                  {data.buildPrice && <>Build: <strong>{data.buildPrice}</strong><br /></>}
                  {data.totalPrice && <>Total: <strong>{data.totalPrice}</strong></>}
                </td>
              </tr>
            ) : (
              /* Single price (established / new_single / H&L fallback) */
              <tr>
                <td style={labelSty}>Price</td>
                <td colSpan={3} style={valueSty}>
                  <strong>{data.offerPrice || '\u2014'}</strong>
                </td>
              </tr>
            )}

            {/* ---- Deposit ---- */}
            {isHL ? (
              /* H&L: Land Amount / Build Amount sub-rows */
              <>
                <tr>
                  <td style={{ ...labelSty, verticalAlign: 'middle' }} rowSpan={2}>Deposit</td>
                  <td colSpan={3} style={{ padding: 0, borderBottom: '1px solid #ddd' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td style={subLabelSty}>Land Amount:</td>
                      <td style={subValueSty}>{data.landDeposit || '\u2014'}</td>
                    </tr></tbody></table>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ padding: 0, borderBottom: '1px solid #ddd' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td style={subLabelSty}>Build Amount:</td>
                      <td style={subValueSty}>{data.buildDeposit || '\u2014'}</td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </>
            ) : (
              /* Established / New: Amount / Payable sub-rows */
              <>
                <tr>
                  <td style={{ ...labelSty, verticalAlign: 'middle' }} rowSpan={2}>Deposit</td>
                  <td colSpan={3} style={{ padding: 0, borderBottom: '1px solid #ddd' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td style={subLabelSty}>Amount:</td>
                      <td style={subValueSty}>{data.depositAmount || '\u2014'}</td>
                    </tr></tbody></table>
                  </td>
                </tr>
                <tr>
                  <td colSpan={3} style={{ padding: 0, borderBottom: '1px solid #ddd' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}><tbody><tr>
                      <td style={subLabelSty}>Payable:</td>
                      <td style={subValueSty}>{data.depositPayable || '\u2014'}</td>
                    </tr></tbody></table>
                  </td>
                </tr>
              </>
            )}

            {/* Finance */}
            {data.finance && data.finance !== '\u2014' && (
              <tr>
                <td style={labelSty}>Finance</td>
                <td colSpan={3} style={valueSty}>{data.finance}</td>
              </tr>
            )}

            {/* Building & Pest (established) / PCI (new builds) */}
            {isEstablished ? (
              data.buildingPest && data.buildingPest !== '\u2014' ? (
                <tr>
                  <td style={labelSty}>Building &amp; Pest</td>
                  <td colSpan={3} style={valueSty}>{data.buildingPest}</td>
                </tr>
              ) : null
            ) : (
              data.pci && data.pci !== '\u2014' ? (
                <tr>
                  <td style={labelSty}>PCI</td>
                  <td colSpan={3} style={valueSty}>{data.pci}</td>
                </tr>
              ) : null
            )}

            {/* Commission (H&L only) */}
            {isHL && data.commission && data.commission !== '\u2014' && (
              <tr>
                <td style={labelSty}>Commission</td>
                <td colSpan={3} style={valueSty}>{data.commission}</td>
              </tr>
            )}

            {/* Special Conditions */}
            {processedConditions.length > 0 && (
              <tr>
                <td style={{ ...labelSty, verticalAlign: 'top' }}>Special Conditions</td>
                <td colSpan={3} style={{ ...valueSty, verticalAlign: 'top' }}>
                  <span style={{ lineHeight: '1.6' }}>
                    {processedConditions.map((c, i) => (
                      <React.Fragment key={i}>
                        {i > 0 && <br />}
                        {`\u2022 ${c}`}
                      </React.Fragment>
                    ))}
                  </span>
                </td>
              </tr>
            )}

            {/* Settlement */}
            {data.settlement && data.settlement !== '\u2014' && (
              <tr>
                <td style={labelSty}>Settlement</td>
                <td colSpan={3} style={valueSty}>{data.settlement}</td>
              </tr>
            )}

            {/* ============ PURCHASER/S ============ */}
            <tr><td colSpan={4} style={sectionHeadSty}>PURCHASER/S</td></tr>

            {/* Contract Entity */}
            {data.contractEntity && (
              <tr>
                <td style={labelSty}>Contract Entity</td>
                <td colSpan={3} style={valueSty}>{data.contractEntity}</td>
              </tr>
            )}

            {/* Purchaser pairs */}
            {displayPurchasers.length > 0 && Array.from({ length: pairCount }, (_, rowIdx) => {
              const pair = displayPurchasers.slice(rowIdx * 2, rowIdx * 2 + 2);
              return (
                <React.Fragment key={`p-pair-${rowIdx}`}>
                  {/* Purchaser column headers */}
                  <tr>
                    <td style={{ background: CHARCOAL, width: 140, padding: '4px 10px', borderBottom: '1px solid #fff', fontFamily: FONT }}>{'\u00a0'}</td>
                    <td colSpan={3} style={{ padding: 0, borderBottom: '1px solid #fff' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}><tbody><tr>
                        {pair.map((_, i) => {
                          const pi = rowIdx * 2 + i;
                          return (
                            <td key={pi} style={{
                              background: CHARCOAL, color: YELLOW, textAlign: 'center', fontWeight: 600,
                              fontSize: FONT_SIZE, padding: '4px 10px', fontFamily: FONT,
                              width: pair.length === 1 ? '100%' : '50%',
                              ...(i > 0 ? { borderLeft: '1px solid #666' } : {}),
                            }}>
                              Purchaser {pi + 1}
                            </td>
                          );
                        })}
                      </tr></tbody></table>
                    </td>
                  </tr>

                  {/* Purchaser data rows: Name, Email, Phone, Address */}
                  {(['Name', 'Email', 'Phone', 'Address'] as const).map((label) => {
                    const field = label.toLowerCase() as keyof EoiPurchaser;
                    const pLabelSty: React.CSSProperties = {
                      background: ROW_GREY, textAlign: 'right', width: 140, fontWeight: 700,
                      padding: '5px 10px', borderBottom: '1px solid #bbb',
                      fontSize: FONT_SIZE, fontFamily: FONT,
                    };
                    return (
                      <tr key={`${rowIdx}-${label}`}>
                        <td style={pLabelSty}>{label}</td>
                        <td colSpan={3} style={{ padding: 0, borderBottom: '1px solid #ddd' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}><tbody><tr>
                            {pair.map((p, i) => {
                              const pi = rowIdx * 2 + i;
                              return (
                                <td key={pi} style={{
                                  background: '#fff', padding: '5px 10px',
                                  fontSize: FONT_SIZE, fontFamily: FONT,
                                  ...(field === 'name' ? { fontWeight: 600 } : {}),
                                  width: pair.length === 1 ? '100%' : '50%',
                                  ...(i > 0 ? { borderLeft: '1px solid #ddd' } : {}),
                                }}>
                                  {p[field] || '\u2014'}
                                </td>
                              );
                            })}
                          </tr></tbody></table>
                        </td>
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}

            {/* ============ LEGALS ============ */}
            <tr><td colSpan={4} style={sectionHeadSty}>LEGALS</td></tr>

            {data.solicitorName || data.solicitorCompany ? (
              <>
                <tr>
                  <td style={labelSty}>Company</td>
                  <td colSpan={3} style={valueSty}>{data.solicitorCompany || '\u2014'}</td>
                </tr>
                <tr>
                  <td style={labelSty}>Contact</td>
                  <td colSpan={3} style={valueSty}>{data.solicitorName || '\u2014'}</td>
                </tr>
                <tr>
                  <td style={labelSty}>Phone</td>
                  <td colSpan={3} style={valueSty}>{data.solicitorPhone || '\u2014'}</td>
                </tr>
                <tr>
                  <td style={labelSty}>Email</td>
                  <td colSpan={3} style={valueSty}>{data.solicitorEmail || '\u2014'}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td style={labelSty}>Solicitor</td>
                <td colSpan={3} style={valueSty}>TBC</td>
              </tr>
            )}

            {/* ============ FINANCE ============ */}
            <tr><td colSpan={4} style={sectionHeadSty}>FINANCE</td></tr>

            {data.brokerName || data.brokerCompany ? (
              <>
                <tr>
                  <td style={labelSty}>Company</td>
                  <td colSpan={3} style={valueSty}>{data.brokerCompany || '\u2014'}</td>
                </tr>
                <tr>
                  <td style={labelSty}>Contact</td>
                  <td colSpan={3} style={valueSty}>{data.brokerName || '\u2014'}</td>
                </tr>
                <tr>
                  <td style={labelSty}>Phone</td>
                  <td colSpan={3} style={valueSty}>{data.brokerPhone || '\u2014'}</td>
                </tr>
                <tr>
                  <td style={labelSty}>Email</td>
                  <td colSpan={3} style={valueSty}>{data.brokerEmail || '\u2014'}</td>
                </tr>
              </>
            ) : (
              <tr>
                <td style={labelSty}>Broker</td>
                <td colSpan={3} style={valueSty}>TBC</td>
              </tr>
            )}

            {/* LVR */}
            {data.lvr && (
              <tr>
                <td style={labelSty}>LVR</td>
                <td colSpan={3} style={valueSty}>{lvrDisplay}</td>
              </tr>
            )}

          </tbody>
        </table>

        {/* Footer removed — no value, risk of displaying wrong data */}

      </div>
    </>
  );
}
