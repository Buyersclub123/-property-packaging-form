'use client';

import { INVESTMENT_HIGHLIGHTS_MAX_CHARS, ihCharCount } from '@/lib/investmentHighlightsLimit';

interface Props {
  value: string | null | undefined;
  className?: string;
}

/** Live "N / 12,000 characters" counter for Investment Highlights text; red when over GHL's limit. */
export function InvestmentHighlightsCharCount({ value, className = '' }: Props) {
  const count = ihCharCount(value);
  const over = count - INVESTMENT_HIGHLIGHTS_MAX_CHARS;
  const isOver = over > 0;

  return (
    <p className={`text-xs ${isOver ? 'text-red-600 font-semibold' : 'text-gray-500'} ${className}`}>
      {count.toLocaleString()} / {INVESTMENT_HIGHLIGHTS_MAX_CHARS.toLocaleString()} characters (incl. line breaks)
      {isOver && ` — ${over.toLocaleString()} over the GHL limit`}
    </p>
  );
}
