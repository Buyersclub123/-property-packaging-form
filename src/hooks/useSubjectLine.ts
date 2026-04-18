import { useEffect, useRef } from 'react';
import { useFormStore } from '@/store/formStore';
import { DwellingType } from '@/types/form';

const DWELLING_TYPE_DISPLAY: Record<string, string> = {
  unit: 'Unit',
  townhouse: 'Townhouse',
  villa: 'Villa',
  house: 'House',
  dualkey: 'Dual-key',
  duplex: 'Duplex',
  multidwelling: 'Multi-dwelling',
  block_of_units: 'Block of Units',
};

function getDwellingTypeDisplay(key: DwellingType | null | undefined): string {
  if (!key) return '';
  return DWELLING_TYPE_DISPLAY[key] || '';
}

function stripLotUnitPrefix(address: string): string {
  return address
    .replace(/^Lot\s+[\d\w]+,\s*/i, '')
    .replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '')
    .trim();
}

export function useSubjectLine(): string {
  const formData = useFormStore((s) => s.formData);
  const updateFormData = useFormStore((s) => s.updateFormData);
  const prevRef = useRef<string>('');

  const { decisionTree, address, propertyDescription } = formData;

  const propertyType = decisionTree?.propertyType;
  const contractTypeSimplified = decisionTree?.contractTypeSimplified;
  const lotType = decisionTree?.lotType;
  const dwellingType = decisionTree?.dwellingType;

  const propertyAddress = address?.propertyAddress || '';
  const projectAddress = address?.projectAddress || '';
  const lotNumber = address?.lotNumber || '';

  const bedsPrimary = propertyDescription?.bedsPrimary || '0';
  const bedsSecondary = propertyDescription?.bedsSecondary || '0';

  useEffect(() => {
    const computed = computeSubjectLine();

    if (computed !== prevRef.current) {
      prevRef.current = computed;
      updateFormData({ subjectLine: computed });
    }
  }, [
    propertyType,
    contractTypeSimplified,
    lotType,
    dwellingType,
    propertyAddress,
    projectAddress,
    lotNumber,
    bedsPrimary,
    bedsSecondary,
  ]);

  function computeSubjectLine(): string {
    if (!propertyAddress) return '';

    const addressUpper = propertyAddress.toUpperCase();

    // Established
    if (propertyType === 'Established') {
      return `Property Review: ${addressUpper}`;
    }

    // New property
    if (propertyType === 'New') {
      const isProject = lotType === 'Multiple';
      const isSplitContract = contractTypeSimplified === 'Split Contract';
      const isSingleContract = contractTypeSimplified === 'Single Contract';

      if (isProject) {
        const projAddr = (projectAddress || propertyAddress);
        const cleanAddr = stripLotUnitPrefix(projAddr).toUpperCase();
        if (isSplitContract) {
          return `Property Review (H&L Project): ${cleanAddr}`;
        }
        if (isSingleContract) {
          return `Property Review (Single Part Contract Project): ${cleanAddr}`;
        }
        // Project but contract type not yet selected — fallback
        return `Property Review: ${addressUpper}`;
      }

      // Individual (H&L or SMSF)
      const totalBeds = parseInt(bedsPrimary, 10) + parseInt(bedsSecondary, 10);
      const dwellingDisplay = getDwellingTypeDisplay(dwellingType);

      // Build LOT + ADDRESS
      let lotAddress = addressUpper;
      if (lotNumber && !/LOT/i.test(propertyAddress)) {
        lotAddress = `LOT ${lotNumber.toUpperCase()} ${addressUpper}`;
      }

      // Only show full format if we have beds and dwelling type
      if (totalBeds > 0 && dwellingDisplay) {
        if (isSplitContract) {
          return `Property Review (H&L ${totalBeds}-bed ${dwellingDisplay}): ${lotAddress}`;
        }
        if (isSingleContract) {
          return `Property Review (Single Part Contract ${totalBeds}-bed ${dwellingDisplay}): ${lotAddress}`;
        }
      }

      // Partial data — fallback
      return `Property Review: ${addressUpper}`;
    }

    // Fallback for any other state
    return `Property Review: ${addressUpper}`;
  }

  return formData.subjectLine || prevRef.current || '';
}
