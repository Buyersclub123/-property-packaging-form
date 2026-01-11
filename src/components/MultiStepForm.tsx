'use client';

import { useState, useEffect, useRef } from 'react';
import { useFormStore } from '@/store/formStore';
import { StepIndicator } from './StepIndicator';
import { exportFormDataToExcel } from '@/lib/excelExport';
import { Step0AddressAndRisk } from './steps/Step0AddressAndRisk';
import { Step1DecisionTree } from './steps/Step1DecisionTree';
import { Step2PropertyDetails } from './steps/Step2PropertyDetails';
import { Step3MarketPerformance } from './steps/Step3MarketPerformance';
import { Step5Proximity } from './steps/Step5Proximity';
import { Step6FolderCreation } from './steps/Step6FolderCreation';
import { Step4Review } from './steps/Step4Review';
import { getUserEmail } from '@/lib/userAuth';

// Steps numbered starting from 1
const STEPS = [
  { number: 1, title: 'Address & Risk Check', component: Step0AddressAndRisk },
  { number: 2, title: 'Decision Tree', component: Step1DecisionTree },
  { number: 3, title: 'Property Details', component: Step2PropertyDetails },
  { number: 4, title: 'Market Performance', component: Step3MarketPerformance },
  { number: 5, title: 'Proximity & Content', component: Step5Proximity },
  { number: 6, title: 'Folder Creation', component: Step6FolderCreation },
];

interface MultiStepFormProps {
  userEmail: string;
}

function EditableEmail() {
  const { userEmail, setUserEmail, updateFormData } = useFormStore();
  const [isEditing, setIsEditing] = useState(false);
  const [emailValue, setEmailValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = useState(false);

  // Initialize email from store or localStorage
  useEffect(() => {
    setIsMounted(true);
    if (userEmail) {
      setEmailValue(userEmail);
      // Also set packager if not already set
      const currentPackager = useFormStore.getState().formData.packager;
      if (!currentPackager) {
        useFormStore.getState().updateFormData({ packager: userEmail });
      }
    } else if (typeof window !== 'undefined') {
      const storedEmail = getUserEmail();
      if (storedEmail) {
        setEmailValue(storedEmail);
        setUserEmail(storedEmail);
        // Also set packager
        useFormStore.getState().updateFormData({ packager: storedEmail });
      }
    }
  }, [userEmail]); // Removed setUserEmail and updateFormData from dependencies

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Basic email format validation (standard format check)
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const handleSave = () => {
    const trimmedEmail = emailValue.trim();
    
    if (!trimmedEmail) {
      setError('Email address is required');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      setError('Invalid email format');
      return;
    }

    // Save directly to localStorage with standard validation (bypass strict domain check)
    try {
      if (typeof window !== 'undefined') {
        const normalizedEmail = trimmedEmail.toLowerCase();
        localStorage.setItem('property-review-user-email', JSON.stringify(normalizedEmail));
        // Update form store
        setUserEmail(normalizedEmail);
        // Update packager field
        updateFormData({ packager: normalizedEmail });
        setError(null);
        setIsEditing(false);
      }
    } catch (err) {
      setError('Failed to save email');
    }
  };

  const handleCancel = () => {
    // Reset to current stored email
    const storedEmail = getUserEmail() || userEmail || '';
    setEmailValue(storedEmail);
    setError(null);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-2 flex-1">
        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700">Email:</span>
            <input
              ref={inputRef}
              type="email"
              value={emailValue}
              onChange={(e) => {
                setEmailValue(e.target.value);
                setError(null);
              }}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              className="text-sm text-gray-900 font-medium flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              placeholder="your.email@example.com"
            />
          </div>
          {error && (
            <span className="text-xs text-red-600 mt-0.5 ml-16">{error}</span>
          )}
        </div>
      </div>
    );
  }

  if (!isMounted) {
    return null; // Prevent hydration mismatch
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm font-semibold text-gray-700">Email:</span>
      <span className="text-sm text-gray-900 font-medium">{emailValue || 'No email set'}</span>
      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="text-sm text-blue-600 hover:text-blue-800 underline"
      >
        Edit
      </button>
    </div>
  );
}

