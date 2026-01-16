'use client';

import { useState } from 'react';

export default function TestSheetsPopulation() {
  const [folderId, setFolderId] = useState('');
  const [formData, setFormData] = useState<any>({
    address: {
      propertyAddress: '5 Antilles St Parrearra QLD 4575',
      streetNumber: '5',
      streetName: 'Antilles St',
      suburbName: 'Parrearra',
      state: 'QLD',
      postCode: '4575',
    },
    purchasePrice: {
      landPrice: '450000',
      buildPrice: '150000',
      totalPrice: '600000',
      cashbackRebateValue: '15000',
      cashbackRebateType: 'cashback',
    },
    propertyDescription: {
      bedsPrimary: '3',
      bedsSecondary: '2',
      bathPrimary: '2',
      bathSecondary: '1',
      garagePrimary: '1',
      garageSecondary: '0',
    },
    rentalAssessment: {
      rentAppraisalPrimaryFrom: '450',
      rentAppraisalPrimaryTo: '500',
      rentAppraisalSecondaryFrom: '300',
      rentAppraisalSecondaryTo: '350',
    },
    decisionTree: {
      dualOccupancy: 'Yes',
    },
  });
  const [result, setResult] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const handleTest = async () => {
    if (!folderId.trim()) {
      setResult('Error: Please enter a folder ID');
      return;
    }

    setLoading(true);
    setResult('Testing... Please wait.');

    try {
      const response = await fetch('/api/test-populate-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId,
          formData,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(`✅ Success!\n\nFound ${data.sheetsFound} sheet(s)\n\nResults:\n${JSON.stringify(data.results, null, 2)}`);
      } else {
        setResult(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Test Google Sheets Population</h1>
      <p className="text-gray-600 mb-6">
        Standalone test page for populating Google Sheets in a folder. 
        This will populate the "Autofill data" tab in all Google Sheets found in the folder.
      </p>
      
      <div className="space-y-6 mb-6">
        <div>
          <label className="block mb-2 font-semibold">Folder ID (from Google Drive):</label>
          <input
            type="text"
            value={folderId}
            onChange={(e) => setFolderId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter folder ID from Google Drive URL"
          />
          <p className="text-sm text-gray-500 mt-1">
            Example: From URL <code>drive.google.com/drive/folders/FOLDER_ID_HERE</code>
          </p>
        </div>

        <div>
          <label className="block mb-2 font-semibold">Form Data (JSON - edit as needed):</label>
          <textarea
            value={JSON.stringify(formData, null, 2)}
            onChange={(e) => {
              try {
                setFormData(JSON.parse(e.target.value));
              } catch {
                // Invalid JSON, ignore
              }
            }}
            className="w-full p-2 border rounded font-mono text-sm"
            rows={25}
          />
        </div>

        <button
          onClick={handleTest}
          disabled={loading || !folderId.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {loading ? 'Testing...' : 'Test Population'}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-sm whitespace-pre-wrap border">
            {result}
          </pre>
        </div>
      )}

      <div className="mt-8 p-4 bg-blue-50 rounded">
        <h3 className="font-semibold mb-2">How to use:</h3>
        <ol className="list-decimal list-inside space-y-1 text-sm">
          <li>Create a property folder in Google Drive (or use an existing one)</li>
          <li>Copy the folder ID from the Google Drive URL</li>
          <li>Paste it in the "Folder ID" field above</li>
          <li>Edit the form data JSON if needed (default values are provided)</li>
          <li>Click "Test Population" to populate all Google Sheets in that folder</li>
          <li>Check the "Autofill data" tab in each sheet to verify the values</li>
        </ol>
      </div>
    </div>
  );
}
