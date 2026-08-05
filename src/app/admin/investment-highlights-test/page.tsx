'use client';

import { useState } from 'react';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => String(CURRENT_YEAR - 1 + i));

export default function InvestmentHighlightsTestPage() {
  // Lookup state
  const [lookupLGA, setLookupLGA] = useState('');
  const [lookupState, setLookupState] = useState('');
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');

  // Save state
  const [saveLGA, setSaveLGA] = useState('');
  const [saveState, setSaveState] = useState('');
  const [saveSuburb, setSaveSuburb] = useState('');
  const [saveFromMonth, setSaveFromMonth] = useState('');
  const [saveFromYear, setSaveFromYear] = useState('');
  const [saveToMonth, setSaveToMonth] = useState('');
  const [saveToYear, setSaveToYear] = useState('');
  const [saveMainBody, setSaveMainBody] = useState('');
  const [saveUpdatedBy, setSaveUpdatedBy] = useState('');
  const [saveResult, setSaveResult] = useState<any>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [existsCheck, setExistsCheck] = useState<any>(null);

  const handleLookup = async () => {
    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const res = await fetch('/api/investment-highlights-v2/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lga: lookupLGA, state: lookupState }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lookup failed');
      setLookupResult(data);
    } catch (err: any) {
      setLookupError(err.message);
    } finally {
      setLookupLoading(false);
    }
  };

  const handleCheckExists = async () => {
    if (!saveLGA || !saveState) return;
    try {
      const res = await fetch(`/api/investment-highlights-v2/save?lga=${encodeURIComponent(saveLGA)}&state=${encodeURIComponent(saveState)}`);
      const data = await res.json();
      setExistsCheck(data);
    } catch (err) {
      setExistsCheck(null);
    }
  };

  const handleSave = async () => {
    setSaveLoading(true);
    setSaveError('');
    setSaveResult(null);

    try {
      const res = await fetch('/api/investment-highlights-v2/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lga: saveLGA,
          state: saveState,
          suburb: saveSuburb,
          validFromMonth: saveFromMonth,
          validFromYear: saveFromYear,
          validToMonth: saveToMonth,
          validToYear: saveToYear,
          mainBody: saveMainBody,
          updatedBy: saveUpdatedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setSaveResult(data);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Investment Highlights V2 - Test Page
        </h1>
        <p className="text-gray-600 mb-8">
          LGA-keyed lookup and save. Uses normalised fuzzy matching to prevent duplicates.
        </p>

        {/* LOOKUP SECTION */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">1. Lookup by LGA + State</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
              <input
                type="text"
                value={lookupLGA}
                onChange={(e) => setLookupLGA(e.target.value)}
                placeholder="e.g. Fraser Coast Regional"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={lookupState}
                onChange={(e) => setLookupState(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="NSW">NSW</option>
                <option value="QLD">QLD</option>
                <option value="VIC">VIC</option>
                <option value="SA">SA</option>
                <option value="WA">WA</option>
                <option value="TAS">TAS</option>
                <option value="NT">NT</option>
                <option value="ACT">ACT</option>
              </select>
            </div>
            <div className="flex items-end">
              <button
                onClick={handleLookup}
                disabled={lookupLoading || !lookupLGA || !lookupState}
                className="w-full bg-blue-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {lookupLoading ? 'Searching...' : 'Lookup'}
              </button>
            </div>
          </div>

          {lookupError && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm mb-4">
              {lookupError}
            </div>
          )}

          {lookupResult && (
            <div className={`border rounded p-4 text-sm ${lookupResult.found ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
              {lookupResult.found ? (
                <>
                  <div className="font-semibold text-green-800 mb-2">
                    Match Found ({lookupResult.matchType} match)
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-gray-700">
                    <div><strong>LGA:</strong> {lookupResult.data.lga}</div>
                    <div><strong>State:</strong> {lookupResult.data.state}</div>
                    <div><strong>Valid:</strong> {lookupResult.data.validFromMonth} {lookupResult.data.validFromYear} - {lookupResult.data.validToMonth} {lookupResult.data.validToYear}</div>
                    <div><strong>Suburbs:</strong> {lookupResult.data.suburbs}</div>
                    <div><strong>Updated by:</strong> {lookupResult.data.updatedBy || 'N/A'}</div>
                    <div><strong>Updated at:</strong> {lookupResult.data.updatedAt || 'N/A'}</div>
                  </div>
                  {lookupResult.data.mainBody && (
                    <div className="mt-3 border-t pt-3">
                      <strong>Main Body:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-xs bg-white p-2 rounded border max-h-60 overflow-y-auto">
                        {lookupResult.data.mainBody}
                      </pre>
                    </div>
                  )}
                </>
              ) : (
                <div className="font-semibold text-yellow-800">
                  ⚠️ No report found for "{lookupLGA}" ({lookupState})
                </div>
              )}
            </div>
          )}
        </div>

        {/* SAVE SECTION */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">2. Save / Update Report</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">LGA</label>
              <input
                type="text"
                value={saveLGA}
                onChange={(e) => setSaveLGA(e.target.value)}
                onBlur={handleCheckExists}
                placeholder="e.g. City of Playford"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <select
                value={saveState}
                onChange={(e) => { setSaveState(e.target.value); }}
                onBlur={handleCheckExists}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              >
                <option value="">Select...</option>
                <option value="NSW">NSW</option>
                <option value="QLD">QLD</option>
                <option value="VIC">VIC</option>
                <option value="SA">SA</option>
                <option value="WA">WA</option>
                <option value="TAS">TAS</option>
                <option value="NT">NT</option>
                <option value="ACT">ACT</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suburb</label>
              <input
                type="text"
                value={saveSuburb}
                onChange={(e) => setSaveSuburb(e.target.value)}
                placeholder="e.g. Davoren Park"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>

          {existsCheck && (
            <div className={`border rounded p-3 text-sm mb-4 ${existsCheck.exists ? 'bg-blue-50 border-blue-200 text-blue-800' : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
              {existsCheck.exists ? (
                <>
                  <strong>Report already exists</strong> - saving will UPDATE the existing row.
                  <div className="mt-1 text-xs">
                    Current: {existsCheck.currentData?.lga} | Valid: {existsCheck.currentData?.validPeriod} | Last updated by: {existsCheck.currentData?.updatedBy || 'unknown'}
                  </div>
                </>
              ) : (
                <span><strong>New LGA</strong> - saving will CREATE a new row.</span>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid From Month</label>
              <select value={saveFromMonth} onChange={(e) => setSaveFromMonth(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Month...</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid From Year</label>
              <select value={saveFromYear} onChange={(e) => setSaveFromYear(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Year...</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid To Month</label>
              <select value={saveToMonth} onChange={(e) => setSaveToMonth(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Month...</option>
                {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Valid To Year</label>
              <select value={saveToYear} onChange={(e) => setSaveToYear(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                <option value="">Year...</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Main Body (Report Content)</label>
            <textarea
              value={saveMainBody}
              onChange={(e) => setSaveMainBody(e.target.value)}
              placeholder="Paste or type the investment highlights content here..."
              rows={8}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm font-mono"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Updated By (email)</label>
            <input
              type="email"
              value={saveUpdatedBy}
              onChange={(e) => setSaveUpdatedBy(e.target.value)}
              placeholder="e.g. packager@company.com"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>

          <button
            onClick={handleSave}
            disabled={saveLoading || !saveLGA || !saveState || !saveFromMonth || !saveFromYear || !saveToMonth || !saveToYear || !saveMainBody || !saveUpdatedBy}
            className="w-full bg-green-600 text-white rounded px-4 py-2 text-sm font-medium hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {saveLoading ? 'Saving...' : existsCheck?.exists ? 'Update Existing Report' : 'Create New Report'}
          </button>

          {saveError && (
            <div className="mt-4 bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
              {saveError}
            </div>
          )}

          {saveResult && (
            <div className="mt-4 bg-green-50 border border-green-200 text-green-700 rounded p-4 text-sm">
              <div className="font-semibold">✅ {saveResult.message}</div>
              <div className="mt-1 text-xs">Action: {saveResult.action} | Row: {saveResult.rowNumber}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
