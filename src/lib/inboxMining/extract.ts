import JSZip from 'jszip';
import type { Fact, FactKey, Facts } from './types';
import { driveFor, googleErrorMessage } from './google';
import { RULES, STAGE_PATTERNS } from './factRules';

export interface PdfRead {
  text: string;
  pages: number;
  isDocuSign: boolean;
}

export async function readPdf(buf: Buffer): Promise<PdfRead> {
  const { getDocumentProxy, extractText } = await import('unpdf');
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  try {
    const { totalPages, text } = await extractText(pdf, { mergePages: true });
    // Form-field values (fillable PDFs) are not in the text layer.
    const fieldObjects = (await pdf.getFieldObjects()) as Record<string, { value?: unknown }[]> | null;
    const fieldLines: string[] = [];
    for (const [name, arr] of Object.entries(fieldObjects || {})) {
      const v = arr.map((a) => a.value).find((x) => typeof x === 'string' && x.trim());
      if (typeof v === 'string') fieldLines.push(`${name}: ${v}`);
    }
    const all = fieldLines.length ? `${text}\n${fieldLines.join('\n')}` : text;
    return { text: all, pages: totalPages, isDocuSign: /docusign envelope id/i.test(text) };
  } finally {
    await pdf.destroy();
  }
}

export interface ZipEntry {
  name: string;
  buf: Buffer;
}

/** Throws when the zip is corrupt or password protected; the caller lists it for JT (D25). */
export async function expandZip(buf: Buffer): Promise<ZipEntry[]> {
  const zip = await JSZip.loadAsync(buf);
  const out: ZipEntry[] = [];
  for (const entry of Object.values(zip.files)) {
    if (entry.dir || !/\.pdf$/i.test(entry.name) || entry.name.startsWith('__MACOSX/')) continue;
    out.push({ name: entry.name, buf: await entry.async('nodebuffer') });
  }
  return out;
}

// ---- Body links (D26) -------------------------------------------------------

const DOC_LINK = /(drive\.google\.com|docs\.google\.com|docusign|\.pdf(\?|$)|dropbox\.com|sharepoint\.com|onedrive|1drv\.ms|portal)/i;

export function documentLinks(text: string): string[] {
  const urls = text.match(/https?:\/\/[^\s"'<>)\]]+/gi) || [];
  return Array.from(new Set(urls.map((u) => u.replace(/[.,;]+$/, '')))).filter((u) => DOC_LINK.test(u));
}

function driveFileId(url: string): string | null {
  const m = url.match(/\/file\/d\/([\w-]{20,})/) || url.match(/[?&]id=([\w-]{20,})/);
  return m ? m[1] : null;
}

export type LinkFetch = { ok: true; name: string; buf: Buffer } | { ok: false; reason: string };

export async function fetchLinkedPdf(url: string, driveSubject: string): Promise<LinkFetch> {
  const fileId = driveFileId(url);
  if (fileId) {
    try {
      const drive = driveFor(driveSubject);
      const meta = await drive.files.get({ fileId, fields: 'name,mimeType', supportsAllDrives: true }, { timeout: 60_000 });
      if (meta.data.mimeType !== 'application/pdf') {
        return { ok: false, reason: `Drive file is ${meta.data.mimeType}, not a PDF` };
      }
      const res = await drive.files.get(
        { fileId, alt: 'media', supportsAllDrives: true },
        { responseType: 'arraybuffer', timeout: 60_000 }
      );
      return { ok: true, name: meta.data.name || fileId, buf: Buffer.from(res.data as ArrayBuffer) };
    } catch (e) {
      return { ok: false, reason: googleErrorMessage(e, 'Drive') };
    }
  }
  if (/docusign/i.test(url)) return { ok: false, reason: 'DocuSign link - needs sign-in, open manually' };
  if (/\.pdf(\?|$)/i.test(url)) {
    try {
      const res = await fetch(url, { cache: 'no-store', signal: AbortSignal.timeout(60_000) });
      const type = res.headers.get('content-type') || '';
      if (!res.ok) return { ok: false, reason: `HTTP ${res.status}` };
      if (!type.includes('pdf')) return { ok: false, reason: `Not a PDF (${type})` };
      return { ok: true, name: url.split('/').pop()!.split('?')[0], buf: Buffer.from(await res.arrayBuffer()) };
    } catch (e) {
      return { ok: false, reason: e instanceof Error ? e.message : String(e) };
    }
  }
  return { ok: false, reason: 'Portal / share link - needs sign-in, open manually' };
}

// ---- Facts ------------------------------------------------------------------

export const CONSTRUCTION_STAGES = [
  'Pre-BA',
  'BA Issued',
  'Slab',
  'Frame/Plate Height',
  'Enclosed/Roof Cover',
  'Tiling/Lock-up',
  'Fixing/Plastering',
  'Practical Completion',
  'Handover',
];

function quoteAround(text: string, index: number, len: number): string {
  const s = Math.max(0, index - 60);
  const e = Math.min(text.length, index + len + 60);
  return text.slice(s, e).replace(/\s+/g, ' ').trim();
}

export function extractFacts(text: string, source: string): Facts {
  const facts: Facts = {};
  for (const r of RULES) {
    const m = text.match(r.re);
    if (m && m.index !== undefined) {
      facts[r.key] = { value: r.value(m), source, quote: quoteAround(text, m.index, m[0].length), match: m[0].replace(/\s+/g, ' ').trim() };
    }
  }
  for (const [stage, re] of STAGE_PATTERNS) {
    const m = text.match(re);
    if (m && m.index !== undefined) {
      facts.constructionStage = { value: stage, source, quote: quoteAround(text, m.index, m[0].length), match: m[0].replace(/\s+/g, ' ').trim() };
      break;
    }
  }
  return facts;
}

/** Earlier sources win (documents are passed before the body: trust the contract). */
export function mergeFacts(...sets: Facts[]): Facts {
  const out: Facts = {};
  for (const set of sets) {
    for (const [k, v] of Object.entries(set) as [FactKey, Fact][]) {
      if (!out[k]) out[k] = v;
    }
  }
  return out;
}
