/**
 * GHL's "Investment Highlights" custom field (LARGE_TEXT) rejects values over
 * 12,000 characters. GHL counts every character of the string it receives,
 * including line breaks — unlike Word, which ignores paragraph marks.
 *
 * All screens and API routes that handle Investment Highlights text must use
 * these helpers so the UI counter and the server checks can never disagree.
 */

export const INVESTMENT_HIGHLIGHTS_MAX_CHARS = 12000;

/** Collapse Windows/Mac line endings to \n and drop trailing whitespace — this is the value that gets sent to GHL. */
export function normaliseIh(text: string | null | undefined): string {
  return (text ?? '').replace(/\r\n?/g, '\n').trimEnd();
}

export function ihCharCount(text: string | null | undefined): number {
  return normaliseIh(text).length;
}

export function ihCharsOver(text: string | null | undefined): number {
  return Math.max(0, ihCharCount(text) - INVESTMENT_HIGHLIGHTS_MAX_CHARS);
}

export function ihLimitError(text: string | null | undefined): string {
  const over = ihCharsOver(text);
  return `Investment Highlights is ${over.toLocaleString()} characters over the ${INVESTMENT_HIGHLIGHTS_MAX_CHARS.toLocaleString()} limit GHL allows (line breaks count). Please shorten it before saving.`;
}
