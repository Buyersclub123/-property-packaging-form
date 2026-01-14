'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step5Proximity() {
  const { formData, updateFormData, userEmail } = useFormStore();
  const { contentSections, address } = formData;
  
  const [proximity, setProximity] = useState(contentSections?.proximity || '');
  const [whyThisProperty, setWhyThisProperty] = useState(contentSections?.whyThisProperty || '');
  const [investmentHighlights, setInvestmentHighlights] = useState(contentSections?.investmentHighlights || '');
  const [investmentHighlightsLoading, setInvestmentHighlightsLoading] = useState(false);
  const [investmentHighlightsInfo, setInvestmentHighlightsInfo] = useState<{ found: boolean; dataSource?: string; daysSinceLastCheck?: number } | null>(null);
  const [savingInvestmentHighlights, setSavingInvestmentHighlights] = useState(false);

  const handleProximityChange = (value: string) => {
    setProximity(value);
    updateFormData({
      contentSections: {
        ...contentSections,
        proximity: value,
      },
    });
  };

  const handleWhyThisPropertyChange = (value: string) => {
    setWhyThisProperty(value);
    updateFormData({
      contentSections: {
        ...contentSections,
        whyThisProperty: value,
      },
    });
  };

  const handleInvestmentHighlightsChange = (value: string) => {
    setInvestmentHighlights(value);
    updateFormData({
      contentSections: {
        ...contentSections,
        investmentHighlights: value,
      },
    });
  };

  // Paste handlers to strip quotes that Excel adds when copying cells
  const handleWhyThisPropertyPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Remove leading/trailing quotes that Excel might add when copying cells
    // Handle both straight quotes (" ') and curly quotes (" " ' ')
    // Also trim whitespace that might be around quotes
    let cleaned = pastedText.trim();
    // Remove leading quotes (straight and curly)
    cleaned = cleaned.replace(/^["""''']+/, '');
    // Remove trailing quotes (straight and curly)
    cleaned = cleaned.replace(/["""''']+$/, '');
    // Final trim in case quotes were around whitespace
    cleaned = cleaned.trim();
    handleWhyThisPropertyChange(cleaned);
  };

  const handleProximityPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Remove leading/trailing quotes that Excel might add when copying cells
    // Handle both straight quotes (" ') and curly quotes (" " ' ')
    // Also trim whitespace that might be around quotes
    let cleaned = pastedText.trim();
    // Remove leading quotes (straight and curly)
    cleaned = cleaned.replace(/^["""''']+/, '');
    // Remove trailing quotes (straight and curly)
    cleaned = cleaned.replace(/["""''']+$/, '');
    // Final trim in case quotes were around whitespace
    cleaned = cleaned.trim();
    handleProximityChange(cleaned);
  };

  const handleInvestmentHighlightsPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    // Remove leading/trailing quotes that Excel might add when copying cells
    // Handle both straight quotes (" ') and curly quotes (" " ' ')
    // Also trim whitespace that might be around quotes
    let cleaned = pastedText.trim();
    // Remove leading quotes (straight and curly)
    cleaned = cleaned.replace(/^["""''']+/, '');
    // Remove trailing quotes (straight and curly)
    cleaned = cleaned.replace(/["""''']+$/, '');
    // Final trim in case quotes were around whitespace
    cleaned = cleaned.trim();
    handleInvestmentHighlightsChange(cleaned);
  };

  // DISABLED: Auto-lookup Investment Highlights functionality
  // This will be re-enabled later after email population is verified
  // useEffect(() => {
  //   const lookupInvestmentHighlights = async () => {
  //     if (!address?.lga || !address?.state) {
  //       return;
  //     }
  //
  //     // Only lookup if field is empty (don't overwrite user-entered data)
  //     const currentHighlights = contentSections?.investmentHighlights || '';
  //     if (currentHighlights && currentHighlights.trim() !== '') {
  //       return;
  //     }
  //
  //     setInvestmentHighlightsLoading(true);
  //     try {
  //       const response = await fetch('/api/investment-highlights/lookup', {
  //         method: 'POST',
  //         headers: { 'Content-Type': 'application/json' },
  //         body: JSON.stringify({
  //           lga: address.lga,
  //           state: address.state,
  //         }),
  //       });
  //
  //       if (!response.ok) {
  //         throw new Error('Failed to lookup investment highlights');
  //       }
  //
  //       const result = await response.json();
  //       
  //       if (result.found && result.data?.investmentHighlights) {
  //         setInvestmentHighlights(result.data.investmentHighlights);
  //         handleInvestmentHighlightsChange(result.data.investmentHighlights);
  //         setInvestmentHighlightsInfo({
  //           found: true,
  //           dataSource: result.data.dataSource,
  //           daysSinceLastCheck: result.daysSinceLastCheck,
  //         });
  //       } else {
  //         setInvestmentHighlightsInfo({ found: false });
  //       }
  //     } catch (error) {
  //       console.error('Error looking up investment highlights:', error);
  //       setInvestmentHighlightsInfo({ found: false });
  //     } finally {
  //       setInvestmentHighlightsLoading(false);
  //     }
  //   };
  //
  //   lookupInvestmentHighlights();
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [address?.lga, address?.state]); // Only run when LGA or state changes

  const handleSaveInvestmentHighlights = async () => {
    if (!address?.lga || !address?.state || !investmentHighlights || investmentHighlights.trim() === '') {
      return;
    }

    setSavingInvestmentHighlights(true);
    try {
      const response = await fetch('/api/investment-highlights/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lga: address.lga,
          state: address.state,
          investmentHighlights: investmentHighlights.trim(),
          dataSource: 'Manual Entry',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save investment highlights');
      }

      // Update info to show it's saved
      setInvestmentHighlightsInfo({
        found: true,
        dataSource: 'Manual Entry',
        daysSinceLastCheck: 0,
      });

      alert('Investment Highlights saved to Google Sheet successfully!');
    } catch (error) {
      console.error('Error saving investment highlights:', error);
      alert('Failed to save Investment Highlights. Please try again.');
    } finally {
      setSavingInvestmentHighlights(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Content Sections</h2>
      
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
            onChange={(e) => handleWhyThisPropertyChange(e.target.value)}
            onPaste={handleWhyThisPropertyPaste}
            className="input-field min-h-[150px]"
            placeholder="• **Location** - Prime location in growing suburb&#10;• **Growth Potential** - Strong capital growth expected&#10;• **Rental Yield** - Excellent rental yield of X%"
            spellCheck={true}
            required
          />
        </div>

        {/* Proximity Section */}
        <div>
          <label className="label-field mb-2">
            Proximity *
          </label>
          <p className="text-sm text-gray-600 mb-2">
            List nearby amenities with distance and travel time.
            <br />
            <span className="italic">Format: "• [DISTANCE] km ([TIME] mins), [AMENITY NAME]"</span>
            <br />
            <span className="text-xs text-gray-500">
              Include: 1x kindergarten, 3x schools, 2x supermarket, 2x hospitals, 1x train station, 1x bus stop, 1x beach, 1x airport, 1x closest capital city, 3x child day cares
            </span>
          </p>
          <textarea
            value={proximity}
            onChange={(e) => handleProximityChange(e.target.value)}
            onPaste={handleProximityPaste}
            className="input-field min-h-[200px]"
            placeholder={`${address?.propertyAddress || 'Property Address'}&#10;• 0.5 km (5 mins), Local Kindergarten&#10;• 1.2 km (10 mins), Primary School&#10;• 2.5 km (15 mins), Supermarket&#10;• 5.0 km (20 mins), Hospital`}
            spellCheck={true}
            required
          />
        </div>

        {/* Investment Highlights Section */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="label-field mb-0">
              Investment Highlights *
            </label>
            {/* DISABLED: Save to Google Sheet button - functionality disabled for now */}
            {false && investmentHighlights && investmentHighlights.trim() !== '' && (
              <button
                type="button"
                onClick={handleSaveInvestmentHighlights}
                disabled={savingInvestmentHighlights}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm"
              >
                {savingInvestmentHighlights ? 'Saving...' : 'Save to Google Sheet'}
              </button>
            )}
          </div>
          <p className="text-sm text-gray-600 mb-2">
            Key investment highlights and infrastructure developments in the area.
            <br />
            <span className="italic">This data is typically sourced from Hotspotting Reports (updated quarterly)</span>
          </p>
          {investmentHighlightsLoading && (
            <div className="p-2 bg-blue-50 rounded mb-2">
              <p className="text-sm text-blue-700">Looking up Investment Highlights data...</p>
            </div>
          )}
          {investmentHighlightsInfo?.found && (
            <div className="p-2 bg-green-50 rounded mb-2">
              <p className="text-sm text-green-700">
                ✓ Data loaded from Google Sheet
                {investmentHighlightsInfo.dataSource && ` (Source: ${investmentHighlightsInfo.dataSource})`}
                {investmentHighlightsInfo.daysSinceLastCheck !== undefined && (
                  <span className="text-xs"> • Last checked: {investmentHighlightsInfo.daysSinceLastCheck} days ago</span>
                )}
              </p>
            </div>
          )}
          {investmentHighlightsInfo?.found === false && address?.lga && (
            <div className="p-2 bg-yellow-50 rounded mb-2">
              <p className="text-sm text-yellow-700">
                No Investment Highlights data found for LGA: {address.lga}. You can enter data manually and save it to the Google Sheet.
              </p>
            </div>
          )}
          <textarea
            value={investmentHighlights}
            onChange={(e) => handleInvestmentHighlightsChange(e.target.value)}
            onPaste={handleInvestmentHighlightsPaste}
            className="input-field min-h-[150px]"
            placeholder="• Major infrastructure projects&#10;• Population growth trends&#10;• Economic development initiatives&#10;• Transport improvements"
            spellCheck={true}
            required
          />
        </div>
      </div>
    </div>
  );
}

