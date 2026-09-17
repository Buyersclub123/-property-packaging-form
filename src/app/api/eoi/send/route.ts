import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { getDb } from '@/lib/db';
import { renderEoiEmailHtml, renderEoiSubject, EoiEmailData } from '@/lib/eoi-email';

export const dynamic = 'force-dynamic';

const FROM_EMAIL = 'property@buyersclub.com.au';

/**
 * POST /api/eoi/send
 *
 * Sends an EOI email and records the send in eoi_sends.
 * Upserts agent/solicitor/broker contacts.
 *
 * Required body fields:
 *   recordId, propertyAddress, state, propertyType, offerPrice, sendType,
 *   agentEmail, sentBy, emailData (the full EoiEmailData)
 *
 * Optional: opportunityId, purchasers, agent/solicitor/broker details
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  interface AttachmentPayload {
    base64: string;
    mimeType: string;
    autoName: string;
    type: string;
    forLabel: string;
  }

  const {
    recordId,
    opportunityId,
    propertyAddress,
    sendType = 'initial',
    offerPrice,
    agentEmail,
    sentBy,
    initiatedBy,
    consultantEmail,
    emailData,
    renderedHtml: clientRenderedHtml,
    attachments,
  } = body as {
    recordId: string;
    opportunityId?: string;
    propertyAddress: string;
    sendType: 'initial' | 'increase' | 'revision';
    offerPrice: string;
    agentEmail: string;
    sentBy: string;
    initiatedBy?: string;
    consultantEmail?: string;
    emailData: EoiEmailData;
    renderedHtml?: string;
    attachments?: AttachmentPayload[];
  };

  if (!recordId || !agentEmail || !emailData) {
    return NextResponse.json(
      { error: 'recordId, agentEmail, and emailData are required' },
      { status: 400 }
    );
  }

  const sql = getDb();

  // ---- Upsert contacts (agent, solicitor, broker) -------------------------
  let agentContactId: number | null = null;

  if (emailData.agentEmail) {
    const existing = await sql`
      SELECT id FROM contacts WHERE type = 'agent' AND email = ${emailData.agentEmail} LIMIT 1`;
    if (existing.length > 0) {
      agentContactId = existing[0].id as number;
      await sql`
        UPDATE contacts SET
          name = ${emailData.agentName || null},
          company = ${emailData.agencyName || null},
          phone = ${emailData.agentPhone || null},
          last_used_at = NOW()
        WHERE id = ${agentContactId}`;
    } else {
      const inserted = await sql`
        INSERT INTO contacts (type, name, company, email, phone, last_used_at)
        VALUES ('agent', ${emailData.agentName || null}, ${emailData.agencyName || null}, ${emailData.agentEmail}, ${emailData.agentPhone || null}, NOW())
        RETURNING id`;
      agentContactId = inserted[0]?.id as number;
    }
  }

  // Solicitor
  if (emailData.solicitorEmail) {
    const existing = await sql`
      SELECT id FROM contacts WHERE type = 'solicitor' AND email = ${emailData.solicitorEmail} LIMIT 1`;
    if (existing.length > 0) {
      await sql`
        UPDATE contacts SET
          name = ${emailData.solicitorName || null},
          company = ${emailData.solicitorCompany || null},
          phone = ${emailData.solicitorPhone || null},
          last_used_at = NOW()
        WHERE id = ${existing[0].id as number}`;
    } else {
      await sql`
        INSERT INTO contacts (type, name, company, email, phone, last_used_at)
        VALUES ('solicitor', ${emailData.solicitorName || null}, ${emailData.solicitorCompany || null}, ${emailData.solicitorEmail}, ${emailData.solicitorPhone || null}, NOW())`;
    }
  }

  // Broker
  if (emailData.brokerEmail) {
    const existing = await sql`
      SELECT id FROM contacts WHERE type = 'broker' AND email = ${emailData.brokerEmail} LIMIT 1`;
    if (existing.length > 0) {
      await sql`
        UPDATE contacts SET
          name = ${emailData.brokerName || null},
          company = ${emailData.brokerCompany || null},
          phone = ${emailData.brokerPhone || null},
          last_used_at = NOW()
        WHERE id = ${existing[0].id as number}`;
    } else {
      await sql`
        INSERT INTO contacts (type, name, company, email, phone, last_used_at)
        VALUES ('broker', ${emailData.brokerName || null}, ${emailData.brokerCompany || null}, ${emailData.brokerEmail}, ${emailData.brokerPhone || null}, NOW())`;
    }
  }

  // ---- Render email HTML ---------------------------------------------------
  // Use client-rendered WYSIWYG HTML when available; fall back to server template
  const html = clientRenderedHtml || await renderEoiEmailHtml(emailData);
  const subject = renderEoiSubject(emailData, sendType);

  // ---- Parse offer price to decimal for DB ---------------------------------
  // Extract first numeric value from price (handles ranges like "$890,000 – $920,000")
  const priceMatch = (offerPrice || '').match(/[\d][,\d]*\.?\d*/);
  const priceNumeric = priceMatch ? parseFloat(priceMatch[0].replace(/,/g, '')) || null : null;

  // ---- Insert send record (pending) ----------------------------------------
  const sendRecord = await sql`
    INSERT INTO eoi_sends (
      record_id, opportunity_id, property_address, send_type,
      offer_price, agent_email, agent_contact_id, sent_by,
      delivery_status, payload, eoi_status
    ) VALUES (
      ${recordId}, ${opportunityId || null}, ${propertyAddress || null}, ${sendType},
      ${priceNumeric}, ${agentEmail}, ${agentContactId}, ${sentBy || 'unknown'},
      'pending', ${JSON.stringify(
        {
          ...(attachments && attachments.length > 0
            ? { ...emailData, attachments: attachments.map(a => ({ type: a.type, forLabel: a.forLabel, autoName: a.autoName, mimeType: a.mimeType, size: Math.round(a.base64.length * 3 / 4) })) }
            : emailData),
          ...(initiatedBy && initiatedBy !== sentBy ? { initiatedBy } : {}),
        }
      )}, 'sending'
    ) RETURNING id`;

  const sendId = sendRecord[0]?.id as number;

  // ---- Send email via Gmail API (service account + domain-wide delegation) --
  let deliveryStatus = 'no_credentials';
  let deliveryError = '';

  const credentialsJson = process.env.GOOGLE_SHEETS_CREDENTIALS;
  if (credentialsJson) {
    try {
      let credentials;
      try {
        credentials = JSON.parse(credentialsJson.trim().replace(/^'|'$/g, ''));
      } catch {
        const cleaned = credentialsJson.replace(/\n/g, ' ').replace(/\s+/g, ' ');
        credentials = JSON.parse(cleaned);
      }
      if (credentials.private_key) {
        credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
      }

      // Authenticate as FROM_EMAIL using domain-wide delegation
      const auth = new google.auth.JWT({
        email: credentials.client_email,
        key: credentials.private_key,
        scopes: ['https://www.googleapis.com/auth/gmail.send'],
        subject: sentBy,
      });

      const gmail = google.gmail({ version: 'v1', auth });

      // CC: configurable from Template Admin (property@, BA, and custom emails)
      const ccList: string[] = [];
      try {
        const ccRows = await sql`
          SELECT field_name, field_value FROM eoi_template_values
          WHERE state = 'GLB' AND property_type = 'all'
            AND field_name IN ('cc_list', 'cc_include_property', 'cc_include_ba')`;
        const ccSettings: Record<string, string> = {};
        for (const row of ccRows) ccSettings[row.field_name as string] = row.field_value as string;

        // property@ — included unless explicitly disabled
        if (ccSettings.cc_include_property !== 'false') {
          ccList.push(FROM_EMAIL);
        }
        // Assigned BA — included unless explicitly disabled
        if (ccSettings.cc_include_ba !== 'false' && consultantEmail && consultantEmail.includes('@')) {
          ccList.push(consultantEmail);
        }
        // Custom CC emails
        if (ccSettings.cc_list) {
          const extras = ccSettings.cc_list
            .split(',')
            .map(e => e.trim())
            .filter(e => e.includes('@') && !ccList.includes(e));
          ccList.push(...extras);
        }
      } catch (err) {
        // Fallback: include property@ and BA if DB fetch fails
        ccList.push(FROM_EMAIL);
        if (consultantEmail && consultantEmail.includes('@')) ccList.push(consultantEmail);
        console.error('Failed to fetch global CC settings (non-fatal):', err);
      }

      // RFC 2047 encode subject for non-ASCII characters (e.g. em dash)
      const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;

      // Build RFC 2822 MIME message
      let rawMessage: string;

      if (attachments && attachments.length > 0) {
        // Multipart/mixed — HTML body + file attachments
        const boundary = '----=_Part_EOI';
        const headers = [
          `From: ${sentBy}`,
          `To: ${agentEmail}`,
          `Cc: ${ccList.join(', ')}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          `Content-Type: multipart/mixed; boundary="${boundary}"`,
          '',
        ];

        const parts: string[] = [];

        // HTML body part
        parts.push(
          `--${boundary}`,
          'Content-Type: text/html; charset=UTF-8',
          '',
          html,
        );

        // Attachment parts
        for (const att of attachments) {
          parts.push(
            `--${boundary}`,
            `Content-Type: ${att.mimeType}; name="${att.autoName}"`,
            `Content-Disposition: attachment; filename="${att.autoName}"`,
            'Content-Transfer-Encoding: base64',
            '',
            att.base64,
          );
        }

        // Closing boundary
        parts.push(`--${boundary}--`);

        rawMessage = headers.join('\r\n') + '\r\n' + parts.join('\r\n');
      } else {
        // Simple text/html — no attachments (backward compatible)
        const messageParts = [
          `From: ${sentBy}`,
          `To: ${agentEmail}`,
          `Cc: ${ccList.join(', ')}`,
          `Subject: ${encodedSubject}`,
          'MIME-Version: 1.0',
          'Content-Type: text/html; charset=UTF-8',
          '',
          html,
        ];
        rawMessage = messageParts.join('\r\n');
      }
      const encodedMessage = Buffer.from(rawMessage)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

      await gmail.users.messages.send({
        userId: 'me',
        requestBody: { raw: encodedMessage },
      });

      deliveryStatus = 'sent';
    } catch (err) {
      deliveryStatus = 'failed';
      deliveryError = err instanceof Error ? err.message : 'Unknown error';
      console.error('EOI email send failed:', deliveryError);
    }
  }

  // ---- Update send record with delivery result -----------------------------
  await sql`
    UPDATE eoi_sends
    SET delivery_status = ${deliveryStatus},
        eoi_status = ${deliveryStatus === 'sent' ? 'sent' : deliveryStatus === 'no_credentials' ? 'recorded' : 'failed'},
        notes = ${deliveryError || null}
    WHERE id = ${sendId}`;

  // ---- Write offer_status + eoi_notes to CO on successful send ------------
  if (deliveryStatus === 'sent' || deliveryStatus === 'no_credentials') {
    const bearerToken = process.env.GHL_BEARER_TOKEN || '';
    const locationId = process.env.GHL_LOCATION_ID || '';
    const GHL_OBJECT_ID = '692d04e3662599ed0c29edfa';
    if (bearerToken && locationId && recordId) {
      try {
        const isHL = emailData.propertyType === 'hl_split' || emailData.propertyType === 'house_and_land';
        // Build properties using field names (same format as link-opportunity route)
        const properties: Record<string, string> = {};

        // Set offer_status to "Offered"
        if (isHL) {
          properties.offer_status_land = 'offered';
          properties.offer_status_build = 'offered';
          // H&L: write calculated total to Offer Price
          if (emailData.landPrice && emailData.buildPrice) {
            const rawLand = parseFloat(emailData.landPrice.replace(/[^0-9.]/g, '')) || 0;
            const rawBuild = parseFloat(emailData.buildPrice.replace(/[^0-9.]/g, '')) || 0;
            if (rawLand + rawBuild > 0) {
              properties.offer_price = String(rawLand + rawBuild);
            }
          }
        } else {
          properties.offer_status = 'offered';
        }

        // Write eoi_notes to the CO
        if (emailData.notes) {
          properties.eoi_notes = emailData.notes;
        }

        // Write agent details back to CO so they persist for future EOIs
        if (emailData.agentName && emailData.agentName !== 'TBC') {
          properties.agent_name = emailData.agentName;
        }
        if (emailData.agentEmail && emailData.agentEmail !== 'TBC') {
          properties.agent_email = emailData.agentEmail;
        }
        if (emailData.agentPhone && emailData.agentPhone !== 'TBC') {
          properties.agent_mobile = emailData.agentPhone;
        }

        // For increase/revision, also update offer_price on the CO
        if (sendType === 'increase' || sendType === 'revision') {
          const rawPrice = (offerPrice || '').replace(/[^0-9.]/g, '');
          if (rawPrice) {
            if (isHL && emailData.landPrice && emailData.buildPrice) {
              const rawLand = emailData.landPrice.replace(/[^0-9.]/g, '');
              const rawBuild = emailData.buildPrice.replace(/[^0-9.]/g, '');
              if (rawLand) properties.offer_price_land = rawLand;
              if (rawBuild) properties.offer_price_build = rawBuild;
              // Also write total to offer_price
              const totalRaw = String((parseFloat(rawLand) || 0) + (parseFloat(rawBuild) || 0));
              if (totalRaw !== '0') properties.offer_price = totalRaw;
            } else {
              properties.offer_price = rawPrice;
            }
          }
        }

        if (Object.keys(properties).length > 0) {
          const url = `https://services.leadconnectorhq.com/objects/${GHL_OBJECT_ID}/records/${recordId}?locationId=${locationId}`;
          await fetch(url, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              Version: '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ properties }),
          });
        }
      } catch (err) {
        console.error('EOI CO write-back failed (non-fatal):', err instanceof Error ? err.message : err);
      }
    }

    // ---- Write purchaser/solicitor/broker fields back to GHL Opportunity ----
    if (bearerToken && locationId && opportunityId) {
      try {
        // Map of GHL custom field IDs to values from the EOI form
        const oppFields: { id: string; field_value: string }[] = [];

        // Purchaser 1 address
        const p1 = emailData.purchasers?.[0];
        if (p1?.address) oppFields.push({ id: 'jY0D9emvA78Tr7TsKMB3', field_value: p1.address });

        // Purchaser 2 (partner) fields
        const p2 = emailData.purchasers?.[1];
        if (p2?.name) oppFields.push({ id: 'xFKbtz7Lt1X2nNTeFSSH', field_value: p2.name });
        if (p2?.email) oppFields.push({ id: 'd0iUirsqy4kdUVMpHLfD', field_value: p2.email });
        if (p2?.phone) oppFields.push({ id: 'gpStrUSjZVHE4xyolRvH', field_value: p2.phone });
        if (p2?.address) oppFields.push({ id: 'KpxtSsE1JT2Hgo8gSkvF', field_value: p2.address });

        // Solicitor fields
        if (emailData.solicitorCompany) oppFields.push({ id: 'bQ7bndudaNLmlLkYeDpG', field_value: emailData.solicitorCompany });
        if (emailData.solicitorName) oppFields.push({ id: 'QOoYpW6A8G1Jk8xWs7h1', field_value: emailData.solicitorName });
        if (emailData.solicitorPhone) oppFields.push({ id: 'ff8fVDpZc9gwDH9nJdTR', field_value: emailData.solicitorPhone });
        if (emailData.solicitorEmail) oppFields.push({ id: 'fr5S8FvqtZi3Pixo7fSY', field_value: emailData.solicitorEmail });

        // Broker fields
        if (emailData.brokerCompany) oppFields.push({ id: 'bV6k9SaZ1UJpOuALO1xY', field_value: emailData.brokerCompany });
        if (emailData.brokerName) oppFields.push({ id: 'lX2e29gQ1iFuQ0DksM5W', field_value: emailData.brokerName });
        if (emailData.brokerPhone) oppFields.push({ id: 'hSW5hSoB1mZyHsnk2o6n', field_value: emailData.brokerPhone });
        if (emailData.brokerEmail) oppFields.push({ id: 'puGMV3MWyU13n4sBLHDj', field_value: emailData.brokerEmail });

        if (oppFields.length > 0) {
          const oppUrl = `https://services.leadconnectorhq.com/opportunities/${opportunityId}?locationId=${locationId}`;
          const oppRes = await fetch(oppUrl, {
            method: 'PUT',
            headers: {
              Authorization: `Bearer ${bearerToken}`,
              Version: '2021-07-28',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ customFields: oppFields }),
          });
          if (!oppRes.ok) {
            console.error('EOI Opportunity write-back failed:', oppRes.status, await oppRes.text());
          }
        }
      } catch (err) {
        console.error('EOI Opportunity write-back failed (non-fatal):', err instanceof Error ? err.message : err);
      }
    }
  }

  return NextResponse.json({
    ok: true,
    sendId,
    deliveryStatus,
    deliveryError: deliveryError || undefined,
    subject,
  });
}
