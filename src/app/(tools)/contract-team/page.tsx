'use client';

if (typeof document !== 'undefined') document.title = 'Contract Team Reports Tool — Retired';

// This tool has been retired and replaced by the Contract Team Reporting Tool.
// The previous implementation is in git history (last version: commit 912f4e86).
// Same pattern as /bp-finance — the tool is not reachable, only the notice.

// Absolute production URL on purpose: this notice must send people to the live
// tool no matter where the page is opened from (including a dev build).
const NEW_TOOL_URL = 'https://property-packaging-form.vercel.app/contract-team-reporting';

export default function ContractTeamRetiredPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-[520px] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-8 text-center">
        <img src="/logo.jpg" alt="Buyers Club" className="h-10 w-auto mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-100 mb-3">
          The Contract Team Reports Tool has been retired
        </h1>
        <p className="text-sm text-gray-300 mb-6">
          It has been replaced by the <strong>Contract Team Reporting Tool</strong>, which
          contains all of the contract team reports.
        </p>
        <a
          href={NEW_TOOL_URL}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
        >
          Open the Contract Team Reporting Tool
        </a>
        <p className="text-xs text-gray-500 mt-4">Please update your bookmarks to: {NEW_TOOL_URL}</p>
      </div>
    </div>
  );
}