export function MultiStepForm({ userEmail }: MultiStepFormProps) {
  const { currentStep, setCurrentStep, formData, setUserEmail, updateFormData } = useFormStore();
  
  // Store user email in form store for logging purposes
  useEffect(() => {
    setUserEmail(userEmail);
  }, [userEmail, setUserEmail]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const validationErrorRef = useRef<string | null>(null);
  
  // Wrapper to update both state and ref synchronously
  const setValidationErrorWithRef = (error: string | null) => {
    setValidationError(error);
    validationErrorRef.current = error;
  };

  useEffect(() => {
    // Manually hydrate persisted store on client mount (SSR-safe)
    if (typeof window !== 'undefined') {
      try {
        // Check if persist middleware is available
        if (useFormStore.persist && typeof useFormStore.persist.rehydrate === 'function') {
          useFormStore.persist.rehydrate();
        }
      } catch (error) {
        console.error('Error hydrating store:', error);
      } finally {
        // Always set hydrated to true so form can render
        setIsHydrated(true);
      }
    } else {
      // If window is undefined, we're on server - mark as hydrated anyway
      // (This shouldn't happen with ssr: false, but safety check)
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    // Safety check - ensure currentStep is valid after mount and hydration
    if (!isHydrated) return;
    
    try {
      const step = useFormStore.getState().currentStep;
      if (step < 1 || step > STEPS.length) {
        useFormStore.getState().setCurrentStep(1);
      }
    } catch (error) {
      console.error('Error initializing form store:', error);
      // Reset to step 1 on error
      try {
        useFormStore.getState().setCurrentStep(1);
      } catch (e) {
        console.error('Failed to reset step:', e);
      }
    }
  }, [isHydrated]);

  // Clear validation errors when step changes
  useEffect(() => {
    setValidationErrorWithRef(null);
  }, [currentStep]);

  // Don't render until hydrated to prevent hydration mismatch
  if (!isHydrated) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="text-center py-8">
          <p className="text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Safety check - ensure currentStep is valid
  const safeStep = currentStep >= 1 && currentStep <= STEPS.length ? currentStep : 1;
  const CurrentStepComponent = STEPS[safeStep - 1]?.component;
  
  if (!CurrentStepComponent) {
    return <div>Error: Step component not found</div>;
  }

  const validateStep = (step: number): boolean => {
    const { formData } = useFormStore.getState();
    const { decisionTree, address, riskOverlays, propertyDescription, purchasePrice, rentalAssessment, lots } = formData;

    setValidationErrorWithRef(null); // Clear previous errors
    validationErrorRef.current = null; // Clear ref

    // Helper function to check if value is empty
    const isEmpty = (value: string | null | undefined): boolean => {
      return !value || value.trim() === '';
    };

    switch (step) {
      case 1: // Address & Risk Check
        // Address is required
        if (!address?.propertyAddress || address.propertyAddress.trim() === '') {
          return false;
        }
        // All risk overlay fields are required (including zoning)
        if (!riskOverlays?.zoning || riskOverlays.zoning.trim() === '' ||
            !riskOverlays?.flood || !riskOverlays?.bushfire || !riskOverlays?.mining || 
            !riskOverlays?.otherOverlay || !riskOverlays?.specialInfrastructure || 
            !riskOverlays?.dueDiligenceAcceptance) {
          return false;
        }
        // Sourcer is required (must click "Continue with Packaging" first)
        if (!formData.sourcer || formData.sourcer.trim() === '') {
          setValidationErrorWithRef('Please click "Continue with Packaging" and fill in the Sourcer field before proceeding.');
          return false;
        }
        return true;

      case 2: // Decision Tree
        // All decision tree fields are required
        if (!decisionTree?.propertyType || !decisionTree?.status) {
          setValidationErrorWithRef('Property Type and Status are required.');
          return false;
        }
        // If Property Type is New, Contract Type and Lot Type are required
        if (decisionTree.propertyType === 'New') {
          if (!decisionTree?.contractType || !decisionTree?.lotType) {
            setValidationErrorWithRef('Contract Type and Lot Type are required for New properties.');
            return false;
          }
          // If Lot Type is Multiple, need at least one lot
          if (decisionTree.lotType === 'Multiple' && (!lots || lots.length === 0)) {
            setValidationErrorWithRef('At least one lot is required for Project properties.');
            return false;
          }
          // If Lot Type is Individual, Dual Occupancy is required
          if (decisionTree.lotType === 'Individual' && !decisionTree?.dualOccupancy) {
            setValidationErrorWithRef('Single or Dual Occupancy is required for H&L properties.');
            return false;
          }
          // For H&L, lot number must be provided OR "Not Applicable" must be selected
          if (decisionTree.lotType === 'Individual') {
            // User must either:
            // 1. Enter a lot number (lotNumber has a value), OR
            // 2. Select "Not Applicable" (lotNumberNotApplicable is true)
            const hasLotNumber = address?.lotNumber && address.lotNumber.trim() !== '';
            const hasNotApplicable = address?.lotNumberNotApplicable === true;
            if (!hasLotNumber && !hasNotApplicable) {
              setValidationErrorWithRef('Please enter a Lot Number or select "Not Applicable" for H&L properties.');
              return false;
            }
          }
        }
        
        // Unit numbers validation - applies to all property types except Projects
        if (decisionTree?.propertyType !== null && 
            !(decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Multiple')) {
          // hasUnitNumbers must be selected (true or false, not undefined)
          if (address?.hasUnitNumbers === undefined) {
            setValidationErrorWithRef('Please select "Yes" or "No" for "Does this property have unit numbers?".');
            return false;
          }
          
          // For unit numbers: if hasUnitNumbers is true, unitNumber must be provided
          if (address?.hasUnitNumbers === true) {
            if (!address?.unitNumber || address.unitNumber.trim() === '') {
              setValidationErrorWithRef('Please enter which unit(s) you are buying.');
              return false;
            }
          }
          
          // For dual occupancy: hasUnitNumbers must be true (it's auto-selected, but validate anyway)
          if (decisionTree?.dualOccupancy === 'Yes') {
            if (address?.hasUnitNumbers !== true) {
              setValidationErrorWithRef('Dual occupancy properties must have unit numbers. Please select "Yes" for unit numbers.');
              return false;
            }
            if (!address?.unitNumber || address.unitNumber.trim() === '') {
              setValidationErrorWithRef('Please enter which unit(s) you are buying for this dual occupancy property.');
              return false;
            }
          }
        }
        
        // Check for duplicate lot numbers (only for Projects with Multiple lots)
        if (decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Multiple' && lots && lots.length > 0) {
          const lotNumberCounts = new Map<string, number>();
          const emptyLotNumbers: number[] = [];
          
          lots.forEach((lot, index) => {
            if (!lot.lotNumber || lot.lotNumber.trim() === '') {
              emptyLotNumbers.push(index + 1);
            } else if (lot.lotNumber.toUpperCase() !== 'TBC') {
              const normalized = lot.lotNumber.trim();
              lotNumberCounts.set(normalized, (lotNumberCounts.get(normalized) || 0) + 1);
            }
          });
          
          // Check for empty lot numbers
          if (emptyLotNumbers.length > 0) {
            setValidationErrorWithRef(`Lot Number is required for all lots. Missing for Lot ${emptyLotNumbers.join(', ')}.`);
            return false;
          }
          
          // Check for duplicates
          const duplicates: string[] = [];
          lotNumberCounts.forEach((count, lotNumber) => {
            if (count > 1) {
              duplicates.push(lotNumber);
            }
          });
          
          if (duplicates.length > 0) {
            setValidationErrorWithRef(`Duplicate lot numbers detected: ${duplicates.join(', ')}. Each lot must have a unique number.`);
            return false;
          }
          
          // Check that all lots have Single or Dual Occupancy selected
          const missingOccupancy: number[] = [];
          lots.forEach((lot, index) => {
            if (!lot.singleOrDual || lot.singleOrDual.trim() === '') {
              missingOccupancy.push(index + 1);
            }
          });
          
          if (missingOccupancy.length > 0) {
            setValidationErrorWithRef(`Single or Dual Occupancy is required for all lots. Missing for Lot ${missingOccupancy.join(', ')}.`);
            return false;
          }
        }
        
        return true;

      case 3: // Property Details
        const isProject = decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Multiple';
        const isDualOccupancy = decisionTree?.dualOccupancy === 'Yes';
        const isHAndL = decisionTree?.propertyType === 'New' && decisionTree?.lotType === 'Individual';
        const isEstablished = decisionTree?.propertyType === 'Established';
        const isSingleContract = decisionTree?.contractType === '02_single_comms';
        
        // Validation for Projects (Multiple lots)
        if (isProject) {
          // Project Address is required at project level
          if (isEmpty(address?.projectAddress)) {
            setValidationErrorWithRef('Project Address is required.');
            return false;
          }
          
          // Comparable Sales is required at project level
          if (isEmpty(purchasePrice?.comparableSales)) {
            setValidationErrorWithRef('Comparable Sales (Shared) is required.');
            return false;
          }
          
          // Validate each lot
          if (!lots || lots.length === 0) {
            setValidationErrorWithRef('At least one lot is required.');
            return false;
          }
          
          for (let i = 0; i < lots.length; i++) {
            const lot = lots[i];
            const lotPropertyDescription = lot.propertyDescription || {};
            const lotPurchasePrice = lot.purchasePrice || {};
            const lotRentalAssessment = lot.rentalAssessment || {};
            const lotIsDualOccupancy = lot.singleOrDual === 'Yes';
            
            // Property Description - mandatory fields
            if (isEmpty(lotPropertyDescription?.bedsPrimary) || isEmpty(lotPropertyDescription?.bathPrimary) || 
                isEmpty(lotPropertyDescription?.garagePrimary) || isEmpty(lotPropertyDescription?.landSize) || 
                isEmpty(lotPropertyDescription?.title)) {
              setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Beds, Bath, Garage, Land Size, and Title are required.`);
              return false;
            }
            
            // Land Registration is required
            if (isEmpty(lotPropertyDescription?.landRegistration)) {
              setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Land Registration is required.`);
              return false;
            }
            
            // Build Size is required
            if (isEmpty(lotPropertyDescription?.buildSize)) {
              setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Build Size is required.`);
              return false;
            }
            
            // Body Corp Per Quarter is required if Title contains "strata" or "owners corp"
            const titleLower = lotPropertyDescription?.title?.toLowerCase() || '';
            if ((titleLower.includes('strata') || titleLower.includes('owners corp')) && 
                isEmpty(lotPropertyDescription?.bodyCorpPerQuarter)) {
              setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Body Corp Per Quarter is required for Strata/Owners Corp titles.`);
              return false;
            }
            
            // For dual occupancy, secondary beds, bath, and garage are required
            if (lotIsDualOccupancy) {
              if (isEmpty(lotPropertyDescription?.bedsSecondary) || isEmpty(lotPropertyDescription?.bathSecondary) || isEmpty(lotPropertyDescription?.garageSecondary)) {
                setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Secondary Beds, Bath, and Garage are required for Dual Occupancy.`);
                return false;
              }
            }
            
            // Purchase Price - For Single Contract: Total Price required, Otherwise: Land Price and Build Price required
            if (isSingleContract) {
              if (isEmpty(lotPurchasePrice?.totalPrice)) {
                setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Total Price is required for Single Contract.`);
                return false;
              }
            } else {
              if (isEmpty(lotPurchasePrice?.landPrice) || isEmpty(lotPurchasePrice?.buildPrice)) {
                setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Land Price and Build Price are required.`);
                return false;
              }
            }
            
            // Rental Assessment - Rent Appraisal From & To are required
            if (isEmpty(lotRentalAssessment?.rentAppraisalPrimaryFrom) || isEmpty(lotRentalAssessment?.rentAppraisalPrimaryTo)) {
              setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Rent Appraisal From and To (Primary) are required.`);
              return false;
            }
            
            // For dual occupancy, secondary rent appraisal is also required
            if (lotIsDualOccupancy) {
              if (isEmpty(lotRentalAssessment?.rentAppraisalSecondaryFrom) || isEmpty(lotRentalAssessment?.rentAppraisalSecondaryTo)) {
                setValidationErrorWithRef(`Lot ${lot.lotNumber || i + 1}: Rent Appraisal From and To (Secondary) are required for Dual Occupancy.`);
                return false;
              }
            }
          }
          
          return true;
        }
        
        // Property Description - mandatory fields
        if (isEmpty(propertyDescription?.bedsPrimary) || isEmpty(propertyDescription?.bathPrimary) || 
            isEmpty(propertyDescription?.garagePrimary) || isEmpty(propertyDescription?.landSize) || 
            isEmpty(propertyDescription?.title)) {
          setValidationError('Beds, Bath, Garage, Land Size, and Title are required.');
          return false;
        }
        
        // Year Built required for Established, Land Registration required for H&L/Projects
        if (decisionTree?.propertyType === 'Established') {
          if (isEmpty(propertyDescription?.yearBuilt)) {
            setValidationErrorWithRef('Year Built is required for Established properties.');
            return false;
          }
        } else if (decisionTree?.propertyType === 'New') {
          if (isEmpty(propertyDescription?.landRegistration)) {
            setValidationErrorWithRef('Land Registration is required for H&L/Project properties.');
            return false;
          }
        }
        
        // Build Size required for H&L
        if (isHAndL) {
          if (isEmpty(propertyDescription?.buildSize)) {
            setValidationErrorWithRef('Build Size is required for H&L properties.');
            return false;
          }
        }
        
        // Body Corp Per Quarter is required if Title contains "strata" or "owners corp"
        const titleLower = propertyDescription?.title?.toLowerCase() || '';
        if ((titleLower.includes('strata') || titleLower.includes('owners corp')) && 
            isEmpty(propertyDescription?.bodyCorpPerQuarter)) {
          return false;
        }
        
        // For dual occupancy, secondary beds, bath, and garage are required
        if (isDualOccupancy) {
          if (isEmpty(propertyDescription?.bedsSecondary) || isEmpty(propertyDescription?.bathSecondary) || isEmpty(propertyDescription?.garageSecondary)) {
            return false;
          }
        }
        
        // Purchase Price - mandatory fields
        // Asking and Asking Text only required for Established
        if (decisionTree?.propertyType === 'Established') {
          if (isEmpty(purchasePrice?.asking) || isEmpty(purchasePrice?.askingText) || isEmpty(purchasePrice?.comparableSales)) {
            setValidationErrorWithRef('Asking, Asking Text, and Comparable Sales are required for Established properties.');
            return false;
          }
        }
        
        // For H&L: For Single Contract: Total Price required, Otherwise: Land Price and Build Price required
        if (isHAndL) {
          if (isSingleContract) {
            if (isEmpty(purchasePrice?.totalPrice)) {
              setValidationErrorWithRef('Total Price is required for Single Contract (H&L).');
              return false;
            }
          } else {
            // For H&L (not Single Contract), Land Price, Build Price, and Comparable Sales are required
            if (isEmpty(purchasePrice?.landPrice) || isEmpty(purchasePrice?.buildPrice) || isEmpty(purchasePrice?.comparableSales)) {
              setValidationErrorWithRef('Land Price, Build Price, and Comparable Sales are required for H&L properties.');
              return false;
            }
          }
        } else {
          // For Projects, only Comparable Sales is required
          if (isEmpty(purchasePrice?.comparableSales)) {
            setValidationErrorWithRef('Comparable Sales is required.');
            return false;
          }
        }
        
        // Acceptable Acquisition From & To are required for Established
        if (decisionTree?.propertyType === 'Established') {
          if (isEmpty(purchasePrice?.acceptableAcquisitionFrom) || isEmpty(purchasePrice?.acceptableAcquisitionTo)) {
            setValidationErrorWithRef('Acceptable Acquisition From and To are required for Established properties.');
            return false;
          }
        }
        
        // Rental Assessment - mandatory fields
        // Occupancy only required for Established properties
        if (isEstablished) {
          if (isEmpty(rentalAssessment?.occupancyPrimary)) {
            setValidationErrorWithRef('Occupancy is required for Established properties.');
            return false;
          }
          
          // If Primary Occupancy is Tenanted, Current Rent and Expiry are required
          if (rentalAssessment?.occupancyPrimary === 'tenanted') {
            if (isEmpty(rentalAssessment?.currentRentPrimary)) {
              setValidationErrorWithRef('Current Rent (Primary) is required when Occupancy (Primary) is "Tenanted".');
              return false;
            }
            // Expiry must be either TBC or have a valid format (month/year or partial)
            const expiryPrimary = rentalAssessment?.expiryPrimary || '';
            const isValidExpiryPrimary = expiryPrimary.toUpperCase() === 'TBC' || 
                                         expiryPrimary.match(/^[A-Za-z]+\s+\d{4}$/) !== null || // "October 2025"
                                         (expiryPrimary.trim().endsWith(' ') && expiryPrimary.trim().length > 0) || // "October "
                                         (expiryPrimary.trim().startsWith(' ') && /^\s+\d{4}$/.test(expiryPrimary)); // " 2025"
            if (isEmpty(expiryPrimary) || !isValidExpiryPrimary) {
                setValidationErrorWithRef('Expiry (Primary) must be "TBC" or have both month and year selected when Occupancy (Primary) is "Tenanted".');
              return false;
            }
          }
          
          // For dual occupancy, if Secondary Occupancy is Tenanted, secondary rent and expiry are also required (independent check)
          if (isDualOccupancy && rentalAssessment?.occupancySecondary === 'tenanted') {
            if (isEmpty(rentalAssessment?.currentRentSecondary)) {
              setValidationErrorWithRef('Current Rent (Secondary) is required when Occupancy (Secondary) is "Tenanted".');
              return false;
            }
            const expirySecondary = rentalAssessment?.expirySecondary || '';
            const isValidExpirySecondary = expirySecondary.toUpperCase() === 'TBC' || 
                                          expirySecondary.match(/^[A-Za-z]+\s+\d{4}$/) !== null || // "October 2025"
                                          (expirySecondary.trim().endsWith(' ') && expirySecondary.trim().length > 0) || // "October "
                                          (expirySecondary.trim().startsWith(' ') && /^\s+\d{4}$/.test(expirySecondary)); // " 2025"
            if (isEmpty(expirySecondary) || !isValidExpirySecondary) {
              setValidationErrorWithRef('Expiry (Secondary) must be "TBC" or have both month and year selected when Occupancy (Secondary) is "Tenanted".');
              return false;
            }
          }
        }
        
        // Rent Appraisal From & To are required for all property types
        if (isEmpty(rentalAssessment?.rentAppraisalPrimaryFrom) || isEmpty(rentalAssessment?.rentAppraisalPrimaryTo)) {
          setValidationError('Rent Appraisal From and To (Primary) are required.');
          return false;
        }
        
        // For dual occupancy, secondary rent appraisal is also required
        if (isDualOccupancy) {
          if (isEmpty(rentalAssessment?.rentAppraisalSecondaryFrom) || isEmpty(rentalAssessment?.rentAppraisalSecondaryTo)) {
            setValidationErrorWithRef('Rent Appraisal From and To (Secondary) are required for Dual Occupancy.');
            return false;
          }
        }
        
        return true;

      case 4: // Market Performance
        const { marketPerformance } = formData;
        
        // All market performance fields are required
        if (!marketPerformance) {
          setValidationError('Market Performance data is required. Please fill in all fields.');
          return false;
        }
        
        // Check if data has been saved (if forms were shown, they must save first)
        // If data exists but isSaved is not true, it means user needs to save manually entered data
        // BUT: if data was loaded from API (has all fields populated), treat as saved even if isSaved flag is missing
        const hasAllFields = marketPerformance.medianPriceChange3Months && 
                             marketPerformance.medianPriceChange1Year &&
                             marketPerformance.medianPriceChange3Year &&
                             marketPerformance.medianPriceChange5Year &&
                             marketPerformance.medianYield &&
                             marketPerformance.medianRentChange1Year &&
                             marketPerformance.rentalPopulation &&
                             marketPerformance.vacancyRate;
        
        // If all fields are populated but isSaved is false/undefined, treat as saved (data came from API)
        if (!marketPerformance.isSaved && !hasAllFields) {
          setValidationError('Please save the Market Performance data before proceeding. Click "Save Market Performance Data" button.');
          return false;
        }
        
        // Check if data needs verification (if data exists and links were shown, user must verify)
        // Only block if isVerified is explicitly false (user clicked "Check data" but hasn't verified yet)
        // If isVerified is undefined, allow progression (user hasn't clicked "Check data")
        // If isVerified is true, allow progression (user already verified)
        if (marketPerformance.isSaved && marketPerformance.isVerified === false) {
          setValidationErrorWithRef('You need to either confirm the data is fine or update it. Please click "Data is fine" or "Needs updating" button above.');
          return false;
        }
        
        // Check all required fields and list which ones are missing
        const requiredFieldsMap = [
          { value: marketPerformance.medianPriceChange3Months, name: 'Median price change - 3 months %' },
          { value: marketPerformance.medianPriceChange1Year, name: 'Median price change - 1 year %' },
          { value: marketPerformance.medianPriceChange3Year, name: 'Median price change - 3 year %' },
          { value: marketPerformance.medianPriceChange5Year, name: 'Median price change - 5 year %' },
          { value: marketPerformance.medianYield, name: 'Median yield %' },
          { value: marketPerformance.medianRentChange1Year, name: 'Median rent change - 1 year %' },
          { value: marketPerformance.rentalPopulation, name: 'Rental Population %' },
          { value: marketPerformance.vacancyRate, name: 'Vacancy Rate %' },
        ];
        
        // Check if any field is empty (allowing N/A as valid)
        const missingMarketFields = requiredFieldsMap
          .filter(field => {
            if (!field.value) return true;
            const trimmed = field.value.trim();
            return trimmed === '' || trimmed === '.';
          })
          .map(field => field.name);
        
        if (missingMarketFields.length > 0) {
          setValidationError(`Please fill in the following Market Performance fields: ${missingMarketFields.join(', ')}. You can use "N/A" if data is not available. IMPORTANT: If you entered data in the forms above, you must click "Save Market Performance Data" button first before proceeding.`);
          return false;
        }
        
        // Check if data has been saved (if forms were shown, data must be saved)
        if (!marketPerformance?.isSaved && marketPerformance?.isVerified === false) {
          setValidationError('Please click "Save Market Performance Data" button if you have entered or updated any data. This saves the data to the Google Sheet before proceeding.');
          return false;
        }
        
        return true;

      case 5: // Proximity & Content
        const { contentSections } = formData;
        
        // All content sections are required
        if (!contentSections) {
          setValidationError('Content sections are required. Please fill in all fields.');
          return false;
        }
        
        // Check if all required fields are filled
        if (!contentSections.proximity || contentSections.proximity.trim() === '') {
          setValidationError('Proximity information is required. Please fill in the proximity field.');
          return false;
        }
        
        if (!contentSections.whyThisProperty || contentSections.whyThisProperty.trim() === '') {
          setValidationError('"Why this Property?" is required. Please fill in this field.');
          return false;
        }
        
        if (!contentSections.investmentHighlights || contentSections.investmentHighlights.trim() === '') {
          setValidationError('Investment Highlights are required. Please fill in this field.');
          return false;
        }
        
        return true;


      default:
        return true;
    }
  };

  const canGoNext = () => {
    return validateStep(currentStep);
  };

  const canGoPrevious = () => {
    return currentStep > 1;
  };

  const handleNext = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    
    // Clear any previous validation errors
    setValidationErrorWithRef(null);
    
    // Check if form is valid
    if (!validateStep(currentStep)) {
      // Check if error was set (using ref which updates synchronously)
      if (!validationErrorRef.current) {
        // If validateStep didn't set a specific error message, use a generic one
        setValidationErrorWithRef('Please fill in all required fields before proceeding. Check the form for highlighted fields.');
      }
      
      // Find the first invalid field and scroll to it
      const firstInvalid = document.querySelector('input:invalid, select:invalid, textarea:invalid') as HTMLElement;
      if (firstInvalid) {
        firstInvalid.focus();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        // If no HTML5 invalid fields found, scroll to top of form to show error message
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    
    // Log if user proceeds with data > 30 days old without checking
    if (currentStep === 4) {
      const { marketPerformance, address } = formData;
      if (marketPerformance?.isSaved && 
          marketPerformance.isVerified === undefined && 
          marketPerformance.daysSinceLastCheck !== undefined &&
          marketPerformance.daysSinceLastCheck > 30 &&
          address?.suburbName && 
          address?.state) {
        try {
          await fetch('/api/market-performance/log-proceeded', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              suburbName: address.suburbName,
              state: address.state,
              daysSinceLastCheck: marketPerformance.daysSinceLastCheck,
              changedBy: userEmail || 'Unknown',
            }),
          });
        } catch (error) {
          console.error('Error logging proceeded without check:', error);
          // Don't block progression if logging fails
        }
      }
    }
    
    // If on last step (Step 6), the form submission is handled in Step6FolderCreation component
    // Step 5 (Proximity & Content) is no longer the last step
    if (currentStep === STEPS.length) {
      // This should not happen now - Step 6 handles submission
      return;
    }
    
    // Legacy submission code (kept for reference, but Step 6 handles submission now)
    if (false && currentStep === 5) {
      // Combine selling agent fields before export
      const sellingAgentParts: string[] = [
        formData.sellingAgentName?.trim(),
        formData.sellingAgentEmail?.trim(),
        formData.sellingAgentMobile?.trim(),
      ].filter((item): item is string => !!item && item.length > 0);
      
      // Update formData with combined sellingAgent field
      if (sellingAgentParts.length > 0) {
        updateFormData({
          sellingAgent: sellingAgentParts.join(', '),
        });
      }
      
      // Get updated formData for export
      const finalFormData = {
        ...formData,
        sellingAgent: sellingAgentParts.length > 0 ? sellingAgentParts.join(', ') : formData.sellingAgent || '',
      };
      
      // Export to Excel for testing/auditing
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
      const filename = `property-form-data-${timestamp}.xlsx`;
      
      try {
        exportFormDataToExcel(finalFormData, filename);
        alert(`Form data exported to ${filename}\n\nCheck your Downloads folder.`);
        console.log('Form data exported:', finalFormData);
      } catch (error) {
        console.error('Error exporting form data:', error);
        alert('Error exporting form data. Check console for details.');
      }
      return;
    }
    
    if (currentStep < STEPS.length && setCurrentStep) {
      setCurrentStep(currentStep + 1);
      // Scroll to top when moving to next step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrevious = () => {
    if (canGoPrevious() && setCurrentStep) {
      // Clear validation errors when going back
      setValidationErrorWithRef(null);
      
      // If leaving Step 4, reset isVerified to undefined if it's false
      // This allows users to proceed without clicking "Check data" again when they return
      if (currentStep === 4) {
        const { marketPerformance } = formData;
        if (marketPerformance?.isVerified === false) {
          updateFormData({
            marketPerformance: {
              ...marketPerformance,
              isVerified: undefined,
            },
          });
        }
      }
      
      setCurrentStep(currentStep - 1);
      // Scroll to top when moving to previous step
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Step Indicators */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <StepIndicator
                step={step.number}
                title={step.title}
                isActive={currentStep === step.number}
                isCompleted={currentStep > step.number}
              />
              {index < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-1 mx-2 ${
                    currentStep > step.number ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Property Address - Display at top of each step */}
      {formData?.address?.propertyAddress && (
        <div className="mb-6 pb-4 border-b">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 flex-1">
              <span className="text-sm font-semibold text-gray-700">Property Address:</span>
              <span className="text-sm text-gray-900 font-medium">{formData.address.propertyAddress}</span>
            </div>
            {currentStep === 1 && <EditableEmail />}
          </div>
        </div>
      )}

      {/* Current Step Content */}
      <div className="mb-8">
        {CurrentStepComponent ? (
          <CurrentStepComponent key={`step-${safeStep}`} />
        ) : (
          <div>Error: Step component not found</div>
        )}
      </div>

      {/* Validation Error Message */}
      {validationError && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-800 text-sm font-medium">{validationError}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      {/* Hide Next/Previous on Step 1 - Step0AddressAndRisk has its own buttons */}
      {currentStep !== 1 && (
        <div className="flex justify-between items-center pt-6 border-t">
          <button
            onClick={handlePrevious}
            disabled={!canGoPrevious()}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>

          <div className="text-sm text-gray-500">
            Step {currentStep} of {STEPS.length}
          </div>

          {/* Submit button removed - submission only happens in Step6FolderCreation after folder is created */}
          {currentStep < STEPS.length && (
            <button onClick={handleNext} className="btn-primary">
              Next
            </button>
          )}
        </div>
      )}
    </div>
  );
}

