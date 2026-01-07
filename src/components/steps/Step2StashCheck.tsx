'use client';

import { useFormStore } from '@/store/formStore';
import { YesNo } from '@/types/form';

export function Step2StashCheck() {
  const { formData, updateRiskOverlays, stashData } = useFormStore();
  const { riskOverlays } = formData;

  const handleOverlayChange = (field: keyof typeof riskOverlays, value: YesNo) => {
    updateRiskOverlays({ [field]: value });
  };

  const handleDialogueChange = (field: keyof typeof riskOverlays, value: string) => {
    updateRiskOverlays({ [field]: value });
  };

  const setAllOverlaysToNo = () => {
    updateRiskOverlays({
      flood: 'No',
      bushfire: 'No',
      mining: 'No',
      otherOverlay: 'No',
      specialInfrastructure: 'No',
    });
  };

  // Auto-populate from Stash data if available
  if (stashData && !stashData.error) {
    if (stashData.floodRisk && riskOverlays.flood === 'No') {
      updateRiskOverlays({ flood: stashData.floodRisk });
    }
    if (stashData.bushfireRisk && riskOverlays.bushfire === 'No') {
      updateRiskOverlays({ bushfire: stashData.bushfireRisk });
    }
    if (stashData.zoning && !riskOverlays.zoning) {
      updateRiskOverlays({ zoning: stashData.zoning });
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Property Risk Overlays</h2>
      <p className="text-gray-600 mb-6">
        Review risk overlays from Stash Property. You can override any values if further analysis indicates otherwise.
      </p>

      {/* Bulk Action */}
      <div className="mb-6 flex justify-end">
        <button
          onClick={setAllOverlaysToNo}
          className="btn-secondary text-sm"
        >
          Set All Overlays to No
        </button>
      </div>

      <div className="space-y-6">
        {/* Zoning */}
        <div>
          <label className="label-field">Zoning</label>
          <input
            type="text"
            value={riskOverlays.zoning || stashData?.zoning || ''}
            onChange={(e) => updateRiskOverlays({ zoning: e.target.value })}
            className="input-field"
            placeholder="Auto-populated from Stash"
          />
        </div>

        {/* Flood */}
        <div>
          <label className="label-field">Flood</label>
          <div className="flex gap-4 items-start">
            <select
              value={riskOverlays.flood}
              onChange={(e) => handleOverlayChange('flood', e.target.value as YesNo)}
              className="input-field w-32"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            {riskOverlays.flood === 'Yes' && (
              <input
                type="text"
                value={riskOverlays.floodDialogue || ''}
                onChange={(e) => handleDialogueChange('floodDialogue', e.target.value)}
                placeholder="Dialogue text (appears after 'Yes - ')"
                className="input-field flex-1"
              />
            )}
          </div>
          {stashData?.floodRisk && (
            <p className="text-xs text-gray-500 mt-1">
              Stash: {stashData.floodRisk} {stashData.flooding && `- ${stashData.flooding}`}
            </p>
          )}
        </div>

        {/* Bushfire */}
        <div>
          <label className="label-field">Bushfire</label>
          <div className="flex gap-4 items-start">
            <select
              value={riskOverlays.bushfire}
              onChange={(e) => handleOverlayChange('bushfire', e.target.value as YesNo)}
              className="input-field w-32"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            {riskOverlays.bushfire === 'Yes' && (
              <input
                type="text"
                value={riskOverlays.bushfireDialogue || ''}
                onChange={(e) => handleDialogueChange('bushfireDialogue', e.target.value)}
                placeholder="Dialogue text (appears after 'Yes - ')"
                className="input-field flex-1"
              />
            )}
          </div>
          {stashData?.bushfireRisk && (
            <p className="text-xs text-gray-500 mt-1">
              Stash: {stashData.bushfireRisk} {stashData.bushfire && `- ${stashData.bushfire}`}
            </p>
          )}
        </div>

        {/* Mining (Manual) */}
        <div>
          <label className="label-field">Mining (Manual Identification)</label>
          <div className="flex gap-4 items-start">
            <select
              value={riskOverlays.mining}
              onChange={(e) => handleOverlayChange('mining', e.target.value as YesNo)}
              className="input-field w-32"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            {riskOverlays.mining === 'Yes' && (
              <input
                type="text"
                value={riskOverlays.miningDialogue || ''}
                onChange={(e) => handleDialogueChange('miningDialogue', e.target.value)}
                placeholder="Dialogue text (appears after 'Yes - ')"
                className="input-field flex-1"
              />
            )}
          </div>
        </div>

        {/* Other Overlay (Manual) */}
        <div>
          <label className="label-field">Other (Overlay) (Manual Identification)</label>
          <div className="flex gap-4 items-start">
            <select
              value={riskOverlays.otherOverlay}
              onChange={(e) => handleOverlayChange('otherOverlay', e.target.value as YesNo)}
              className="input-field w-32"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            {riskOverlays.otherOverlay === 'Yes' && (
              <input
                type="text"
                value={riskOverlays.otherOverlayDialogue || ''}
                onChange={(e) => handleDialogueChange('otherOverlayDialogue', e.target.value)}
                placeholder="Dialogue text (appears after 'Yes - ')"
                className="input-field flex-1"
              />
            )}
          </div>
        </div>

        {/* Special Infrastructure (Manual) */}
        <div>
          <label className="label-field">Special Infrastructure (Manual Identification)</label>
          <div className="flex gap-4 items-start">
            <select
              value={riskOverlays.specialInfrastructure}
              onChange={(e) => handleOverlayChange('specialInfrastructure', e.target.value as YesNo)}
              className="input-field w-32"
            >
              <option value="No">No</option>
              <option value="Yes">Yes</option>
            </select>
            {riskOverlays.specialInfrastructure === 'Yes' && (
              <input
                type="text"
                value={riskOverlays.specialInfrastructureDialogue || ''}
                onChange={(e) => handleDialogueChange('specialInfrastructureDialogue', e.target.value)}
                placeholder="Dialogue text (appears after 'Yes - ')"
                className="input-field flex-1"
              />
            )}
          </div>
        </div>

        {/* Due Diligence Acceptance */}
        <div className="pt-4 border-t">
          <label className="label-field">Due Diligence Acceptance *</label>
          <select
            value={riskOverlays.dueDiligenceAcceptance}
            onChange={(e) => handleOverlayChange('dueDiligenceAcceptance', e.target.value as YesNo)}
            className="input-field"
            required
          >
            <option value="No">No</option>
            <option value="Yes">Yes</option>
          </select>
          {riskOverlays.dueDiligenceAcceptance === 'No' && (
            <p className="text-red-600 text-sm mt-2">
              ⚠️ Submission will be blocked if Due Diligence Acceptance is No
            </p>
          )}
        </div>
      </div>
    </div>
  );
}







