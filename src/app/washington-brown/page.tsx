'use client';

import { useState, useEffect, useRef } from 'react';

export default function WashingtonBrownPage() {
  const [depreciation, setDepreciation] = useState<{[key: string]: string}>({});
  const [wbMessage, setWbMessage] = useState<string>('Ready to calculate depreciation...');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const lastIframeUrlRef = useRef<string>('');

  // Property data - would typically come from form state or props
  // For now using sample data structure matching the form
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
      totalPrice: '600000',
    },
    propertyDescription: {
      yearBuilt: '2026',
      landRegistration: 'Registered',
    },
  });

  // Listen for postMessage from Washington Brown iframe
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      console.log('All messages received:', {
        origin: event.origin,
        data: event.data,
        type: typeof event.data
      });
      
      if (event.origin !== 'https://www.washingtonbrown.com.au') {
        console.log('Message ignored - origin mismatch:', event.origin);
        return;
      }
      
      console.log('Washington Brown message received:', event.data);
      setWbMessage(`Received data: ${JSON.stringify(event.data)}`);
      
      if (event.data && typeof event.data === 'object') {
        const depValues: {[key: string]: string} = {};
        
        for (let i = 1; i <= 10; i++) {
          const key = `year${i}`;
          if (event.data[key] || event.data[`Year ${i}`] || event.data[`depreciationYear${i}`]) {
            depValues[`year${i}`] = String(event.data[key] || event.data[`Year ${i}`] || event.data[`depreciationYear${i}`]);
          }
        }
        
        if (Object.keys(depValues).length > 0) {
          setDepreciation(depValues);
          setWbMessage(`✅ Captured ${Object.keys(depValues).length} depreciation years!`);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    
    const checkIframeUrl = () => {
      if (iframeRef.current) {
        try {
          const iframe = iframeRef.current;
          const currentUrl = iframe.contentWindow?.location.href || '';
          
          if (currentUrl && currentUrl !== lastIframeUrlRef.current) {
            console.log('Iframe URL changed:', currentUrl);
            lastIframeUrlRef.current = currentUrl;
            
            const url = new URL(currentUrl);
            const params = url.searchParams;
            const hash = url.hash;
            
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
              setWbMessage(`✅ Captured ${Object.keys(depValues).length} depreciation years from URL!`);
            }
          }
        } catch (error) {
          // Cross-origin restriction - expected
        }
      }
    };
    
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

  return (
    <div className="container mx-auto p-8 max-w-6xl">
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
                }}
                className="w-full p-2 border rounded text-sm"
                placeholder="0"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
