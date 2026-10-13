// ExchangeEmailTemplate — pure email renderer for the Exchange Email POC.
// Inline-styled HTML tables (email-client safe). No hooks, no 'use client',
// so it can be rendered with renderToStaticMarkup on the server.
//
// Wording is taken verbatim from the current manual Exchange email template.
// Values with no known data source render the PLACEHOLDER; values with a
// known source but no value render N/A.

import React from 'react';
import { ExchangeEmailData, NA, PLACEHOLDER } from '@/lib/exchange-email';

const CHARCOAL = '#4D4D4D';
const CHARCOAL_DARK = '#2A2A2A';
const YELLOW = '#FBD721';
const ROW_GREY = '#E0E0E0';
const TEXT = '#111111';
const FONT = "Calibri,'Segoe UI',Arial,sans-serif";
const FONT_SIZE = '13px';
const LOGO_URL = 'https://property-packaging-form.vercel.app/logo.jpg';

const labelSty: React.CSSProperties = {
  background: ROW_GREY, textAlign: 'left', width: 170, fontWeight: 700,
  padding: '6px 10px', verticalAlign: 'top', borderBottom: '1px solid #bbb',
  fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT,
};
const valueSty: React.CSSProperties = {
  background: '#fff', padding: '6px 10px', verticalAlign: 'top',
  borderBottom: '1px solid #ddd', fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT, lineHeight: 1.45,
};
const paraSty: React.CSSProperties = { margin: '0 0 8px 0' };
const headSty: React.CSSProperties = { fontWeight: 700, margin: '10px 0 2px 0' };

/** Yellow-highlighted placeholder / unknown-source marker */
function Ph({ text = PLACEHOLDER }: { text?: string }) {
  return <span style={{ background: '#fff3a0', padding: '0 3px' }}>{text}</span>;
}

/** Value with known source: shows N/A when empty */
function V({ v }: { v: string }) {
  return v ? <>{v}</> : <span style={{ color: '#888' }}>{NA}</span>;
}

/** Value that must be present for the sentence to make sense: value or placeholder */
function VP({ v }: { v: string }) {
  return v ? <>{v}</> : <Ph />;
}

function Mail({ email, label }: { email: string; label?: string }) {
  if (!email) return <Ph />;
  return <a href={`mailto:${email}`} style={{ color: '#188bf6' }}>{label || email}</a>;
}

function MultiMail({ emails }: { emails: string }) {
  const list = emails.split('&').map((e) => e.trim()).filter(Boolean);
  if (list.length === 0) return <span style={{ color: '#888' }}>{NA}</span>;
  return (
    <>
      {list.map((e, i) => (
        <React.Fragment key={e}>
          {i > 0 && ' & '}
          <a href={`mailto:${e}`} style={{ color: '#188bf6' }}>{e}</a>
        </React.Fragment>
      ))}
    </>
  );
}

