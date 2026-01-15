'use client';

import { useState } from 'react';

export default function TestProximityPage() {
  const [propertyAddress, setPropertyAddress] = useState('');
  const [chatGPTInput, setChatGPTInput] = useState('');
  const [proximity, setProximity] = useState('');
  const [whyThisProperty, setWhyThisProperty] = useState('');
  const [investmentHighlights, setInvestmentHighlights] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCallingChatGPT, setIsCallingChatGPT] = useState(false);
  const [isCallingGeoapify, setIsCallingGeoapify] = useState(false);
  const [isTestingAirports, setIsTestingAirports] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Call ChatGPT Property Summary Tool
   * Gets both proximity and "Why this Property" data
   */
  const handleCallChatGPT = async () => {
    if (!propertyAddress.trim()) {
      setError('Please enter a property address first');
      return;
    }

    setIsCallingChatGPT(true);
    setError(null);

    try {
      const response = await fetch('/api/chatgpt/property-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyAddress: propertyAddress.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Set the raw ChatGPT output for manual editing if needed
        setChatGPTInput(data.fullResponse || '');
        // Set proximity (will need distance calculation)
        setProximity(data.proximity || '');
        // Set "Why this Property"
        setWhyThisProperty(data.whyThisProperty || '');
        
        // Auto-calculate distances if proximity data exists
        if (data.proximity) {
          await handleGenerateProximity(data.proximity);
        }
      } else {
        throw new Error(data.error || 'Failed to get property summary');
      }
    } catch (err) {
      console.error('Error calling ChatGPT:', err);
      setError(err instanceof Error ? err.message : 'Failed to call ChatGPT');
    } finally {
      setIsCallingChatGPT(false);
    }
  };

  /**
   * Test airports endpoint only
   */
  const handleTestAirports = async () => {
    if (!propertyAddress.trim()) {
      setError('Please enter a property address first');
      return;
    }

    setIsTestingAirports(true);
    setError(null);

    try {
      const response = await fetch('/api/geoapify/test-airports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyAddress: propertyAddress.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProximity(data.airports || '');
      } else {
        throw new Error(data.error || 'Failed to get airports');
      }
    } catch (err) {
      console.error('Error testing airports:', err);
      setError(err instanceof Error ? err.message : 'Failed to test airports');
    } finally {
      setIsTestingAirports(false);
    }
  };

  /**
   * Call Geoapify Places API directly
   * Gets proximity data using Geoapify (replaces ChatGPT + backend workflow)
   */
  const handleCallGeoapify = async () => {
    if (!propertyAddress.trim()) {
      setError('Please enter a property address first');
      return;
    }

    setIsCallingGeoapify(true);
    setError(null);

    try {
      const response = await fetch('/api/geoapify/proximity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          propertyAddress: propertyAddress.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API error: ${errorData.error || response.statusText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setProximity(data.proximity || '');
      } else {
        throw new Error(data.error || 'Failed to get proximity data');
      }
    } catch (err) {
      console.error('Error calling Geoapify:', err);
      setError(err instanceof Error ? err.message : 'Failed to call Geoapify');
    } finally {
      setIsCallingGeoapify(false);
    }
  };

  /**
   * Automate proximity calculation (legacy - uses ChatGPT + backend)
   * 1. Takes address + amenity list
   * 2. Send to backend API
   * 3. Display formatted results with distances
   * API: https://amenity-distance-backend.onrender.com/api/distance
   */
  const handleGenerateProximity = async (inputText?: string) => {
    const textToUse = inputText || chatGPTInput.trim();
    
    if (!textToUse) {
      setError('Please paste the ChatGPT output first or call ChatGPT');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('https://amenity-distance-backend.onrender.com/api/distance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: textToUse,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      // The API returns: { result: "Formatted proximity output text..." }
      if (data.result) {
        setProximity(data.result);
      } else {
        throw new Error('API response format unexpected');
      }
    } catch (err) {
      console.error('Error generating proximity:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate proximity data');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyProximity = async () => {
    try {
      await navigator.clipboard.writeText(proximity);
    } catch (error) {
      console.error('Copy failed', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold mb-6">Proximity Automation Test</h2>
            
            {/* Property Address Input */}
            <div className="mb-6 pb-4 border-b">
              <label className="label-field mb-2">
                Step 1: Enter Property Address *
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Enter the property address. Use "Get Proximity (Geoapify)" for proximity data, or "Get 'Why this Property' (ChatGPT)" for investment reasons.
              </p>
              <input
                type="text"
                value={propertyAddress}
                onChange={(e) => setPropertyAddress(e.target.value)}
                placeholder="17 Grand Parade, Parafield Gardens SA 5107"
                className="input-field mb-3"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCallGeoapify}
                  disabled={isCallingGeoapify || !propertyAddress.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isCallingGeoapify || !propertyAddress.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  {isCallingGeoapify ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Getting Proximity...
                    </span>
                  ) : (
                    'Get Proximity (Geoapify)'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleTestAirports}
                  disabled={isTestingAirports || !propertyAddress.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isTestingAirports || !propertyAddress.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                >
                  {isTestingAirports ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Testing Airports...
                    </span>
                  ) : (
                    'Test Current Issue'
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCallChatGPT}
                  disabled={isCallingChatGPT || !propertyAddress.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isCallingChatGPT || !propertyAddress.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  {isCallingChatGPT ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calling ChatGPT...
                    </span>
                  ) : (
                    'Get "Why this Property" (ChatGPT)'
                  )}
                </button>
              </div>
            </div>

            {/* Manual ChatGPT Input (Optional) */}
            <div className="mb-6 pb-4 border-b">
              <label className="label-field mb-2">
                Step 2 (Optional): Paste ChatGPT Output Manually
              </label>
              <p className="text-sm text-gray-600 mb-2">
                Or paste the output from ChatGPT MyGPT "Property Summary Tool" manually.
              </p>
              <textarea
                value={chatGPTInput}
                onChange={(e) => setChatGPTInput(e.target.value)}
                placeholder="17 Grand Parade, Parafield Gardens SA 5107&#10;Little Stars Kindergarten&#10;Parafield Gardens High School&#10;..."
                className="input-field min-h-[100px] mb-3"
                spellCheck={false}
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateProximity()}
                  disabled={isGenerating || !chatGPTInput.trim()}
                  className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                    isGenerating || !chatGPTInput.trim()
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isGenerating ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Calculating Distances...
                    </span>
                  ) : (
                    'Calculate Distances Only'
                  )}
                </button>
              </div>
              {error && (
                <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Why This Property Section */}
              <div>
                <label className="label-field mb-2">
                  Why this Property? *
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Provide detailed reasons why this property is a good investment opportunity.
                  <br />
                  <span className="italic">Format: Each bullet point as "• **Heading** - Description" (all on one line)</span>
                </p>
                <textarea
                  value={whyThisProperty}
                  onChange={(e) => setWhyThisProperty(e.target.value)}
                  className="input-field min-h-[150px]"
                  placeholder="• **Location** - Prime location in growing suburb&#10;• **Growth Potential** - Strong capital growth expected&#10;• **Rental Yield** - Excellent rental yield of X%"
                  spellCheck={true}
                  required
                />
              </div>

              {/* Proximity Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label-field mb-0">
                    Step 3: Formatted Proximity Results (with distances) *
                  </label>
                  {proximity && (
                    <button
                      type="button"
                      onClick={handleCopyProximity}
                      className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Proximity results with distances and driving times (from Geoapify Places API).
                  <br />
                  <span className="text-xs text-gray-500">
                    Format: "Distance (time via car), Location" - sorted by distance
                  </span>
                </p>
                <textarea
                  value={proximity}
                  onChange={(e) => setProximity(e.target.value)}
                  className="input-field min-h-[200px]"
                  placeholder="Results will appear here after clicking 'Generate Proximity'..."
                  spellCheck={false}
                />
              </div>

              {/* Investment Highlights Section */}
              <div>
                <label className="label-field mb-2">
                  Investment Highlights *
                </label>
                <p className="text-sm text-gray-600 mb-2">
                  Key investment highlights and infrastructure developments in the area.
                  <br />
                  <span className="italic">This data is typically sourced from Hotspotting Reports (updated quarterly)</span>
                </p>
                <textarea
                  value={investmentHighlights}
                  onChange={(e) => setInvestmentHighlights(e.target.value)}
                  className="input-field min-h-[150px]"
                  placeholder="• Major infrastructure projects&#10;• Population growth trends&#10;• Economic development initiatives&#10;• Transport improvements"
                  spellCheck={true}
                  required
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
