'use client';

import { useEffect } from 'react';

// Single-record CTRT view (/contract-team-reporting/record?opp=<id>) — to be built.
// Until then it opens the CTRT filtered to that opportunity.
export default function CtrtRecordPage() {
  useEffect(() => {
    const opp = new URLSearchParams(window.location.search).get('opp') || '';
    window.location.replace(`/contract-team-reporting${opp ? `?opp=${encodeURIComponent(opp)}` : ''}`);
  }, []);
  return <div className="p-4 text-sm text-gray-500">Opening CTRT…</div>;
}