export function ExchangeEmailTemplate({ data }: { data: ExchangeEmailData }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', background: '#fff', overflow: 'hidden', border: '1px solid #ccc' }}>
      {/* ======== HEADER ======== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: `3px solid ${YELLOW}` }}>
        <tbody><tr>
          <td style={{ padding: '14px 16px', verticalAlign: 'middle', width: 120 }}>
            <img src={LOGO_URL} alt="Buyers Club" style={{ height: 50, width: 'auto' }} />
          </td>
          <td style={{ padding: '14px 16px', verticalAlign: 'middle' }}>
            <span style={{ fontSize: 22, fontWeight: 700, color: CHARCOAL_DARK, letterSpacing: '-0.5px', fontFamily: FONT }}>
              Contract Exchanged
            </span>
            <br />
            <span style={{ fontSize: FONT_SIZE, color: CHARCOAL, fontFamily: FONT }}><VP v={data.propertyAddress} /></span>
          </td>
          <td style={{ padding: '14px 16px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
            <span style={{ background: CHARCOAL_DARK, color: YELLOW, padding: '4px 12px', fontSize: 11, fontWeight: 700, letterSpacing: 2, borderRadius: 2, fontFamily: FONT }}>
              POC
            </span>
          </td>
        </tr></tbody>
      </table>

      {/* ======== DEPOSIT DETAILS (free text above the table) ======== */}
      <div style={{ padding: '12px 16px', fontSize: FONT_SIZE, fontFamily: FONT, color: TEXT, lineHeight: 1.45 }}>
        <p style={{ ...paraSty, fontWeight: 700 }}>Deposit Details:</p>
        <p style={paraSty}>
          The deposit payable is <strong><VP v={data.depositPayable} /></strong> due <strong><Ph text="[deposit due date — source to be identified]" /></strong> as
          per contract to the selling agency&apos;s trust account below (please disregard if this has been paid already).
        </p>
        <p style={{ ...paraSty, background: '#fff3a0', padding: 6 }}>
          <strong>IF ATTACHED ON BOTTOM OF EMAIL: Trust Account Details:</strong> Please see trust account details at the bottom of this
          email for the deposit and provide proof of payment once paid. We recommend calling the selling agency&apos;s office to confirm
          these details over the phone prior to payment. <Ph text="[conditional block — trust account details: need to confirm source of this data]" />
        </p>
        <p style={{ ...paraSty, background: '#fff3a0', padding: 6 }}>
          <strong>IF UNSURE OF DEPOSIT</strong><br />
          <Mail email={data.solicitorEmail} label={data.solicitorName ? `@${data.solicitorName}` : undefined} /> we kindly request that you
          please instruct our client to arrange payment of the deposit as soon as possible and within the required timeframe under the
          contract. Timely payment of the deposit is important to ensure the transaction proceeds smoothly and to avoid any unnecessary
          complications. <Ph text="[conditional block — when to include: need to confirm source of this data]" />
        </p>
      </div>

      {/* ======== MAIN TABLE ======== */}
      <table style={{ width: '100%', borderCollapse: 'collapse', borderTop: `1px solid #bbb` }}>
        <tbody>
          <tr>
            <td style={labelSty}>Exchanged Property:</td>
            <td style={valueSty}><VP v={data.propertyAddress} /></td>
          </tr>

          <tr>
            <td style={labelSty}>Finance:</td>
            <td style={valueSty}>
              <p style={paraSty}>
                <Mail email={data.brokerEmail} label={data.brokerName ? `@${data.brokerName}` : undefined} /> Please proceed with
                finance due <strong><VP v={data.financeDueDate} /></strong>.
              </p>
              <p style={paraSty}>Your Finance broker will order a valuation and progress your file to achieve formal approval.</p>
            </td>
          </tr>

          <tr>
            <td style={labelSty}>Pest and build inspection:</td>
            <td style={valueSty}>
              <p style={paraSty}>
                <Ph text="[@Inspector — need to confirm source of this data]" /> Please proceed with pest and build inspection
                due <strong><VP v={data.bpDueDate} /></strong>.
              </p>
              <p style={paraSty}>
                Once your inspection has been completed our team will review the report that the inspector will send through they will
                then provide you with a written review attaching the report and advise on recommended next steps before satisfying the clause.
              </p>
            </td>
          </tr>

          <tr>
            <td style={labelSty}>Next Buyers Club Contacts &amp; Ongoing Updates</td>
            <td style={valueSty}>
              <p style={paraSty}>
                Contact <a href="mailto:shayur.s@buyersclub.com.au" style={{ color: '#188bf6' }}>@Shayur Sumer</a> from our post exchange
                team will organise the pest and building report, introduce you to a recommended property manager, in addition to providing
                a quote for building and landlord insurance.
              </p>
              <p style={paraSty}>
                Contact <a href="mailto:fathima.r@buyersclub.com.au" style={{ color: '#188bf6' }}>@Fathima Rahim</a> from our finance team
                will provide you with a weekly/fortnightly update on your finance application.
              </p>
            </td>
          </tr>

          <tr>
            <td style={labelSty}>Settlement:</td>
            <td style={valueSty}>
              <p style={paraSty}>
                Contact: <Mail email={data.solicitorEmail} label={data.solicitorName ? `@${data.solicitorName}` : undefined} />
              </p>
              <p style={paraSty}>
                Your Legal Team will manage the settlement of your property. They will instruct you for deposits, signatures and provide
                advice as required throughout this process.
              </p>
            </td>
          </tr>

          <tr>
            <td style={labelSty}>Property Management</td>
            <td style={valueSty}>
              <p style={paraSty}>Contact: {data.propertyManager ? `@${data.propertyManager}` : <Ph text="[@Property Manager — need to confirm source of this data]" />}</p>
              <p style={paraSty}>Your appointed Property Manager (PM) is a part of the Buyers Club qualified network.</p>
              <p style={paraSty}>Your PM will conduct a pre-settlement inspection and manage the tenancy and cash flow of your investment.</p>
            </td>
          </tr>

          <tr>
            <td style={labelSty}>Rental Assessment</td>
            <td style={valueSty}>
              Occupancy: <V v={data.occupancy} /><br />
              Current Rent: <V v={data.currentRent} /><br />
              Expiry: <V v={data.expiry} /><br />
              Current Yield: <V v={data.currentYield ? `~ ${data.currentYield}` : ''} /><br />
              Appraisal: <V v={data.appraisedRent} /><br />
              Appraised Yield: <V v={data.appraisedYield ? `~ ${data.appraisedYield}` : ''} />
            </td>
          </tr>

          <tr>
            <td style={labelSty}>Key Contacts:</td>
            <td style={valueSty}>
              <p style={headSty}>Agent Information:</p>
              Name: <V v={data.agentName} /><br />
              Phone: <V v={data.agentPhone} /><br />
              Email: {data.agentEmail ? <Mail email={data.agentEmail} /> : <span style={{ color: '#888' }}>{NA}</span>}

              <p style={headSty}>Client Information:</p>
              Names: <V v={data.clientNames} /><br />
              Phone: <V v={data.clientPhones} /><br />
              Email: <MultiMail emails={data.clientEmails} />

              <p style={headSty}>Broker Details:</p>
              N: <V v={data.brokerName} /><br />
              M: <V v={data.brokerPhone} /><br />
              E: {data.brokerEmail ? <Mail email={data.brokerEmail} /> : <span style={{ color: '#888' }}>{NA}</span>}

              <p style={headSty}>Accountant Details:</p>
              N: <V v={data.accountantName} /><br />
              M: <V v={data.accountantPhone} /><br />
              E: {data.accountantEmail ? <Mail email={data.accountantEmail} /> : <span style={{ color: '#888' }}>{NA}</span>}

              <p style={headSty}>Legal Contact Details:</p>
              Firm: <V v={data.solicitorCompany} /><br />
              Contact: <V v={data.solicitorName} /><br />
              Email: {data.solicitorEmail ? <Mail email={data.solicitorEmail} /> : <span style={{ color: '#888' }}>{NA}</span>}

              <p style={{ ...headSty, background: '#fff3a0', display: 'inline-block', padding: '0 3px' }}>(REMOVE IF LUKES CLIENT, ADD HIS CONTACT)</p><br />
              <strong>Insurance broker:</strong><br />
              DUO INSURANCE<br />
              P 1300 212 323<br />
              E <a href="mailto:cover@duoinsurance.com.au" style={{ color: '#188bf6' }}>@Duo Insurance</a>{' '}
              <a href="mailto:tuan@duotax.com.au" style={{ color: '#188bf6' }}>@Tuan Duong</a>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
