'use client';

import { useFormStore } from '@/store/formStore';
import { ProximitySection } from './step5/ProximitySection';
import { WhyThisPropertySection } from './step5/WhyThisPropertySection';
import { InvestmentHighlightsSection } from './step5/InvestmentHighlightsSection';

export function Step5Proximity() {
  const { formData } = useFormStore();
  const { address } = formData;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-2">Location & Content</h2>
        <p className="text-gray-600 mb-6">
          Review and generate content for {address?.propertyAddress || 'the property'}.
        </p>
      </div>
      
      <ProximitySection />
      
      <WhyThisPropertySection />
      
      <InvestmentHighlightsSection />
    </div>
  );
}
