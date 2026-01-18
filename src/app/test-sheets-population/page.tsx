'use client';

import { useState, useEffect, useRef } from 'react';

export default function TestSheetsPopulation() {
  const [activeTab, setActiveTab] = useState<'sheets' | 'washington-brown'>('washington-brown');
  const [sourceFolderId, setSourceFolderId] = useState('1R2g9dbaaQooocgV3FZe9KR-0F0C1xNh5'); // Master Template default
  const [destinationParentFolderId, setDestinationParentFolderId] = useState('1RFOBoJKBVIBDZsMUih3tWJ-yOE8YLKoZ'); // Properties folder default
  const [newFolderName, setNewFolderName] = useState('Test 1');
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
      yearBuilt: '2026',
      landRegistration: 'Registered',
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
  const [depreciation, setDepreciation] = useState<{[key: string]: string}>({});
  const [wbMessage, setWbMessage] = useState<string>('Waiting for Washington Brown data...');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastIframeUrlRef = useRef<string>('');
  
  // Listen for postMessage from Washington Brown iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Log ALL messages to see what we're getting
      console.log('All messages received:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data
      });
      
      // Only accept messages from Washington Brown domain
      if (event.origin !== 'https://www.washingtonbrown.com.au') {
        console.log('Message ignored - origin mismatch:', event.origin);
        return;
      }
      
      console.log('Washington Brown message received:', event.data);
      setWbMessage(`Received data: ${JSON.stringify(event.data)}`);
      
      // Try to extract depreciation values from the message
      // Structure will depend on what Washington Brown sends
      if (event.data && typeof event.data === 'object') {
        const depValues: {[key: string]: string} = {};
        
        // Check for common field names (will need to adjust based on actual response)
        for (let i = 1; i <= 10; i++) {
          const key = `year${i}`;
          if (event.data[key] || event.data[`Year ${i}`] || event.data[`depreciationYear${i}`]) {
            depValues[`year${i}`] = String(event.data[key] || event.data[`Year ${i}`] || event.data[`depreciationYear${i}`]);
          }
        }
        
        if (Object.keys(depValues).length > 0) {
          setDepreciation(depValues);
          
          // Auto-update formData with depreciation values
          setFormData((prev: any) => ({
            ...prev,
            depreciation: depValues,
          }));
          
          setWbMessage(`✅ Captured ${Object.keys(depValues).length} depreciation years!`);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    // Monitor iframe URL for changes (try to extract values from URL)
    const checkIframeUrl = () => {
      if (iframeRef.current) {
        try {
          const iframe = iframeRef.current;
          // Try to access iframe location (will fail if cross-origin, but worth trying)
          const currentUrl = iframe.contentWindow?.location.href || '';
          
          if (currentUrl && currentUrl !== lastIframeUrlRef.current) {
            console.log('Iframe URL changed:', currentUrl);
            lastIframeUrlRef.current = currentUrl;
            
            // Try to extract depreciation values from URL parameters or hash
            const url = new URL(currentUrl);
            const params = url.searchParams;
            const hash = url.hash;
            
            // Check query parameters for depreciation values
            const depValues: {[key: string]: string} = {};
            for (let i = 1; i <= 10; i++) {
              const yearValue = params.get(`year${i}`) || 
                               params.get(`Year${i}`) || 
                               params.get(`depreciationYear${i}`) ||
                               params.get(`dep${i}`);
              if (yearValue) {
                depValues[`year${i}`] = yearValue;
              }
            }
            
            // Check hash for JSON or parameters
            if (hash) {
              try {
                const hashData = decodeURIComponent(hash.substring(1));
                const parsed = JSON.parse(hashData);
                if (parsed && typeof parsed === 'object') {
                  for (let i = 1; i <= 10; i++) {
                    if (parsed[`year${i}`] || parsed[`Year${i}`] || parsed[`depreciationYear${i}`]) {
                      depValues[`year${i}`] = String(parsed[`year${i}`] || parsed[`Year${i}`] || parsed[`depreciationYear${i}`]);
                    }
                  }
                }
              } catch {
                // Not JSON, ignore
              }
            }
            
            if (Object.keys(depValues).length > 0) {
              setDepreciation(depValues);
              setFormData((prev: any) => ({
                ...prev,
                depreciation: depValues,
              }));
              setWbMessage(`✅ Captured ${Object.keys(depValues).length} depreciation years from URL!`);
            }
          }
        } catch (error) {
          // Cross-origin restriction - expected, this is normal
          // console.log('Cannot access iframe URL (cross-origin):', error);
        }
      }
    };
    
    // Check iframe URL every 2 seconds
    const urlInterval = setInterval(checkIframeUrl, 2000);
    
    return () => {
      window.removeEventListener('message', handleMessage);
      clearInterval(urlInterval);
    };
  }, []);
  
  // Build Washington Brown iframe URL
  const buildWBUrl = () => {
    return 'https://www.washingtonbrown.com.au/depreciation/calculator/';
  };

  const handleTest = async () => {
    console.log('=== BUTTON CLICKED ===');
    
    if (!sourceFolderId.trim()) {
      setResult('Error: Please enter a source folder ID to copy from');
      return;
    }
    if (!destinationParentFolderId.trim()) {
      setResult('Error: Please enter a destination parent folder ID');
      return;
    }
    if (!newFolderName.trim()) {
      setResult('Error: Please enter a new folder name');
      return;
    }

    setLoading(true);
    setResult('Copying folder and populating sheets... Please wait.');

    try {
      console.log('Starting test...', { sourceFolderId, destinationParentFolderId, newFolderName });
      
      // Include depreciation values in formData if they exist
      const formDataWithDepreciation = {
        ...formData,
        depreciation: Object.keys(depreciation).length > 0 ? depreciation : undefined,
      };
      
      const response = await fetch('/api/test-populate-sheets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceFolderId,
          destinationParentFolderId,
          newFolderName,
          formData: formDataWithDepreciation,
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', response.status, errorText);
        setResult(`❌ API Error (${response.status}): ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        // Format results more nicely
        let resultsText = `✅ Success!\n\n`;
        resultsText += `New Folder Created: ${data.newFolderName}\n`;
        resultsText += `Folder Link: ${data.folderLink}\n\n`;
        resultsText += `Found ${data.sheetsFound} sheet(s)\n\n`;
        
        if (data.results && Array.isArray(data.results)) {
          resultsText += `Sheet Population Results:\n`;
          resultsText += `${'='.repeat(50)}\n`;
          data.results.forEach((result: any, index: number) => {
            resultsText += `\n${index + 1}. ${result.sheetName || 'Unknown Sheet'}\n`;
            resultsText += `   Status: ${result.success ? '✅ Success' : '❌ Failed'}\n`;
            if (result.error) {
              resultsText += `   Error: ${result.error}\n`;
            }
            if (result.fieldsPopulated) {
              resultsText += `   Fields Populated: ${result.fieldsPopulated}\n`;
            }
          });
        } else {
          resultsText += `\nResults: ${JSON.stringify(data.results, null, 2)}`;
        }
        
        setResult(resultsText);
      } else {
        setResult(`❌ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setResult(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-6xl">
      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('washington-brown')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'washington-brown'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Washington Brown Calculator
          </button>
          <button
            onClick={() => setActiveTab('sheets')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sheets'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Sheets Population
          </button>
        </nav>
      </div>

      {/* Sheets Population Tab */}
      {activeTab === 'sheets' && (
        <>
          <h1 className="text-3xl font-bold mb-2">Test Google Sheets Population</h1>
          <p className="text-gray-600 mb-6">
            Standalone test page for copying a folder and populating Google Sheets. 
            This will copy a folder (from source to destination) and populate the "Autofill data" tab in all Google Sheets found in the new folder.
          </p>
          
          <div className="space-y-6 mb-6">
        <div>
          <label className="block mb-2 font-semibold">Source Folder ID (to copy from):</label>
          <input
            type="text"
            value={sourceFolderId}
            onChange={(e) => setSourceFolderId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter source folder ID"
          />
          <p className="text-sm text-gray-500 mt-1">
            Default: Master Template folder. Copy from Google Drive URL.
          </p>
        </div>

        <div>
          <label className="block mb-2 font-semibold">Destination Parent Folder ID:</label>
          <input
            type="text"
            value={destinationParentFolderId}
            onChange={(e) => setDestinationParentFolderId(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Enter destination parent folder ID"
          />
          <p className="text-sm text-gray-500 mt-1">
            Default: Properties folder. Where the new folder will be created.
          </p>
        </div>

        <div>
          <label className="block mb-2 font-semibold">New Folder Name:</label>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., Test 1, Test 2"
          />
          <p className="text-sm text-gray-500 mt-1">
            Name for the new copied folder.
          </p>
        </div>


        <div>
          <label className="block mb-2 font-semibold">Form Data (JSON - edit as needed):</label>
          <p className="text-sm text-gray-500 mb-2">
            Depreciation values captured from Washington Brown will be automatically added to formData.depreciation
          </p>
          <textarea
            value={JSON.stringify({ ...formData, depreciation }, null, 2)}
            onChange={(e) => {
              try {
                const parsed = JSON.parse(e.target.value);
                setFormData(parsed);
                if (parsed.depreciation) {
                  setDepreciation(parsed.depreciation);
                }
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
          disabled={loading || !sourceFolderId.trim() || !destinationParentFolderId.trim() || !newFolderName.trim()}
          className="px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-lg font-semibold"
        >
          {loading ? 'Copying & Populating...' : 'Copy Folder & Populate Sheets'}
        </button>
      </div>

      {result && (
        <div className="mt-6">
          <h2 className="text-xl font-semibold mb-2">Result:</h2>
          <div className="bg-gray-100 p-4 rounded overflow-auto text-sm whitespace-pre-wrap border">
            {result.split('\n').map((line, index) => {
              // Check if line contains a URL
              const urlMatch = line.match(/(https?:\/\/[^\s]+)/);
              if (urlMatch) {
                const parts = line.split(urlMatch[0]);
                return (
                  <div key={index}>
                    {parts[0]}
                    <a 
                      href={urlMatch[0]} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {urlMatch[0]}
                    </a>
                    {parts[1]}
                  </div>
                );
              }
              return <div key={index}>{line}</div>;
            })}
          </div>
        </div>
      )}

          <div className="mt-8 p-4 bg-blue-50 rounded">
            <h3 className="font-semibold mb-2">How to use:</h3>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Enter source folder ID (folder to copy from) - defaults to Master Template</li>
              <li>Enter destination parent folder ID (where new folder will be created) - defaults to Properties folder</li>
              <li>Enter new folder name (e.g., "Test 1", "Test 2")</li>
              <li>Edit the form data JSON if needed (default values are provided)</li>
              <li>Click "Copy Folder & Populate Sheets" - it will copy the folder and populate all sheets in it</li>
              <li>Check the "Autofill data" tab in each sheet in the new folder to verify the values</li>
            </ol>
          </div>
        </>
      )}

      {/* Washington Brown Tab */}
      {activeTab === 'washington-brown' && (
        <div>
          {/* Property Details Summary */}
          <div className="mb-6 p-6 bg-gray-50 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Address</label>
                <p className="text-xl font-semibold text-gray-900">
                  {formData.address?.propertyAddress || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Total Cost</label>
                <p className="text-xl font-semibold text-gray-900">
                  {formData.purchasePrice?.totalPrice 
                    ? `$${parseInt(formData.purchasePrice.totalPrice).toLocaleString()}`
                    : 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Year Built</label>
                <p className="text-xl font-semibold text-gray-900">
                  {formData.propertyDescription?.yearBuilt || 'Not provided'}
                </p>
              </div>
              <div>
                <label className="block text-base font-medium text-gray-700 mb-2">Land Registration *</label>
                <p className="text-xl font-semibold text-gray-900">
                  {formData.propertyDescription?.landRegistration || 'Not provided'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Washington Brown Widget */}
          <div className="mb-20">
            <iframe
              ref={iframeRef}
              src={buildWBUrl()}
              style={{ width: '100%', height: '800px', border: 0, overflow: 'auto' }}
              title="Washington Brown Depreciation Calculator"
            />
          </div>

          {/* Manual Depreciation Entry Fields */}
          <div className="p-4 bg-blue-50 rounded border border-blue-200">
            <h3 className="text-lg font-semibold mb-3">Depreciation Values - Diminishing Value</h3>
            <p className="text-sm text-gray-600 mb-4">
              Paste the results table below. Diminishing Value amounts will be automatically extracted:
            </p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Paste Results Table:</label>
              <textarea
                placeholder="Paste the entire table here, for example:&#10;Year 1	$10,000	$6,000&#10;Year 2	$7,000	$6,000&#10;..."
                onChange={(e) => {
                  const pastedText = e.target.value;
                  
                  // Parse the table to extract Diminishing Value amounts
                  const lines = pastedText.split('\n');
                  const parsedDepreciation: {[key: string]: string} = {};
                  
                  lines.forEach((line) => {
                    // Match lines like "Year 1	$10,000	$6,000" or "Year 1    $10,000    $6,000"
                    const yearMatch = line.match(/Year\s+(\d+)/i);
                    if (yearMatch) {
                      const year = parseInt(yearMatch[1]);
                      if (year >= 1 && year <= 10) {
                        // Extract dollar amounts from the line
                        const amounts = line.match(/\$[\d,]+/g);
                        if (amounts && amounts.length > 0) {
                          // First dollar amount is Diminishing Value
                          const diminishingValue = amounts[0].replace(/[$,]/g, ''); // Remove $ and commas
                          parsedDepreciation[`year${year}`] = diminishingValue;
                        }
                      }
                    }
                  });
                  
                  // Update depreciation if we found any values
                  if (Object.keys(parsedDepreciation).length > 0) {
                    setDepreciation(parsedDepreciation);
                    setFormData((prev: any) => ({
                      ...prev,
                      depreciation: parsedDepreciation,
                    }));
                  }
                }}
                className="w-full p-2 border rounded text-sm font-mono"
                rows={6}
              />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => (
                <div key={year}>
                  <label className="block text-sm font-medium mb-1">Year {year}</label>
                  <input
                    type="number"
                    value={depreciation[`year${year}`] || ''}
                    onChange={(e) => {
                      const newDepreciation = {
                        ...depreciation,
                        [`year${year}`]: e.target.value,
                      };
                      setDepreciation(newDepreciation);
                      setFormData((prev: any) => ({
                        ...prev,
                        depreciation: newDepreciation,
                      }));
                    }}
                    className="w-full p-2 border rounded text-sm"
                    placeholder="0"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
