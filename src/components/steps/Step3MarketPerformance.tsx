'use client';

import { useState, useEffect, useMemo } from 'react';
import { useFormStore } from '@/store/formStore';
import { MarketPerformance } from '@/types/form';

const DATA_FRESHNESS_THRESHOLD_DAYS = 10; // Data is considered stale if older than 10 days

interface MarketPerformanceLookupResult {
  found: boolean;
  data?: {
    suburbName: string;
    state: string;
    dataSource: string;
    dateCollectedSPI: string;
    dateCollectedREI: string;
    medianPriceChange3Months: string;
    medianPriceChange1Year: string;
    medianPriceChange3Year: string;
    medianPriceChange5Year: string;
    medianYield: string;
    medianRentChange1Year: string;
    rentalPopulation: string;
    vacancyRate: string;
  };
  isMockData: boolean;
  daysSinceLastCheck?: number;
}

type Scenario = 'loading' | 'no-data' | 'mock-data' | 'stale-data' | 'fresh-data' | 'error';

export function Step3MarketPerformance() {
  const { formData, updateFormData, userEmail, setCurrentStep } = useFormStore();
  const { address, marketPerformance } = formData;
  
  // Generate smart URLs with suburb and state pre-populated
  // These use Google search to find the suburb profile page on each site
  const getSPIUrl = () => {
    const suburb = address.suburbName || '';
    const state = address.state || '';
    if (suburb && state) {
      // Google search: "https://www.smartpropertyinvestment.com.au suburb state"
      // This will show the suburb profile page as the first result
      return `https://www.google.com/search?q=${encodeURIComponent(`https://www.smartpropertyinvestment.com.au ${suburb} ${state}`)}`;
    }
    return 'https://www.smartpropertyinvestment.com.au';
  };
  
  const getREIUrl = () => {
    const suburb = address.suburbName || '';
    const state = address.state || '';
    if (suburb && state) {
      // Google search: "https://info.realestateinvestar.com.au suburb state"
      // This will show the suburb profile page as the first result
      return `https://www.google.com/search?q=${encodeURIComponent(`https://info.realestateinvestar.com.au ${suburb} ${state}`)}`;
    }
    return 'https://info.realestateinvestar.com.au/';
  };

  // Helper function to clean and validate numeric input (removes %, spaces, validates 2 decimals, allows N/A)
  const cleanNumericInput = (value: string, formatDecimals: boolean = true): string => {
    // If value is empty or just whitespace, return empty string (don't auto-fill .00)
    const trimmed = value.trim();
    if (trimmed === '' || trimmed === '.') {
      return '';
    }
    
    // Remove % signs and spaces for N/A checking (but preserve the original for partial matches)
    const cleanedForNA = trimmed.replace(/%/g, '').replace(/\s/g, '').toUpperCase();
    
    // Check for N/A patterns - allow partial while typing: "N", "N/", "NA", "N/A"
    const naPatterns = ['N', 'N/', 'NA', 'N/A'];
    const isNAPattern = naPatterns.some(pattern => cleanedForNA === pattern || cleanedForNA.startsWith(pattern));
    
    if (isNAPattern) {
      // If it's a complete N/A variant, return standardized "N/A"
      if (cleanedForNA === 'NA' || cleanedForNA === 'N/A') {
        return 'N/A';
      }
      // Allow partial typing - preserve input but normalize spaces and remove %
      // This allows user to type "N", "N/", "N/A" without the "/" being stripped
      return trimmed.replace(/%/g, '').replace(/\s+/g, '').toUpperCase();
    }
    
    // Remove % signs and spaces for numeric processing
    let cleaned = value.replace(/%/g, '').replace(/\s/g, '');
    
    // If after cleaning it's empty or just a decimal point, return empty
    if (cleaned === '' || cleaned === '.') {
      return '';
    }
    
    // Only allow numbers, decimal point, and negative sign
    cleaned = cleaned.replace(/[^\d.-]/g, '');
    
    // If after removing invalid chars it's empty, return empty
    if (cleaned === '' || cleaned === '.') {
      return '';
    }
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Format to 2 decimal places if formatDecimals is true
    if (formatDecimals) {
      if (parts.length === 1 && parts[0] !== '') {
        // No decimal point but has number - add .00
        cleaned = cleaned + '.00';
      } else if (parts.length === 2) {
        // Has decimal point - ensure 2 decimal places
        if (parts[0] === '' && parts[1] === '') {
          // Just a decimal point, return empty
          return '';
        } else if (parts[1].length === 0) {
          cleaned = parts[0] + '.00';
        } else if (parts[1].length === 1) {
          cleaned = parts[0] + '.' + parts[1] + '0';
        } else if (parts[1].length > 2) {
          cleaned = parts[0] + '.' + parts[1].substring(0, 2);
        }
      }
    } else {
      // Just limit to 2 decimal places without forcing format
      if (parts.length === 2 && parts[1].length > 2) {
        cleaned = parts[0] + '.' + parts[1].substring(0, 2);
      }
    }
    
    return cleaned;
  };
  
  const [scenario, setScenario] = useState<Scenario>('loading');
  const [lookupResult, setLookupResult] = useState<MarketPerformanceLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDataCollection, setShowDataCollection] = useState(false);
  const [showSPIForm, setShowSPIForm] = useState(false);
  const [showREIForm, setShowREIForm] = useState(false);
  const [showStaleDataLinks, setShowStaleDataLinks] = useState(false);
  const [dataVerified, setDataVerified] = useState(false); // Track if user has verified data (clicked "Data is fine" or "Needs updating")
  const [formData_SPI, setFormData_SPI] = useState({ confirmedFromSPI: false, priceChange3Year: '', priceChange5Year: '' });
  const [formData_REI, setFormData_REI] = useState({
    confirmedFromREI: false,
    priceChange3Months: '',
    priceChange1Year: '',
    medianYield: '',
    rentChange1Year: '',
    rentalPopulation: '',
    vacancyRate: '',
  });
  const [saving, setSaving] = useState(false);
  const [confirmSPIValid, setConfirmSPIValid] = useState(false);
  const [confirmREIValid, setConfirmREIValid] = useState(false);
  const [isMarketPerformanceAdditionalDialogueExpanded, setIsMarketPerformanceAdditionalDialogueExpanded] = useState<boolean>(false); // Collapsed by default as non-mandatory

  // Reset isVerified to undefined on mount if it's false (from previous session)
  // This allows progression without clicking "Check data" again when returning to this step
  useEffect(() => {
    const currentFormData = useFormStore.getState().formData;
    const existingMP = currentFormData.marketPerformance;
    // Only reset if isVerified is false and user hasn't clicked "Check data" on this visit
    if (existingMP?.isVerified === false && !showStaleDataLinks) {
      updateFormData({
        marketPerformance: {
          ...existingMP,
          isVerified: undefined,
        },
      });
    }
  }, []); // Run once on mount only

  // Helper function to calculate days since date
  const getDaysSinceDate = (dateString: string | undefined): number | null => {
    if (!dateString || dateString === 'Mock Data' || dateString === '') return null;
    try {
      const date = new Date(dateString);
      const now = new Date();
      return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    } catch {
      return null;
    }
  };

  // Helper function to get color class based on data age
  const getDataAgeColor = (days: number | null): string => {
    if (days === null) return 'bg-white'; // No data
    if (days < 7) return 'bg-green-50 border-green-300'; // Green: <7 days
    if (days < 30) return 'bg-yellow-50 border-yellow-300'; // Amber: 7-30 days
    return 'bg-red-50 border-red-300'; // Red: >30 days
  };

  // Calculate days since collection for SPI and REI
  const spiDaysSince = useMemo(() => {
    return lookupResult?.data?.dateCollectedSPI 
      ? getDaysSinceDate(lookupResult.data.dateCollectedSPI)
      : null;
  }, [lookupResult]);

  const reiDaysSince = useMemo(() => {
    return lookupResult?.data?.dateCollectedREI 
      ? getDaysSinceDate(lookupResult.data.dateCollectedREI)
      : null;
  }, [lookupResult]);

  // Pre-fill form fields when data exists
  useEffect(() => {
    if (lookupResult?.found && lookupResult.data && !showDataCollection) {
      // Pre-fill SPI form if data exists
      if (lookupResult.data.medianPriceChange3Year || lookupResult.data.medianPriceChange5Year) {
        setFormData_SPI(prev => ({
          ...prev,
          priceChange3Year: lookupResult.data!.medianPriceChange3Year || prev.priceChange3Year,
          priceChange5Year: lookupResult.data!.medianPriceChange5Year || prev.priceChange5Year,
        }));
      }
      // Pre-fill REI form if data exists
      if (lookupResult.data.medianPriceChange3Months || lookupResult.data.medianPriceChange1Year) {
        setFormData_REI(prev => ({
          ...prev,
          priceChange3Months: lookupResult.data!.medianPriceChange3Months || prev.priceChange3Months,
          priceChange1Year: lookupResult.data!.medianPriceChange1Year || prev.priceChange1Year,
          medianYield: lookupResult.data!.medianYield || prev.medianYield,
          rentChange1Year: lookupResult.data!.medianRentChange1Year || prev.rentChange1Year,
          rentalPopulation: lookupResult.data!.rentalPopulation || prev.rentalPopulation,
          vacancyRate: lookupResult.data!.vacancyRate || prev.vacancyRate,
        }));
      }
    }
  }, [lookupResult, showDataCollection]);

  // Check if market performance data is incomplete
  const isDataIncomplete = useMemo(() => {
    if (!marketPerformance) return true;
    
    // SPI fields (from smartpropertyinvestment.com.au)
    const hasSPI = !!(marketPerformance.medianPriceChange3Year && marketPerformance.medianPriceChange5Year);
    
    // REI fields (from realestateinvestar.com.au)
    const hasREI = !!(
      marketPerformance.medianPriceChange3Months &&
      marketPerformance.medianPriceChange1Year &&
      marketPerformance.medianYield &&
      marketPerformance.medianRentChange1Year &&
      marketPerformance.rentalPopulation &&
      marketPerformance.vacancyRate
    );
    
    return !hasSPI || !hasREI;
  }, [marketPerformance]);

  // Determine which forms need to be shown for incomplete data
  const needsSPIData = useMemo(() => {
    if (!marketPerformance) return true;
    return !marketPerformance.medianPriceChange3Year || !marketPerformance.medianPriceChange5Year;
  }, [marketPerformance]);

  const needsREIData = useMemo(() => {
    if (!marketPerformance) return true;
    return !(
      marketPerformance.medianPriceChange3Months &&
      marketPerformance.medianPriceChange1Year &&
      marketPerformance.medianYield &&
      marketPerformance.medianRentChange1Year &&
      marketPerformance.rentalPopulation &&
      marketPerformance.vacancyRate
    );
  }, [marketPerformance]);

  // Reset isVerified to undefined on mount if it's false but links aren't shown
  // This means user clicked "Check data" previously but navigated away
  // Allow them to proceed without clicking "Check data" again
  useEffect(() => {
    const currentFormData = useFormStore.getState().formData;
    const existingMP = currentFormData.marketPerformance;
    if (existingMP?.isVerified === false && !showStaleDataLinks) {
      updateFormData({
        marketPerformance: {
          ...existingMP,
          isVerified: undefined,
        },
      });
    }
  }, []); // Run once on mount

  // Fetch market performance data on component mount
  useEffect(() => {
    const fetchMarketPerformance = async () => {
      if (!address.suburbName || !address.state) {
        setError('Suburb and State are required to lookup market performance data.');
        setScenario('error');
        return;
      }

      // Always fetch from Google Sheet to get latest daysSinceLastCheck
      // Even if user has entered data, we need to check the sheet for data age

      try {
        setScenario('loading');
        const response = await fetch('/api/market-performance/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suburbName: address.suburbName,
            state: address.state,
          }),
        });

        if (!response.ok) {
          // Try to get error message from response
          let errorMessage = 'Failed to lookup market performance data';
          try {
            const errorData = await response.json();
            errorMessage = errorData.error || errorMessage;
          } catch {
            errorMessage = `Server error: ${response.status} ${response.statusText}`;
          }
          throw new Error(errorMessage);
        }

        const result: MarketPerformanceLookupResult = await response.json();
        setLookupResult(result);

        if (!result.found) {
          setScenario('no-data');
          setShowDataCollection(true);
          setShowSPIForm(true);
          setShowREIForm(true);
        } else if (result.isMockData) {
          setScenario('mock-data');
          setShowDataCollection(true);
          setShowSPIForm(true);
          setShowREIForm(true);
        } else {
          // Data exists - always show age and check option regardless of age
          setScenario('fresh-data');
          // Auto-populate form fields (preserve any manually entered fields)
          if (result.data) {
            // Get current marketPerformance from store to preserve ALL user-entered data
            const currentFormData = useFormStore.getState().formData;
            const currentMP = currentFormData.marketPerformance || {};
            
            // Helper to check if a value is actually user-entered (not empty/undefined/null)
            const hasUserValue = (value: any) => {
              return value !== undefined && value !== null && value !== '' && value.trim() !== '';
            };
            
            // CRITICAL: Preserve user-entered data, but populate empty/undefined fields with fetched data
            // When data is loaded from API, isSaved should be true (data already exists in sheet)
            // Only preserve isSaved=false if user has manually entered data that hasn't been saved yet
            const hasUserEnteredData = hasUserValue(currentMP.medianPriceChange3Months) ||
                                      hasUserValue(currentMP.medianPriceChange1Year) ||
                                      hasUserValue(currentMP.medianPriceChange3Year) ||
                                      hasUserValue(currentMP.medianPriceChange5Year) ||
                                      hasUserValue(currentMP.medianYield) ||
                                      hasUserValue(currentMP.medianRentChange1Year) ||
                                      hasUserValue(currentMP.rentalPopulation) ||
                                      hasUserValue(currentMP.vacancyRate);
            
            updateFormData({
              marketPerformance: {
                ...currentMP, // Preserve ALL existing data first
                // Use fetched value if current value is empty/undefined/null, otherwise preserve user-entered value
                medianPriceChange3Months: hasUserValue(currentMP.medianPriceChange3Months)
                  ? currentMP.medianPriceChange3Months 
                  : (result.data.medianPriceChange3Months || ''),
                medianPriceChange1Year: hasUserValue(currentMP.medianPriceChange1Year)
                  ? currentMP.medianPriceChange1Year
                  : (result.data.medianPriceChange1Year || ''),
                medianPriceChange3Year: hasUserValue(currentMP.medianPriceChange3Year)
                  ? currentMP.medianPriceChange3Year
                  : (result.data.medianPriceChange3Year || ''),
                medianPriceChange5Year: hasUserValue(currentMP.medianPriceChange5Year)
                  ? currentMP.medianPriceChange5Year
                  : (result.data.medianPriceChange5Year || ''),
                medianYield: hasUserValue(currentMP.medianYield)
                  ? currentMP.medianYield
                  : (result.data.medianYield || ''),
                medianRentChange1Year: hasUserValue(currentMP.medianRentChange1Year)
                  ? currentMP.medianRentChange1Year
                  : (result.data.medianRentChange1Year || ''),
                rentalPopulation: hasUserValue(currentMP.rentalPopulation)
                  ? currentMP.rentalPopulation
                  : (result.data.rentalPopulation || ''),
                vacancyRate: hasUserValue(currentMP.vacancyRate)
                  ? currentMP.vacancyRate
                  : (result.data.vacancyRate || ''),
                // When data is loaded from API, it's already saved in the Google Sheet
                // ALWAYS set isSaved to true when loading from API (data exists in sheet)
                // Only exception: if user has manually entered data AND explicitly set isSaved=false
                isSaved: true,
                // Only preserve isVerified if it's true (user already verified)
                // Otherwise reset to undefined to allow progression without clicking "Check data"
                isVerified: currentMP.isVerified === true ? true : undefined,
                // CRITICAL: Always update daysSinceLastCheck from Google Sheet (never preserve cached value)
                // This ensures we always show the current data age from the spreadsheet, even when navigating back/forward
                daysSinceLastCheck: result.daysSinceLastCheck,
              },
            });
          }
          // Reset stale data links state when new data is loaded
          setShowStaleDataLinks(false);
          setDataVerified(false);
          // Don't set isVerified here - it will be set to false only when user clicks "Check data"
          // This allows users to proceed without verification if they don't click "Check data"
        }
      } catch (err: any) {
        console.error('Error fetching market performance:', err);
        // Provide more detailed error message
        let errorMessage = 'Failed to fetch market performance data';
        if (err.message) {
          errorMessage = err.message;
        } else if (err instanceof TypeError && err.message.includes('fetch')) {
          errorMessage = 'Network error: Unable to connect to server. Please check if the dev server is running.';
        }
        setError(errorMessage);
        setScenario('error');
      }
    };

    fetchMarketPerformance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address.suburbName, address.state]); // Removed updateFormData from deps to prevent unnecessary re-fetches

  // Single save handler that can save SPI, REI, or both
  const handleSaveMarketPerformanceData = async () => {
    // Check if this is a new suburb (no existing data)
    const isNewSuburb = !lookupResult?.found || lookupResult?.isMockData;
    
    // Helper to check if value is valid (not empty and not just whitespace)
    const isValidValue = (value: string) => {
      return value && value.trim() !== '' && value.trim().toUpperCase() !== 'N/A';
    };
    
    // Determine what needs to be saved (N/A counts as filled for validation purposes)
    const hasSPIData = !!(formData_SPI.priceChange3Year && formData_SPI.priceChange5Year);
    const hasREIData = !!(
      formData_REI.priceChange3Months &&
      formData_REI.priceChange1Year &&
      formData_REI.medianYield &&
      formData_REI.rentChange1Year &&
      formData_REI.rentalPopulation &&
      formData_REI.vacancyRate
    );

    // For new suburbs, ALL fields must be filled (can be N/A)
    if (isNewSuburb) {
      // Check if any field is empty (empty string or just whitespace)
      const spi3YearEmpty = !formData_SPI.priceChange3Year || formData_SPI.priceChange3Year.trim() === '';
      const spi5YearEmpty = !formData_SPI.priceChange5Year || formData_SPI.priceChange5Year.trim() === '';
      const rei3MonthsEmpty = !formData_REI.priceChange3Months || formData_REI.priceChange3Months.trim() === '';
      const rei1YearEmpty = !formData_REI.priceChange1Year || formData_REI.priceChange1Year.trim() === '';
      const reiYieldEmpty = !formData_REI.medianYield || formData_REI.medianYield.trim() === '';
      const reiRentChangeEmpty = !formData_REI.rentChange1Year || formData_REI.rentChange1Year.trim() === '';
      const reiRentalPopEmpty = !formData_REI.rentalPopulation || formData_REI.rentalPopulation.trim() === '';
      const reiVacancyEmpty = !formData_REI.vacancyRate || formData_REI.vacancyRate.trim() === '';
      
      if (spi3YearEmpty || spi5YearEmpty || rei3MonthsEmpty || rei1YearEmpty || 
          reiYieldEmpty || reiRentChangeEmpty || reiRentalPopEmpty || reiVacancyEmpty) {
        alert('For new suburbs, all fields must be filled. Please complete both SPI and REI data sections. Use "N/A" if data is not available.');
        return;
      }
      // Validate checkboxes for new suburbs
      if (!formData_SPI.confirmedFromSPI) {
        alert('Please confirm that SPI data is from Smart Property Investment by checking the checkbox.');
        return;
      }
      if (!formData_REI.confirmedFromREI) {
        alert('Please confirm that REI data is from Real Estate Investar by checking the checkbox.');
        return;
      }
    } else {
      // For existing suburbs, at least one source must have data
      if (!hasSPIData && !hasREIData) {
        alert('Please fill in data for at least one source (SPI or REI)');
        return;
      }

      // Validate SPI fields if SPI data is present
      if (hasSPIData && (!formData_SPI.priceChange3Year || !formData_SPI.priceChange5Year)) {
        alert('Please fill in all SPI fields (3 year and 5 year). Use "N/A" if data is not available.');
        return;
      }

      // Validate REI fields if REI data is present
      if (hasREIData && (!formData_REI.priceChange3Months || !formData_REI.priceChange1Year || 
          !formData_REI.medianYield || !formData_REI.rentChange1Year || 
          !formData_REI.rentalPopulation || !formData_REI.vacancyRate)) {
        alert('Please fill in all REI fields (Vacancy Rate, Rental Population, 3 months, 1 year, Yield, and Rent Change). Use "N/A" if data is not available.');
        return;
      }
    }

    setSaving(true);
    try {
      // Determine dataSource and prepare data
      let dataSource: 'SPI' | 'REI' | 'BOTH';
      const dataToSave: any = {};

      if (hasSPIData && hasREIData) {
        dataSource = 'BOTH';
        // Include all fields
        dataToSave.medianPriceChange3Year = formData_SPI.priceChange3Year;
        dataToSave.medianPriceChange5Year = formData_SPI.priceChange5Year;
        dataToSave.medianPriceChange3Months = formData_REI.priceChange3Months;
        dataToSave.medianPriceChange1Year = formData_REI.priceChange1Year;
        dataToSave.medianYield = formData_REI.medianYield;
        dataToSave.medianRentChange1Year = formData_REI.rentChange1Year;
        dataToSave.rentalPopulation = formData_REI.rentalPopulation;
        dataToSave.vacancyRate = formData_REI.vacancyRate;
      } else if (hasSPIData) {
        dataSource = 'SPI';
        dataToSave.medianPriceChange3Year = formData_SPI.priceChange3Year;
        dataToSave.medianPriceChange5Year = formData_SPI.priceChange5Year;
      } else {
        dataSource = 'REI';
        dataToSave.medianPriceChange3Months = formData_REI.priceChange3Months;
        dataToSave.medianPriceChange1Year = formData_REI.priceChange1Year;
        dataToSave.medianYield = formData_REI.medianYield;
        dataToSave.medianRentChange1Year = formData_REI.rentChange1Year;
        dataToSave.rentalPopulation = formData_REI.rentalPopulation;
        dataToSave.vacancyRate = formData_REI.vacancyRate;
      }

      const response = await fetch('/api/market-performance/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbName: address.suburbName,
          state: address.state,
          data: dataToSave,
          dataSource: dataSource,
          changedBy: userEmail || 'Unknown',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to save market performance data (${response.status})`);
      }

      // Update form data
      updateFormData({
        marketPerformance: {
          ...marketPerformance,
          ...(hasSPIData && {
            medianPriceChange3Year: formData_SPI.priceChange3Year,
            medianPriceChange5Year: formData_SPI.priceChange5Year,
          }),
          ...(hasREIData && {
            medianPriceChange3Months: formData_REI.priceChange3Months,
            medianPriceChange1Year: formData_REI.priceChange1Year,
            medianYield: formData_REI.medianYield,
            medianRentChange1Year: formData_REI.rentChange1Year,
            rentalPopulation: formData_REI.rentalPopulation,
            vacancyRate: formData_REI.vacancyRate,
          }),
          isSaved: true, // Mark as saved
        },
      });

      setShowSPIForm(false);
      setShowREIForm(false);
      setShowDataCollection(false);
      alert('Market performance data saved successfully!');
      
      // Re-fetch market performance data to update the form (without reloading page)
      const currentFormData = useFormStore.getState().formData;
      const refreshResponse = await fetch('/api/market-performance/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbName: address.suburbName,
          state: address.state,
        }),
      });
      
      if (refreshResponse.ok) {
        const refreshResult: MarketPerformanceLookupResult = await refreshResponse.json();
        if (refreshResult.found && refreshResult.data) {
          updateFormData({
            marketPerformance: {
              ...currentFormData.marketPerformance,
              medianPriceChange3Months: refreshResult.data.medianPriceChange3Months,
              medianPriceChange1Year: refreshResult.data.medianPriceChange1Year,
              medianPriceChange3Year: refreshResult.data.medianPriceChange3Year,
              medianPriceChange5Year: refreshResult.data.medianPriceChange5Year,
              medianYield: refreshResult.data.medianYield,
              medianRentChange1Year: refreshResult.data.medianRentChange1Year,
              rentalPopulation: refreshResult.data.rentalPopulation,
              vacancyRate: refreshResult.data.vacancyRate,
              isSaved: true, // Keep saved flag after refresh
            },
          });
          setScenario('fresh-data');
        }
      }
    } catch (err: any) {
      console.error('Error saving market performance data:', err);
      alert('Error saving market performance data: ' + (err.message || 'Unknown error. Please check the browser console for details.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSPIData = async () => {
    // Validate all SPI fields are filled
    if (!formData_SPI.priceChange3Year || !formData_SPI.priceChange5Year) {
      alert('Please fill in all SPI fields (3 year and 5 year)');
      return;
    }

    // Check if REI data exists and is complete - if so, we'll update its timestamp
    const hasCompleteREIData = !!(
      marketPerformance?.medianPriceChange3Months &&
      marketPerformance?.medianPriceChange1Year &&
      marketPerformance?.medianYield &&
      marketPerformance?.medianRentChange1Year &&
      marketPerformance?.rentalPopulation &&
      marketPerformance?.vacancyRate
    );

    setSaving(true);
    try {
      const response = await fetch('/api/market-performance/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbName: address.suburbName,
          state: address.state,
          data: {
            medianPriceChange3Year: formData_SPI.priceChange3Year,
            medianPriceChange5Year: formData_SPI.priceChange5Year,
            dataSource: 'smartpropertyinvestment.com.au',
          },
          dataSource: 'SPI',
          changedBy: userEmail || 'Unknown',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to save SPI data (${response.status})`);
      }

      // If REI data exists and is complete, update REI timestamp to confirm it was checked
      if (hasCompleteREIData) {
        try {
          await fetch('/api/market-performance/update-timestamp-source', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              suburbName: address.suburbName,
              state: address.state,
              source: 'REI',
              changedBy: userEmail || 'Unknown',
            }),
          });
        } catch (err) {
          console.warn('Failed to update REI timestamp:', err);
          // Don't fail the save if timestamp update fails
        }
      }

      // Update form data
      updateFormData({
        marketPerformance: {
          ...marketPerformance,
          medianPriceChange3Year: formData_SPI.priceChange3Year,
          medianPriceChange5Year: formData_SPI.priceChange5Year,
        },
      });

      setShowSPIForm(false);
      alert('SPI data saved successfully!');
      
      // Re-fetch market performance data to update the form (without reloading page)
      // Get current form data to preserve manually entered fields
      const currentFormData = useFormStore.getState().formData;
      const refreshResponse = await fetch('/api/market-performance/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbName: address.suburbName,
          state: address.state,
        }),
      });
      
      if (refreshResponse.ok) {
        const refreshResult: MarketPerformanceLookupResult = await refreshResponse.json();
        if (refreshResult.found && refreshResult.data) {
          updateFormData({
            marketPerformance: {
              ...currentFormData.marketPerformance, // Preserve existing data including manually entered fields
              medianPriceChange3Months: refreshResult.data.medianPriceChange3Months,
              medianPriceChange1Year: refreshResult.data.medianPriceChange1Year,
              medianPriceChange3Year: refreshResult.data.medianPriceChange3Year,
              medianPriceChange5Year: refreshResult.data.medianPriceChange5Year,
              medianYield: refreshResult.data.medianYield,
              medianRentChange1Year: refreshResult.data.medianRentChange1Year,
              rentalPopulation: refreshResult.data.rentalPopulation,
              vacancyRate: refreshResult.data.vacancyRate,
            },
          });
          setScenario('fresh-data');
        }
      }
    } catch (err: any) {
      console.error('Error saving SPI data:', err);
      alert('Error saving SPI data: ' + (err.message || 'Unknown error. Please check the browser console for details.'));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveREIData = async () => {
    // Validate all REI fields are filled
    if (!formData_REI.priceChange3Months || !formData_REI.priceChange1Year || !formData_REI.medianYield ||
        !formData_REI.rentChange1Year || !formData_REI.rentalPopulation || !formData_REI.vacancyRate) {
      alert('Please fill in all REI fields (Vacancy Rate, Rental Population, 3 months, 1 year, Yield, and Rent Change)');
      return;
    }

    // Check if SPI data exists and is complete - if so, we'll update its timestamp
    const hasCompleteSPIData = !!(
      marketPerformance?.medianPriceChange3Year &&
      marketPerformance?.medianPriceChange5Year
    );

    setSaving(true);
    try {
      const response = await fetch('/api/market-performance/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbName: address.suburbName,
          state: address.state,
          data: {
            medianPriceChange3Months: formData_REI.priceChange3Months,
            medianPriceChange1Year: formData_REI.priceChange1Year,
            medianYield: formData_REI.medianYield,
            medianRentChange1Year: formData_REI.rentChange1Year,
            rentalPopulation: formData_REI.rentalPopulation,
            vacancyRate: formData_REI.vacancyRate,
            dataSource: 'info.realestateinvestar.com.au',
          },
          dataSource: 'REI',
          changedBy: userEmail || 'Unknown',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `Failed to save REI data (${response.status})`);
      }

      // If SPI data exists and is complete, update SPI timestamp to confirm it was checked
      if (hasCompleteSPIData) {
        try {
          await fetch('/api/market-performance/update-timestamp-source', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              suburbName: address.suburbName,
              state: address.state,
              source: 'SPI',
              changedBy: userEmail || 'Unknown',
            }),
          });
        } catch (err) {
          console.warn('Failed to update SPI timestamp:', err);
          // Don't fail the save if timestamp update fails
        }
      }

      // Update form data
      updateFormData({
        marketPerformance: {
          ...marketPerformance,
          medianPriceChange3Months: formData_REI.priceChange3Months,
          medianPriceChange1Year: formData_REI.priceChange1Year,
          medianYield: formData_REI.medianYield,
          medianRentChange1Year: formData_REI.rentChange1Year,
          rentalPopulation: formData_REI.rentalPopulation,
          vacancyRate: formData_REI.vacancyRate,
        },
      });

      setShowREIForm(false);
      alert('REI data saved successfully!');
      
      // Re-fetch market performance data to update the form (without reloading page)
      // Get current form data to preserve manually entered fields
      const currentFormData = useFormStore.getState().formData;
      const refreshResponse = await fetch('/api/market-performance/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suburbName: address.suburbName,
          state: address.state,
        }),
      });
      
      if (refreshResponse.ok) {
        const refreshResult: MarketPerformanceLookupResult = await refreshResponse.json();
        if (refreshResult.found && refreshResult.data) {
          updateFormData({
            marketPerformance: {
              ...currentFormData.marketPerformance, // Preserve existing data including manually entered fields
              medianPriceChange3Months: refreshResult.data.medianPriceChange3Months,
              medianPriceChange1Year: refreshResult.data.medianPriceChange1Year,
              medianPriceChange3Year: refreshResult.data.medianPriceChange3Year,
              medianPriceChange5Year: refreshResult.data.medianPriceChange5Year,
              medianYield: refreshResult.data.medianYield,
              medianRentChange1Year: refreshResult.data.medianRentChange1Year,
              rentalPopulation: refreshResult.data.rentalPopulation,
              vacancyRate: refreshResult.data.vacancyRate,
            },
          });
          setScenario('fresh-data');
        }
      }
    } catch (err: any) {
      console.error('Error saving SPI data:', err);
      alert('Error saving SPI data: ' + (err.message || 'Unknown error. Please check the browser console for details.'));
    } finally {
      setSaving(false);
    }
  };

  const handleStaleDataResponse = async (response: 'valid' | 'update') => {
    // Mark as verified in form store
    updateFormData({
      marketPerformance: {
        ...marketPerformance,
        isVerified: true,
      },
    });
    setDataVerified(true);
    
    if (response === 'update') {
      setShowDataCollection(true);
      setShowSPIForm(true);
      setShowREIForm(true);
      setShowStaleDataLinks(false); // Hide the links section
    } else if (response === 'valid') {
      // Update timestamp to current date (mark as checked)
      try {
        const response = await fetch('/api/market-performance/update-timestamp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suburbName: address.suburbName,
            state: address.state,
            changedBy: userEmail || 'Unknown',
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to update timestamp');
        }

        setScenario('fresh-data');
        
        // Re-fetch market performance data to update the form (without reloading page)
        // Get current form data to preserve manually entered fields
        const currentFormData = useFormStore.getState().formData;
        const refreshResponse = await fetch('/api/market-performance/lookup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            suburbName: address.suburbName,
            state: address.state,
          }),
        });
        
        if (refreshResponse.ok) {
          const refreshResult: MarketPerformanceLookupResult = await refreshResponse.json();
          if (refreshResult.found && refreshResult.data) {
            updateFormData({
              marketPerformance: {
                ...currentFormData.marketPerformance, // Preserve existing data including manually entered fields
                medianPriceChange3Months: refreshResult.data.medianPriceChange3Months,
                medianPriceChange1Year: refreshResult.data.medianPriceChange1Year,
                medianPriceChange3Year: refreshResult.data.medianPriceChange3Year,
                medianPriceChange5Year: refreshResult.data.medianPriceChange5Year,
                medianYield: refreshResult.data.medianYield,
                medianRentChange1Year: refreshResult.data.medianRentChange1Year,
                rentalPopulation: refreshResult.data.rentalPopulation,
                vacancyRate: refreshResult.data.vacancyRate,
              },
            });
          }
        }
      } catch (err: any) {
        alert('Error updating timestamp: ' + err.message);
      }
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Market Performance</h2>

      {/* Google Sheet Info */}
      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <p className="text-sm font-semibold text-blue-900 mb-2">Google Sheet:</p>
        <p className="text-blue-700 text-sm">
          <strong>Name:</strong> Property Review Static Data
        </p>
        <p className="text-blue-700 text-sm">
          <strong>Tab:</strong> Market Performance
        </p>
        <p className="text-blue-700 text-sm">
          <strong>Lookup:</strong> By Suburb ({address.suburbName || 'TBD'}) and State ({address.state || 'TBD'})
        </p>
      </div>

      {/* Loading State */}
      {scenario === 'loading' && (
        <div className="p-4 bg-blue-50 rounded-lg mb-6">
          <p className="text-blue-700">Checking market performance data...</p>
        </div>
      )}

      {/* Error State */}
      {scenario === 'error' && (
        <div className="p-4 bg-red-50 rounded-lg mb-6">
          <p className="text-red-700 font-semibold">Error: {error}</p>
          <p className="text-sm text-red-600 mt-2">
            You can continue manually - enter market performance data below.
          </p>
        </div>
      )}

      {/* No Data Scenario */}
      {scenario === 'no-data' && (
        <div className="p-4 bg-yellow-50 rounded-lg mb-6">
          <p className="text-yellow-900 font-semibold mb-4">
            We do not have Market Performance Data for this suburb
          </p>
          <p className="text-base text-yellow-800">
            Please use the links below to collect data from the required sources.
          </p>
        </div>
      )}

      {/* Mock Data Scenario */}
      {scenario === 'mock-data' && (
        <div className="p-4 bg-yellow-50 rounded-lg mb-6">
          <p className="text-yellow-900 font-semibold mb-4">
            We do not have Market Performance Data for this suburb (currently showing mock data)
          </p>
          <p className="text-base text-yellow-800">
            Please use the links below to collect data from the required sources.
          </p>
        </div>
      )}

      {/* Data Age Info - Show data age and option to check (for all data, regardless of age) */}
      {scenario === 'fresh-data' && lookupResult && lookupResult.daysSinceLastCheck !== undefined && !showDataCollection && (
        <div className={`p-4 rounded-lg mb-6 border ${
          lookupResult.daysSinceLastCheck >= 30 
            ? 'bg-red-50 border-red-300' 
            : 'bg-green-50 border-green-300'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`font-semibold ${
              lookupResult.daysSinceLastCheck >= 30 
                ? 'text-red-900' 
                : 'text-green-900'
            }`}>
              This data is {lookupResult.daysSinceLastCheck} {lookupResult.daysSinceLastCheck === 1 ? 'day' : 'days'} old.
            </p>
            {!showStaleDataLinks && (
              <button
                onClick={() => {
                  setShowStaleDataLinks(true);
                  // When links are shown, ensure verification is required
                  updateFormData({
                    marketPerformance: {
                      ...marketPerformance,
                      isVerified: false, // Require verification when links are shown
                    },
                  });
                }}
                className="btn-secondary"
              >
                Check data
              </button>
            )}
          </div>
          {showStaleDataLinks && (
            <div className="mt-4">
              <div className="text-base text-green-800 mb-4">
                <p className="mb-3"><strong>Check these sites:</strong></p>
                <div className="space-y-3">
                  <p className="text-lg">
                    Go to <a href={getSPIUrl()} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-bold text-xl">smartpropertyinvestment.com.au</a> for Median price change - 3 year & 5 year
                  </p>
                  <p className="text-lg">
                    Go to <a href={getREIUrl()} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-bold text-xl">info.realestateinvestar.com.au</a> for other metrics
                  </p>
                </div>
                <p className="mt-3 text-sm italic">(Links are pre-filled with {address.suburbName || 'suburb'} {address.state || 'state'})</p>
              </div>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={async () => {
                    // Navigate FIRST to prevent any re-renders from interfering
                    setCurrentStep(5);
                    
                    // Then update state and API in the background (non-blocking)
                    setShowStaleDataLinks(false);
                    updateFormData({
                      marketPerformance: {
                        ...marketPerformance,
                        isVerified: true,
                      },
                    });
                    setDataVerified(true);
                    
                    // Update timestamp in background (don't wait)
                    fetch('/api/market-performance/update-timestamp', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        suburbName: address.suburbName,
                        state: address.state,
                        changedBy: userEmail || 'Unknown',
                      }),
                    }).catch(error => {
                      console.error('Error updating timestamp:', error);
                    });
                  }}
                  className="btn-secondary"
                >
                  Data is fine, progress to step 5
                </button>
                <button
                  onClick={() => {
                    // Mark as verified and clear all fields
                    updateFormData({
                      marketPerformance: {
                        ...marketPerformance,
                        isVerified: true,
                        // Clear all data fields so user can enter fresh data
                        medianPriceChange3Months: '',
                        medianPriceChange1Year: '',
                        medianPriceChange3Year: '',
                        medianPriceChange5Year: '',
                        medianYield: '',
                        medianRentChange1Year: '',
                        rentalPopulation: '',
                        vacancyRate: '',
                        isSaved: false, // Mark as unsaved since fields are cleared
                      },
                    });
                    setDataVerified(true);
                    setShowDataCollection(true);
                    setShowSPIForm(true);
                    setShowREIForm(true);
                    setShowStaleDataLinks(false);
                  }}
                  className="btn-secondary"
                >
                  Needs updating
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Collection Forms */}
      {showDataCollection && (
        <div className="mb-6 space-y-6">
          {/* Show links when forms are displayed after "Needs updating" */}
          {(showSPIForm || showREIForm) && (
            <div className="p-4 bg-blue-50 rounded-lg mb-4 border border-blue-200">
              <div className="text-base text-blue-900 mb-4">
                <p className="mb-3 font-semibold">Check these sites:</p>
                <div className="space-y-3">
                  {showSPIForm && (
                    <p className="text-lg">
                      Go to <a href={getSPIUrl()} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-bold text-xl">smartpropertyinvestment.com.au</a> for Median price change - 3 year & 5 year
                    </p>
                  )}
                  {showREIForm && (
                    <p className="text-lg">
                      Go to <a href={getREIUrl()} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-bold text-xl">info.realestateinvestar.com.au</a> for other metrics
                    </p>
                  )}
                </div>
                <p className="mt-3 text-sm italic">(Links are pre-filled with {address.suburbName || 'suburb'} {address.state || 'state'})</p>
              </div>
            </div>
          )}
          {/* SPI Form */}
          {showSPIForm && (
            <div className="p-4 bg-white border border-gray-300 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Smart Property Investment Data</h3>
                <button
                  onClick={() => {
                    // Clear only SPI fields
                    updateFormData({
                      marketPerformance: {
                        ...marketPerformance,
                        medianPriceChange3Year: '',
                        medianPriceChange5Year: '',
                        isSaved: false, // Mark as unsaved since fields are cleared
                      },
                    });
                    // Also clear the form state
                    setFormData_SPI({ ...formData_SPI, priceChange3Year: '', priceChange5Year: '' });
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                  type="button"
                >
                  Remove existing from fields below
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Median price change - 3 year % *</label>
                    <input
                      type="text"
                      value={formData_SPI.priceChange3Year}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_SPI({ ...formData_SPI, priceChange3Year: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_SPI({ ...formData_SPI, priceChange3Year: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus
                        const cleaned = cleanNumericInput(e.target.value, true);
                        if (cleaned !== e.target.value) {
                          setFormData_SPI({ ...formData_SPI, priceChange3Year: cleaned });
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 20.10 or N/A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-field">Median price change - 5 year % *</label>
                    <input
                      type="text"
                      value={formData_SPI.priceChange5Year}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_SPI({ ...formData_SPI, priceChange5Year: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_SPI({ ...formData_SPI, priceChange5Year: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_SPI({ ...formData_SPI, priceChange5Year: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_SPI({ ...formData_SPI, priceChange5Year: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 49.83 or N/A"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="confirmSPI"
                    checked={formData_SPI.confirmedFromSPI}
                    onChange={(e) => setFormData_SPI({ ...formData_SPI, confirmedFromSPI: e.target.checked })}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="confirmSPI" className="label-field cursor-pointer">
                    Did you get this data from smartpropertyinvestment.com.au?
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* REI Form */}
          {showREIForm && (
            <div className="p-4 bg-white border border-gray-300 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Real Estate Investar Data</h3>
                <button
                  onClick={() => {
                    // Clear only REI fields
                    updateFormData({
                      marketPerformance: {
                        ...marketPerformance,
                        medianPriceChange3Months: '',
                        medianPriceChange1Year: '',
                        medianYield: '',
                        medianRentChange1Year: '',
                        rentalPopulation: '',
                        vacancyRate: '',
                        isSaved: false, // Mark as unsaved since fields are cleared
                      },
                    });
                    // Also clear the form state
                    setFormData_REI({
                      ...formData_REI,
                      priceChange3Months: '',
                      priceChange1Year: '',
                      medianYield: '',
                      rentChange1Year: '',
                      rentalPopulation: '',
                      vacancyRate: '',
                    });
                  }}
                  className="text-xs text-gray-600 hover:text-gray-800 underline"
                  type="button"
                >
                  Remove existing from fields below
                </button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label-field">Vacancy Rate % *</label>
                    <input
                      type="text"
                      value={formData_REI.vacancyRate}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_REI({ ...formData_REI, vacancyRate: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_REI({ ...formData_REI, vacancyRate: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_REI({ ...formData_REI, vacancyRate: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_REI({ ...formData_REI, vacancyRate: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 1.13 or N/A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-field">Rental Population % *</label>
                    <input
                      type="text"
                      value={formData_REI.rentalPopulation}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_REI({ ...formData_REI, rentalPopulation: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_REI({ ...formData_REI, rentalPopulation: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_REI({ ...formData_REI, rentalPopulation: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_REI({ ...formData_REI, rentalPopulation: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 36.61 or N/A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-field">Median price change - 3 months (last quarter) % *</label>
                    <input
                      type="text"
                      value={formData_REI.priceChange3Months}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_REI({ ...formData_REI, priceChange3Months: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_REI({ ...formData_REI, priceChange3Months: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_REI({ ...formData_REI, priceChange3Months: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_REI({ ...formData_REI, priceChange3Months: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 3.02 or N/A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-field">Median price change - 1 year % *</label>
                    <input
                      type="text"
                      value={formData_REI.priceChange1Year}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_REI({ ...formData_REI, priceChange1Year: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_REI({ ...formData_REI, priceChange1Year: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_REI({ ...formData_REI, priceChange1Year: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_REI({ ...formData_REI, priceChange1Year: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 15.00 or N/A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-field">Median yield % *</label>
                    <input
                      type="text"
                      value={formData_REI.medianYield}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_REI({ ...formData_REI, medianYield: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_REI({ ...formData_REI, medianYield: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_REI({ ...formData_REI, medianYield: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_REI({ ...formData_REI, medianYield: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 3.39 or N/A"
                      required
                    />
                  </div>
                  <div>
                    <label className="label-field">Median rent change - 1 year % *</label>
                    <input
                      type="text"
                      value={formData_REI.rentChange1Year}
                      onChange={(e) => {
                        const cleaned = cleanNumericInput(e.target.value, false); // Don't format while typing
                        setFormData_REI({ ...formData_REI, rentChange1Year: cleaned });
                      }}
                      onPaste={(e) => {
                        e.preventDefault();
                        const pasted = e.clipboardData.getData('text');
                        const cleaned = cleanNumericInput(pasted, true); // Format to 2 decimals on paste
                        setFormData_REI({ ...formData_REI, rentChange1Year: cleaned });
                      }}
                      onBlur={(e) => {
                        // Format to 2 decimals when field loses focus, but only if there's a value
                        const trimmed = e.target.value.trim();
                        if (trimmed === '' || trimmed === '.') {
                          // Field is empty, keep it empty
                          setFormData_REI({ ...formData_REI, rentChange1Year: '' });
                        } else {
                          const cleaned = cleanNumericInput(e.target.value, true);
                          if (cleaned !== e.target.value) {
                            setFormData_REI({ ...formData_REI, rentChange1Year: cleaned });
                          }
                        }
                      }}
                      className="input-field"
                      placeholder="e.g., 7.14 or N/A"
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center mt-4">
                  <input
                    type="checkbox"
                    id="confirmREI"
                    checked={formData_REI.confirmedFromREI}
                    onChange={(e) => setFormData_REI({ ...formData_REI, confirmedFromREI: e.target.checked })}
                    className="mr-2 h-4 w-4"
                  />
                  <label htmlFor="confirmREI" className="label-field cursor-pointer">
                    Did you get this data from info.realestateinvestar.com.au?
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Single Save Button - Only show when forms are visible */}
          {showDataCollection && (showSPIForm || showREIForm) && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleSaveMarketPerformanceData}
                disabled={saving}
                className="btn-primary text-lg px-8 py-3"
              >
                {saving ? 'Saving...' : 'Save Market Performance Data'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Incomplete Data Warning - Show when data exists but is incomplete */}
      {scenario === 'fresh-data' && isDataIncomplete && !showDataCollection && (
        <div className="p-4 bg-yellow-50 rounded-lg mb-6 border border-yellow-200">
          <p className="text-yellow-900 font-semibold mb-3">
            ⚠️ Market Performance data is incomplete
          </p>
          <div className="text-base text-yellow-800 mb-4">
            <p className="mb-3">Some fields are missing. You can either:</p>
            <div className="space-y-3 mb-3">
              {needsSPIData && (
                <p className="text-lg">
                  Collect data from <a href={getSPIUrl()} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-bold text-xl">smartpropertyinvestment.com.au</a> (Median price change - 3 year & 5 year)
                </p>
              )}
              {needsREIData && (
                <p className="text-lg">
                  Collect data from <a href={getREIUrl()} target="_blank" rel="noopener noreferrer" className="underline text-blue-600 hover:text-blue-800 font-bold text-xl">info.realestateinvestar.com.au</a> for other metrics
                </p>
              )}
              <p className="text-lg">Or manually fill in the blank fields below</p>
            </div>
            <p className="mt-3 text-sm italic text-yellow-700">(Links are pre-filled with {address.suburbName || 'suburb'} {address.state || 'state'})</p>
          </div>
        </div>
      )}

      {/* Market Performance Fields - Hide when entering new data */}
      {!showDataCollection && (
      <div className="space-y-4">
        {/* SPI Data Section - Highlighted at top */}
        <div className="p-4 bg-blue-50 border-2 border-blue-300 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-3">Smart Property Investment Data (smartpropertyinvestment.com.au)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Median price change - 3 year %</label>
              <input
                type="text"
                value={marketPerformance?.medianPriceChange3Year || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, medianPriceChange3Year: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 20.10 or N/A"
              />
            </div>
            <div>
              <label className="label-field">Median price change - 5 year %</label>
              <input
                type="text"
                value={marketPerformance?.medianPriceChange5Year || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, medianPriceChange5Year: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 49.83 or N/A"
              />
            </div>
          </div>
        </div>

        {/* REI Data Section */}
        <div className="p-4 bg-gray-50 border border-gray-300 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-3">Real Estate Investar Data (info.realestateinvestar.com.au)</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Median price change - 3 months %</label>
              <input
                type="text"
                value={marketPerformance?.medianPriceChange3Months || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, medianPriceChange3Months: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 3.02 or N/A"
              />
            </div>
            <div>
              <label className="label-field">Median price change - 1 year %</label>
              <input
                type="text"
                value={marketPerformance?.medianPriceChange1Year || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, medianPriceChange1Year: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 15.00 or N/A"
              />
            </div>
            <div>
              <label className="label-field">Median yield %</label>
              <input
                type="text"
                value={marketPerformance?.medianYield || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, medianYield: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 3.39 or N/A"
              />
            </div>
            <div>
              <label className="label-field">Median rent change - 1 year %</label>
              <input
                type="text"
                value={marketPerformance?.medianRentChange1Year || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, medianRentChange1Year: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 7.14 or N/A"
              />
            </div>
            <div>
              <label className="label-field">Rental Population %</label>
              <input
                type="text"
                value={marketPerformance?.rentalPopulation || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, rentalPopulation: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 36.61 or N/A"
              />
            </div>
            <div>
              <label className="label-field">Vacancy Rate %</label>
              <input
                type="text"
                value={marketPerformance?.vacancyRate || ''}
                onChange={(e) => {
                  const cleaned = cleanNumericInput(e.target.value, false);
                  updateFormData({
                    marketPerformance: { ...marketPerformance, vacancyRate: cleaned },
                  });
                }}
                className="input-field"
                placeholder="e.g., 1.13 or N/A"
              />
            </div>
          </div>
        </div>

        {/* Market Performance Additional Dialogue - Collapsible */}
        <div className="mt-6 border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => setIsMarketPerformanceAdditionalDialogueExpanded(!isMarketPerformanceAdditionalDialogueExpanded)}
            className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
          >
            <span className="font-semibold text-gray-900">Market Performance Additional Dialogue (Text will appear exactly as typed in email template)</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isMarketPerformanceAdditionalDialogueExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {isMarketPerformanceAdditionalDialogueExpanded && (
            <div className="p-4 bg-white">
              <textarea
                value={marketPerformance?.marketPerformanceAdditionalDialogue || ''}
                onChange={(e) => updateFormData({
                  marketPerformance: { ...marketPerformance, marketPerformanceAdditionalDialogue: e.target.value },
                })}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="input-field resize-none overflow-hidden"
                rows={3}
                placeholder="Any additional details about market performance"
                spellCheck={true}
              />
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

