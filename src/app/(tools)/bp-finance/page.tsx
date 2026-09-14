'use client';

if (typeof document !== 'undefined') document.title = 'B&P & Finance Tool — Retired';

// This tool has been retired and replaced by the Contract Team Reporting Tool,
// which includes the B&P view plus all other contract team reports.

const NEW_TOOL_PATH = '/contract-team-reporting';

export default function BPFinanceRetiredPage() {
  return (
    <div className="flex items-center justify-center h-screen bg-gray-900">
      <div className="w-[520px] bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-8 text-center">
        <img src="/logo.jpg" alt="Buyers Club" className="h-10 w-auto mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-100 mb-3">
          The B&P &amp; Finance Tool has been retired
        </h1>
        <p className="text-sm text-gray-300 mb-6">
          It has been replaced by the <strong>Contract Team Reporting Tool</strong>,
          which includes the B&amp;P view (select <em>View: B&amp;P</em>) along with
          all the other contract team reports.
        </p>
        <a
          href={NEW_TOOL_PATH}
          className="inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-500 text-sm font-medium"
        >
          Open the Contract Team Reporting Tool
        </a>
        <p className="text-xs text-gray-500 mt-4">
          Please update your bookmarks to: {typeof window !== 'undefined' ? window.location.origin : ''}{NEW_TOOL_PATH}
        </p>
      </div>
    </div>
  );
}
