'use client';

/**
 * Step 5: Proximity & Content (Phase 3 - Refactored)
 * 
 * This component has been refactored to use three independent field components:
 * 1. ProximityField - Proximity/amenity data
 * 2. WhyThisPropertyField - "Why This Property" content
 * 3. InvestmentHighlightsField - Investment highlights/hotspotting reports
 * 
 * Phase 3: Manual paste functionality only
 * Phase 4: Will add automation features (auto-run, AI generation, sheet lookup)
 */

import { useState } from 'react';
import { useFormStore } from '@/store/formStore';
import { ProximityField } from './step5/ProximityField';
import { WhyThisPropertyField } from './step5/WhyThisPropertyField';
import { InvestmentHighlightsField } from './step5/InvestmentHighlightsField';

export function Step5Proximity() {
  const { formData, updateFormData } = useFormStore();
  const { contentSections, address, proximityData, earlyProcessing, editMode, ghlRecordId } = formData;
  const isEditMode = editMode === true || !!ghlRecordId;
  
  // Use form store state instead of local state
  const contentReviewed = contentSections?.contentReviewed || false;

  // Use early processing data ONLY if user hasn't edited the field yet
  // Once contentSections.proximity exists, it means user has edited it - don't overwrite!
  const proximityValue = contentSections?.proximity !== undefined && contentSections?.proximity !== null
    ? contentSections.proximity  // User has edited - use their value
    : (earlyProcessing?.proximity?.data || proximityData || '');  // No user edits yet - use early processing
  
  const whyThisPropertyValue = contentSections?.whyThisProperty || 
                               earlyProcessing?.whyThisProperty?.data || 
                               '';

  const handleContentReviewChange = (checked: boolean) => {
    // Update form store instead of local state
    const updates: any = { 
      contentSections: { 
        ...contentSections,
        contentReviewed: checked, // Store checkbox state
      } 
    };
    
    // If checked, add carriage return to fields (after content populates)
    if (checked) {
      // Add space to empty fields for validation
      if (!proximityValue || proximityValue.trim() === '') {
        updates.contentSections.proximity = ' ';
      } else {
        // Add carriage return to existing content
        updates.contentSections.proximity = proximityValue + '\n';
      }
      
      if (!whyThisPropertyValue || whyThisPropertyValue.trim() === '') {
        updates.contentSections.whyThisProperty = ' ';
      } else {
        // Add carriage return to existing content
        updates.contentSections.whyThisProperty = whyThisPropertyValue + '\n';
      }
      
      if (!contentSections?.investmentHighlights || contentSections.investmentHighlights.trim() === '') {
        updates.contentSections.investmentHighlights = ' ';
      } else {
        // Add carriage return to existing content
        updates.contentSections.investmentHighlights = contentSections.investmentHighlights + '\n';
      }
    }
    
    updateFormData(updates);
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Proximity & Content</h2>
      
      <div className="space-y-8">
        {/* Component 1: Investment Highlights */}
        <InvestmentHighlightsField
          value={contentSections?.investmentHighlights || ''}
          onChange={(value) => updateFormData({
            contentSections: {
              ...contentSections,
              investmentHighlights: value
            }
          })}
          lga={address?.lga}
          suburb={address?.suburbName}
          state={address?.state}
          streetAddress={address?.propertyAddress}
          userEmail="unknown"
        />

        {/* Component 2: Why This Property */}
        <WhyThisPropertyField
          value={whyThisPropertyValue}
          onChange={(value) => updateFormData({
            contentSections: {
              ...contentSections,
              whyThisProperty: value
            }
          })}
          suburb={address?.suburbName}
          lga={address?.lga}
          preFetchedData={earlyProcessing?.whyThisProperty?.data}
        />

        {/* Component 3: Proximity */}
        <ProximityField
          value={proximityValue}
          onChange={(value) => updateFormData({
            contentSections: {
              ...contentSections,
              proximity: value
            }
          })}
          address={address?.propertyAddress}
          preFetchedData={earlyProcessing?.proximity?.data || proximityData}
          earlyProcessing={earlyProcessing}
        />

        {/* Content Review Confirmation */}
        <div className="mt-8 p-4 bg-blue-50 border-2 border-blue-200 rounded-lg">
          <label className="flex items-start space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={contentReviewed}
              onChange={(e) => {
                // Store current scroll position to prevent unwanted page jump
                const scrollPosition = window.scrollY;
                e.stopPropagation();
                handleContentReviewChange(e.target.checked);
                // Restore scroll position after state update
                requestAnimationFrame(() => {
                  window.scrollTo({ top: scrollPosition, behavior: 'auto' });
                });
              }}
              className="mt-1 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              required={!isEditMode}
            />
            <span className="text-sm font-medium text-gray-900">
              I have reviewed all content sections above (Proximity & Amenities, Why This Property, and Investment Highlights) and confirm they are accurate and complete.{!isEditMode && ' *'}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}
