'use client';

/**
 * Step 5: Property Content & Proximity (Phase 3 - Refactored)
 * 
 * This component has been refactored to use three independent field components:
 * 1. ProximityField - Proximity/amenity data
 * 2. WhyThisPropertyField - "Why This Property" content
 * 3. InvestmentHighlightsField - Investment highlights/hotspotting reports
 * 
 * Phase 3: Manual paste functionality only
 * Phase 4: Will add automation features (auto-run, AI generation, sheet lookup)
 */

import { useFormStore } from '@/store/formStore';
import { ProximityField } from './step5/ProximityField';
import { WhyThisPropertyField } from './step5/WhyThisPropertyField';
import { InvestmentHighlightsField } from './step5/InvestmentHighlightsField';

export function Step5Proximity() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address, proximityData } = formData;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Property Content & Proximity</h2>
      
      <div className="space-y-8">
        {/* Component 1: Proximity */}
        <ProximityField
          value={contentSections?.proximity || proximityData || ''}
          onChange={(value) => updateFormData({
            contentSections: {
              ...contentSections,
              proximity: value
            }
          })}
          address={address?.propertyAddress}
          preFetchedData={proximityData}
        />

        {/* Component 2: Why This Property */}
        <WhyThisPropertyField
          value={contentSections?.whyThisProperty || ''}
          onChange={(value) => updateFormData({
            contentSections: {
              ...contentSections,
              whyThisProperty: value
            }
          })}
          suburb={address?.suburbName}
        />

        {/* Component 3: Investment Highlights */}
        <InvestmentHighlightsField
          value={contentSections?.investmentHighlights || ''}
          onChange={(value) => updateFormData({
            contentSections: {
              ...contentSections,
              investmentHighlights: value
            }
          })}
          lga={address?.lga}
          state={address?.state}
        />
      </div>
    </div>
  );
}
