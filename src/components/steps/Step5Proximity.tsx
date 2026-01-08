'use client';

import { useState } from 'react';
import { useFormStore } from '@/store/formStore';

export function Step5Proximity() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address } = formData;
  
  const [proximity, setProximity] = useState(contentSections?.proximity || '');
  const [whyThisProperty, setWhyThisProperty] = useState(contentSections?.whyThisProperty || '');
  const [investmentHighlights, setInvestmentHighlights] = useState(contentSections?.investmentHighlights || '');

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
            className="input-field min-h-[200px]"
            placeholder={`${address?.propertyAddress || 'Property Address'}&#10;• 0.5 km (5 mins), Local Kindergarten&#10;• 1.2 km (10 mins), Primary School&#10;• 2.5 km (15 mins), Supermarket&#10;• 5.0 km (20 mins), Hospital`}
            spellCheck={true}
            required
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
            onChange={(e) => handleInvestmentHighlightsChange(e.target.value)}
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

