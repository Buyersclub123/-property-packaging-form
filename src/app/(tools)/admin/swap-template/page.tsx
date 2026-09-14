'use client';

import { useState } from 'react';

type Step = 'input' | 'select-sheet' | 'preview' | 'swap-done' | 'deleted';

interface SheetInfo {
  id: string;
  name: string;
}

interface PreviewData {
  targetSheet: SheetInfo;
  template: SheetInfo;
  dataFields: Array<{ field: string; value: string }>;
  matchPreview: { matched: number; unmatched: string[] };
  log: string[];
}

interface SwapData {
  oldSheet: SheetInfo;
  newSheet: SheetInfo;
  fieldsTransferred: number;
  unmatchedFields: string[];
  log: string[];
}

export default function SwapTemplatePage() {
  const [folderLink, setFolderLink] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('input');

  // Multi-sheet selection
  const [availableSheets, setAvailableSheets] = useState<SheetInfo[]>([]);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);

  // Preview data
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);

  // Swap result
  const [swapData, setSwapData] = useState<SwapData | null>(null);

  // All logs accumulated
  const [allLogs, setAllLogs] = useState<string[]>([]);

  const addLogs = (newLogs: string[]) => {
    setAllLogs(prev => [...prev, ...newLogs]);
  };

  const callApi = async (body: Record<string, unknown>) => {
    const response = await fetch('/api/admin/swap-cashflow-template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response.json();
  };

  // Step 1: Preview
  const handlePreview = async (sheetId?: string) => {
    if (!folderLink.trim()) {
      setError('Folder link is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await callApi({
        action: 'preview',
        folderLink: folderLink.trim(),
        selectedSheetId: sheetId || selectedSheetId,
      });

      if (!data.success) {
        setError(data.error);
        if (data.log) addLogs(data.log);
        return;
      }

      if (data.log) addLogs(data.log);

      // If multiple sheets, show selection step
      if (data.multipleSheets) {
        setAvailableSheets(data.sheets);
        setStep('select-sheet');
        return;
      }

      // Show preview
      setPreviewData({
        targetSheet: data.targetSheet,
        template: data.template,
        dataFields: data.dataFields,
        matchPreview: data.matchPreview,
        log: data.log,
      });
      setSelectedSheetId(data.targetSheet.id);
      setStep('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Handle sheet selection when multiple exist
  const handleSheetSelect = (sheetId: string) => {
    setSelectedSheetId(sheetId);
    handlePreview(sheetId);
  };

  // Step 2: Swap
  const handleSwap = async () => {
    if (!selectedSheetId) {
      setError('No sheet selected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await callApi({
        action: 'swap',
        folderLink: folderLink.trim(),
        selectedSheetId,
      });

      if (!data.success) {
        setError(data.error);
        if (data.log) addLogs(data.log);
        return;
      }

      if (data.log) addLogs(data.log);

      setSwapData({
        oldSheet: data.oldSheet,
        newSheet: data.newSheet,
        fieldsTransferred: data.fieldsTransferred,
        unmatchedFields: data.unmatchedFields,
        log: data.log,
      });
      setStep('swap-done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Delete old sheet
  const handleDelete = async () => {
    if (!swapData?.oldSheet.id) {
      setError('No old sheet to delete');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await callApi({
        action: 'delete',
        folderLink: folderLink.trim(),
        oldSheetId: swapData.oldSheet.id,
      });

      if (!data.success) {
        setError(data.error);
        if (data.log) addLogs(data.log);
        return;
      }

      if (data.log) addLogs(data.log);
      setStep('deleted');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset for next folder
  const handleNextFolder = () => {
    setFolderLink('');
    setError(null);
    setStep('input');
    setAvailableSheets([]);
    setSelectedSheetId(null);
    setPreviewData(null);
    setSwapData(null);
    setAllLogs([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-2">Swap Cashflow Template</h1>
      <p className="text-sm text-gray-600 mb-6">
        Replace an existing cashflow spreadsheet with the new template, migrating &quot;Autofill data&quot; values across.
        One folder at a time — preview, swap, verify, then delete the old sheet.
      </p>

      {/* Folder Input — always visible until deleted */}
      {step !== 'deleted' && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Property Folder Link or ID
          </label>
          <input
            type="text"
            value={folderLink}
            onChange={(e) => setFolderLink(e.target.value)}
            disabled={step !== 'input'}
            placeholder="https://drive.google.com/drive/folders/... or folder ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
          />
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* === STEP: INPUT === */}
      {step === 'input' && (
        <button
          onClick={() => handlePreview()}
          disabled={loading || !folderLink.trim()}
          className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Loading...' : 'Preview'}
        </button>
      )}

      {/* === STEP: SELECT SHEET === */}
      {step === 'select-sheet' && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h3 className="font-semibold text-sm mb-3 text-yellow-800">
            Multiple sheets found — select which one to swap:
          </h3>
          <div className="space-y-2">
            {availableSheets.map((sheet) => (
              <button
                key={sheet.id}
                onClick={() => handleSheetSelect(sheet.id)}
                disabled={loading}
                className="block w-full text-left px-3 py-2 bg-white border border-gray-200 rounded-md text-sm hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50"
              >
                <span className="font-medium">{sheet.name}</span>
                <span className="text-gray-400 text-xs ml-2">({sheet.id})</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* === STEP: PREVIEW === */}
      {step === 'preview' && previewData && (
        <div className="space-y-4">
          {/* Preview Banner */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="font-semibold text-sm text-blue-800 mb-2">Preview</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">Sheet to swap:</span> {previewData.targetSheet.name}</p>
              <p><span className="text-gray-500">New template:</span> {previewData.template.name}</p>
              <p className="text-green-700 font-medium mt-2">
                {previewData.matchPreview.matched} fields will transfer
              </p>
              {previewData.matchPreview.unmatched.length > 0 && (
                <p className="text-orange-600">
                  {previewData.matchPreview.unmatched.length} field(s) will NOT transfer (not in new template)
                </p>
              )}
            </div>
          </div>

          {/* Unmatched warning */}
          {previewData.matchPreview.unmatched.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <p className="text-xs font-medium text-orange-700 mb-1">Unmatched fields:</p>
              <ul className="list-disc list-inside text-xs text-orange-600">
                {previewData.matchPreview.unmatched.map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Data table */}
          {previewData.dataFields.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">
                Current Data ({previewData.dataFields.length} fields with values)
              </h3>
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-1 pr-2 text-gray-500">Field</th>
                      <th className="text-left py-1 text-gray-500">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.dataFields.map((d, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-1 pr-2 font-medium">{d.field}</td>
                        <td className="py-1 text-gray-700 truncate max-w-xs" title={d.value}>{d.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Swap button */}
          <button
            onClick={handleSwap}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Swapping...' : 'Swap Template'}
          </button>
        </div>
      )}

      {/* === STEP: SWAP DONE === */}
      {step === 'swap-done' && swapData && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-sm text-green-800 mb-2">Template Swapped</h3>
            <div className="text-sm space-y-1">
              <p><span className="text-gray-500">New sheet:</span> {swapData.newSheet.name} <span className="text-gray-400 text-xs">({swapData.newSheet.id})</span></p>
              <p><span className="text-gray-500">Fields transferred:</span> {swapData.fieldsTransferred}</p>
              <p><span className="text-gray-500">Old sheet (still exists):</span> {swapData.oldSheet.name} <span className="text-gray-400 text-xs">({swapData.oldSheet.id})</span></p>
            </div>
            {swapData.unmatchedFields.length > 0 && (
              <div className="mt-2 text-xs text-orange-600">
                <p className="font-medium">Unmatched fields:</p>
                <ul className="list-disc list-inside">
                  {swapData.unmatchedFields.map((f, i) => (
                    <li key={i}>{f}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <p className="text-sm text-gray-600">
            Verify the new sheet is correct in Google Drive, then delete the old sheet when ready.
          </p>

          <button
            onClick={handleDelete}
            disabled={loading}
            className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Deleting...' : 'Delete Old Sheet'}
          </button>
        </div>
      )}

      {/* === STEP: DELETED === */}
      {step === 'deleted' && (
        <div className="space-y-4">
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <h3 className="font-semibold text-sm text-green-800">Done — old sheet deleted</h3>
          </div>

          <button
            onClick={handleNextFolder}
            className="px-4 py-2 bg-gray-700 text-white rounded-md text-sm font-medium hover:bg-gray-800"
          >
            Next Folder
          </button>
        </div>
      )}

      {/* Log — always visible when populated */}
      {allLogs.length > 0 && (
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-sm mb-2">Log</h3>
          <div className="text-xs font-mono space-y-0.5 max-h-48 overflow-y-auto">
            {allLogs.map((line, i) => (
              <p key={i} className="text-gray-600">{line}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
