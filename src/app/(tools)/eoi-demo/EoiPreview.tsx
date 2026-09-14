'use client';

import { EoiTerms, TYPE_LABELS, PropertyType, AuState, NOTES_FOOTER_HTML } from './templates';

export interface Purchaser {
  name: string;
  email: string;
  phone: string;
  address: string;
}

export interface EoiData {
  propertyAddress: string;
  offerPrice: string;
  state: AuState;
  type: PropertyType;
  purchasers: Purchaser[];
  contractEntity: string;
  agentName: string;
  agentEmail: string;
  agentPhone: string;
  agencyName: string;
  solicitorName: string;
  solicitorEmail: string;
  solicitorPhone: string;
  brokerName: string;
  brokerEmail: string;
  brokerPhone: string;
  consultantName: string;
  terms: EoiTerms;
}

const BRAND = '#0b2e4f';
const ROW_DARK = '#f1f5f9';
const ROW_LIGHT = '#ffffff';

function Row({
  label,
  children,
  dark,
  top,
}: {
  label: string;
  children: React.ReactNode;
  dark?: boolean;
  top?: boolean;
}) {
  return (
    <tr>
      <td
        style={{
          width: '17.5%',
          background: BRAND,
          color: '#fff',
          fontSize: 11,
          fontWeight: 600,
          padding: '6px 10px',
          verticalAlign: top ? 'top' : 'middle',
          borderBottom: '1px solid #fff',
        }}
      >
        {label}
      </td>
      <td
        style={{
          background: dark ? ROW_DARK : ROW_LIGHT,
          fontSize: 11,
          padding: '6px 10px 6px 14px',
          color: '#111',
          verticalAlign: 'top',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {children}
      </td>
    </tr>
  );
}

export default function EoiPreview({ data }: { data: EoiData }) {
  const { terms } = data;
  const purchasers = data.purchasers.filter((p) => p.name.trim());

  return (
    <div style={{ background: '#fff', padding: 16, borderRadius: 6 }}>
      <div
        style={{
          background: BRAND,
          color: '#fff',
          padding: '12px 14px',
          borderRadius: '4px 4px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: 0.5 }}>
          EXPRESSION OF INTEREST
        </div>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.6)',
            borderRadius: 3,
            padding: '2px 8px',
          }}
        >
          {data.state} · {TYPE_LABELS[data.type]}
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <tbody>
          <Row label="Property" dark>
            <strong>{data.propertyAddress || '—'}</strong>
          </Row>
          <Row label="Offer Price">
            <strong>{data.offerPrice || '—'}</strong>
          </Row>
          <Row label="Purchaser(s)" dark top>
            {purchasers.length === 0 ? (
              '—'
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {purchasers.map((p, i) => (
                  <div key={i}>
                    <strong>{p.name}</strong>
                    {p.email ? ` · ${p.email}` : ''}
                    {p.phone ? ` · ${p.phone}` : ''}
                    {p.address ? (
                      <div style={{ color: '#475569' }}>{p.address}</div>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </Row>
          {data.contractEntity && <Row label="Contract Entity">{data.contractEntity}</Row>}
          <Row label="Deposit" dark>
            {terms.deposit_amount}
          </Row>
          <Row label="Deposit Payable">{terms.deposit_payable}</Row>
          <Row label="Finance" dark>
            {terms.finance}
          </Row>
          <Row label="Building &amp; Pest">{terms.building_pest}</Row>
          <Row label="Commission" dark>
            {terms.commission}
          </Row>
          <Row label="Settlement">{terms.settlement}</Row>
          <Row label="Special Conditions" dark top>
            <ul style={{ margin: '4px 0', paddingLeft: 18 }}>
              {terms.special_conditions.map((c, i) => (
                <li key={i} style={{ marginBottom: 4, lineHeight: 1.45 }}>
                  {c}
                </li>
              ))}
            </ul>
          </Row>
          <Row label="Legals" top>
            {data.solicitorName ? (
              <>
                {data.solicitorName}
                {data.solicitorEmail ? ` · ${data.solicitorEmail}` : ''}
                {data.solicitorPhone ? ` · ${data.solicitorPhone}` : ''}
              </>
            ) : (
              'TBC'
            )}
          </Row>
          <Row label="Finance Broker" dark top>
            {data.brokerName ? (
              <>
                {data.brokerName}
                {data.brokerEmail ? ` · ${data.brokerEmail}` : ''}
                {data.brokerPhone ? ` · ${data.brokerPhone}` : ''}
              </>
            ) : (
              'TBC'
            )}
          </Row>
          <Row label="Notes" top>
            <div dangerouslySetInnerHTML={{ __html: NOTES_FOOTER_HTML }} />
          </Row>
        </tbody>
      </table>

      <div
        style={{
          fontSize: 10,
          color: '#475569',
          padding: '10px 12px',
          background: ROW_DARK,
          borderRadius: '0 0 4px 4px',
        }}
      >
        Submitted by {data.consultantName || 'Buyers Club'} · Buyers Club ·
        property@buyersclub.com.au
      </div>
    </div>
  );
}
