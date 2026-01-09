'use client';

import { useFormStore } from '@/store/formStore';
import { TitleType, YesNo, AskingType, OccupancyType, CashbackRebateType } from '@/types/form';
import { useMemo, useEffect, useState } from 'react';

export function Step2PropertyDetails() {
  const { formData, updatePropertyDescription, updatePurchasePrice, updateRentalAssessment, updateLotPropertyDescription, updateLotPurchasePrice, updateLotRentalAssessment, replicateLotData } = useFormStore();
  const { decisionTree, propertyDescription, purchasePrice, rentalAssessment, lots } = formData;
  const [isPropertyDescriptionAdditionalDialogueExpanded, setIsPropertyDescriptionAdditionalDialogueExpanded] = useState<boolean>(false); // Collapsed by default as non-mandatory
  const [isPurchasePriceAdditionalDialogueExpanded, setIsPurchasePriceAdditionalDialogueExpanded] = useState<boolean>(false); // Collapsed by default as non-mandatory
  const [isRentalAssessmentAdditionalDialogueExpanded, setIsRentalAssessmentAdditionalDialogueExpanded] = useState<boolean>(false); // Collapsed by default as non-mandatory
  
  // Format number as currency ($640,000)
  const formatCurrency = (value: string | undefined): string => {
    if (!value || value === '' || value.toUpperCase() === 'TBC') return value || '';
    const numValue = value.replace(/,/g, '');
    if (isNaN(Number(numValue))) return value;
    return '$' + Number(numValue).toLocaleString('en-US');
  };
  
  // Parse formatted currency back to number string
  const parseCurrency = (value: string): string => {
    if (!value) return '';
    const upperValue = value.toUpperCase();
    if (upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC') return upperValue;
    // Remove $ and commas, keep only digits
    return value.replace(/[$,]/g, '');
  };
  
  // Parse expiry value to extract month, year, and TBC status
  const parseExpiry = (value: string | undefined): { month: string; year: string; isTBC: boolean } => {
    if (!value) {
      return { month: '', year: '', isTBC: false }; // Empty means not TBC, show dropdowns
    }
    if (value.toUpperCase() === 'TBC') {
      return { month: '', year: '', isTBC: true };
    }
    if (value.toUpperCase() === 'REGISTERED') {
      return { month: '', year: '', isTBC: false }; // Registered is handled separately in UI
    }
    // Remove "approx." suffix if present (for land registration)
    const trimmed = value.replace(/\s+approx\.?$/i, '').trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2 && parts[0] && parts[1]) {
      // Both month and year present
      return { month: parts[0], year: parts[1], isTBC: false };
    }
    // Check if it's just a month (ends with space) or just a year (starts with space or is numeric)
    if (trimmed.endsWith(' ') && trimmed.trim().length > 0) {
      // Month only (with trailing space)
      return { month: trimmed.trim(), year: '', isTBC: false };
    }
    if (trimmed.startsWith(' ') && trimmed.trim().length > 0) {
      // Year only (with leading space)
      return { month: '', year: trimmed.trim(), isTBC: false };
    }
    // Check if it's a valid month name
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    if (months.includes(trimmed)) {
      return { month: trimmed, year: '', isTBC: false };
    }
    // Check if it's a 4-digit year
    if (/^\d{4}$/.test(trimmed)) {
      return { month: '', year: trimmed, isTBC: false };
    }
    return { month: '', year: '', isTBC: false };
  };
  
  // Format expiry from month, year, and TBC status
  const formatExpiry = (month: string, year: string, isTBC: boolean): string => {
    if (isTBC) return 'TBC';
    if (month && year) return `${month} ${year}`;
    if (month) return `${month} `; // Store month with trailing space if year not selected yet
    if (year) return ` ${year}`; // Store year with leading space if month not selected yet
    return '';
  };
  
  // Generate year options (current year to 10 years ahead)
  const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear + i);
  };
  
  // Debug: Log what Step 2 is reading
  useEffect(() => {
    console.log('=== STEP 2 COMPONENT MOUNTED/RENDERED ===');
    console.log('propertyDescription:', propertyDescription);
    console.log('purchasePrice:', purchasePrice);
    console.log('rentalAssessment:', rentalAssessment);
    console.log('propertyDescription keys:', Object.keys(propertyDescription || {}));
    console.log('purchasePrice keys:', Object.keys(purchasePrice || {}));
    console.log('rentalAssessment keys:', Object.keys(rentalAssessment || {}));
  }, [propertyDescription, purchasePrice, rentalAssessment]);

  const isProject = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple';
  const isHAndL = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Individual';
  const isEstablished = decisionTree.propertyType === 'Established';
  const isDualOccupancy = decisionTree.dualOccupancy === 'Yes';
  
  // Check if Contract Type is 01, 02, or 03 (these have cashback/rebate)
  const hasCashbackRebate = decisionTree.contractType === '01 H&L Comms' || 
                            decisionTree.contractType === '02 Single Comms' || 
                            decisionTree.contractType === '03 Internal with Comms';
  
  // Check if Contract Type is 02 Single Comms (uses Total Price instead of Land + Build)
  const isSingleContract = decisionTree.contractType === '02 Single Comms';
  
  // Set defaults for cashback/rebate when contract type requires it
  useEffect(() => {
    if (hasCashbackRebate) {
      const updates: Partial<typeof purchasePrice> = {};
      if (!purchasePrice?.cashbackRebateValue) {
        updates.cashbackRebateValue = '20000'; // Default to $20,000
      }
      if (!purchasePrice?.cashbackRebateType) {
        updates.cashbackRebateType = 'Cashback'; // Default to Cashback
      }
      if (Object.keys(updates).length > 0) {
        updatePurchasePrice(updates);
      }
    }
  }, [hasCashbackRebate, purchasePrice?.cashbackRebateValue, purchasePrice?.cashbackRebateType, updatePurchasePrice]);

  // Clear secondary property fields when dualOccupancy changes from "Yes" to "No" or empty
  useEffect(() => {
    if (decisionTree.dualOccupancy !== 'Yes' && propertyDescription) {
      // Check if any secondary fields exist
      const hasSecondaryFields = 
        propertyDescription.bedsSecondary ||
        propertyDescription.bathSecondary ||
        propertyDescription.garageSecondary ||
        propertyDescription.carportSecondary ||
        propertyDescription.carspaceSecondary;
      
      if (hasSecondaryFields) {
        // Clear all secondary fields by setting them to undefined
        updatePropertyDescription({
          bedsSecondary: undefined,
          bathSecondary: undefined,
          garageSecondary: undefined,
          carportSecondary: undefined,
          carspaceSecondary: undefined,
        });
      }
    }
  }, [decisionTree.dualOccupancy, propertyDescription, updatePropertyDescription]);

  // Calculate Total - For Single Contract: use totalPrice field, For H&L: use Land + Build
  const totalPrice = useMemo(() => {
    // For Single Contract (02 Single Comms), use totalPrice field directly
    if (isSingleContract && purchasePrice?.totalPrice) {
      const totalPriceStr = purchasePrice.totalPrice;
      if (totalPriceStr.toUpperCase() === 'TBC') return null;
      const total = parseFloat(parseCurrency(totalPriceStr));
      return isNaN(total) ? null : total;
    }
    
    // For H&L (not Single Contract), calculate Land + Build
    if (!isHAndL || isSingleContract) return null;
    const landPriceStr = purchasePrice?.landPrice || '';
    const buildPriceStr = purchasePrice?.buildPrice || '';
    
    if (!landPriceStr || !buildPriceStr) return null;
    if (landPriceStr.toUpperCase() === 'TBC' || buildPriceStr.toUpperCase() === 'TBC') return null;
    
    const landPrice = parseFloat(parseCurrency(landPriceStr));
    const buildPrice = parseFloat(parseCurrency(buildPriceStr));
    
    if (isNaN(landPrice) || isNaN(buildPrice)) return null;
    
    return landPrice + buildPrice;
  }, [isHAndL, isSingleContract, purchasePrice?.landPrice, purchasePrice?.buildPrice, purchasePrice?.totalPrice, parseCurrency]);

  // Calculate Net Price (Total - Cashback) for H&L - Only for Cashback type
  const netPrice = useMemo(() => {
    // Only calculate Net Price if type is "Cashback"
    if (purchasePrice?.cashbackRebateType !== 'Cashback') return null;
    
    if (!totalPrice) return null;
    
    const cashbackStr = purchasePrice?.cashbackRebateValue || '';
    if (!cashbackStr || cashbackStr.toUpperCase() === 'TBC') return null;
    
    const cashback = parseFloat(parseCurrency(cashbackStr));
    if (isNaN(cashback)) return null;
    
    return totalPrice - cashback;
  }, [totalPrice, purchasePrice?.cashbackRebateValue, purchasePrice?.cashbackRebateType, parseCurrency]);

  // Calculate Property Price for yield calculations
  // For Established: Use Acceptable Acquisition To
  // For H&L: Use Land Price + Build Price (or use totalPrice)
  const propertyPrice = useMemo(() => {
    if (isEstablished && purchasePrice?.acceptableAcquisitionTo) {
      // Remove commas and parse as number
      const priceStr = parseCurrency(purchasePrice.acceptableAcquisitionTo);
      if (priceStr.toUpperCase() === 'TBC') return null;
      const price = parseFloat(priceStr);
      return isNaN(price) ? null : price;
    }
    // For H&L: Use calculated totalPrice
    if (isHAndL) {
      return totalPrice;
    }
    return null;
  }, [isEstablished, isHAndL, purchasePrice?.acceptableAcquisitionTo, totalPrice]);

  // Calculate Current Yield
  // For dual occupancy: use combined rental (Primary + Secondary)
  // For single: use Primary only
  const currentYield = useMemo(() => {
    if (rentalAssessment?.occupancyPrimary !== 'Tenanted' || !propertyPrice || !rentalAssessment?.currentRentPrimary) {
      return null;
    }
    
    // Get Primary rent - handle currency formatting ($ and commas)
    const rentPrimaryStr = parseCurrency(rentalAssessment.currentRentPrimary);
    if (rentPrimaryStr.toUpperCase() === 'TBC') return null;
    const weeklyRentPrimary = parseFloat(rentPrimaryStr);
    if (isNaN(weeklyRentPrimary) || weeklyRentPrimary <= 0) {
      return null;
    }
    
    // For dual occupancy, add Secondary rent if available
    let totalWeeklyRent = weeklyRentPrimary;
    if (isDualOccupancy && rentalAssessment?.currentRentSecondary) {
      const rentSecondaryStr = parseCurrency(rentalAssessment.currentRentSecondary);
      if (rentSecondaryStr.toUpperCase() !== 'TBC') {
        const weeklyRentSecondary = parseFloat(rentSecondaryStr);
        if (!isNaN(weeklyRentSecondary) && weeklyRentSecondary > 0) {
          totalWeeklyRent += weeklyRentSecondary;
        }
      }
    }
    
    const annualRent = totalWeeklyRent * 52;
    const yieldValue = (annualRent / propertyPrice) * 100;
    return yieldValue.toFixed(2);
  }, [rentalAssessment?.occupancyPrimary, rentalAssessment?.currentRentPrimary, rentalAssessment?.currentRentSecondary, isDualOccupancy, propertyPrice]);

  // Calculate Appraised Yield
  const appraisedYield = useMemo(() => {
    if (!propertyPrice || !rentalAssessment?.rentAppraisalPrimaryTo) {
      return null;
    }
    // Handle currency formatting ($ and commas) and TBC
    const rentStr = parseCurrency(rentalAssessment.rentAppraisalPrimaryTo);
    if (rentStr.toUpperCase() === 'TBC') return null;
    const weeklyRent = parseFloat(rentStr);
    if (isNaN(weeklyRent) || weeklyRent <= 0) {
      return null;
    }
    
    // For dual occupancy, add Secondary rent appraisal if available
    let totalWeeklyRent = weeklyRent;
    if (isDualOccupancy && rentalAssessment?.rentAppraisalSecondaryTo) {
      const rentSecondaryStr = parseCurrency(rentalAssessment.rentAppraisalSecondaryTo);
      if (rentSecondaryStr.toUpperCase() !== 'TBC') {
        const weeklyRentSecondary = parseFloat(rentSecondaryStr);
        if (!isNaN(weeklyRentSecondary) && weeklyRentSecondary > 0) {
          totalWeeklyRent += weeklyRentSecondary;
        }
      }
    }
    
    const annualRent = totalWeeklyRent * 52;
    const yieldValue = (annualRent / propertyPrice) * 100;
    return yieldValue.toFixed(2);
  }, [rentalAssessment?.rentAppraisalPrimaryTo, rentalAssessment?.rentAppraisalSecondaryTo, isDualOccupancy, propertyPrice]);

  // Update yield fields when calculated values change
  useEffect(() => {
    if (!updateRentalAssessment) return;
    if (currentYield !== null) {
      const newValue = `~ ${currentYield}%`;
      if (rentalAssessment?.yield !== newValue) {
        updateRentalAssessment({ yield: newValue });
      }
    } else if (rentalAssessment?.occupancyPrimary !== 'Tenanted' && rentalAssessment?.yield) {
      updateRentalAssessment({ yield: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentYield, rentalAssessment?.occupancyPrimary, rentalAssessment?.yield]);

  useEffect(() => {
    if (!updateRentalAssessment) return;
    if (appraisedYield !== null) {
      const newValue = `~ ${appraisedYield}%`;
      if (rentalAssessment?.appraisedYield !== newValue) {
        updateRentalAssessment({ appraisedYield: newValue });
      }
    } else if (rentalAssessment?.appraisedYield) {
      updateRentalAssessment({ appraisedYield: '' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appraisedYield, rentalAssessment?.appraisedYield]);

  // For Projects - show accordion with lot details
  if (isProject) {
    return <ProjectLotsView />;
  }

  // For H&L or Established - show property details form
  return (
    <div data-step2-form>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Property Details</h2>
        <p className="text-gray-600">
          Enter property details, purchase price, and rental assessment.
        </p>
      </div>

      <div className="space-y-8">
        {/* Property Description Section */}
        <div className="border-b pb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Property Description</h3>
          
          <div className={`grid gap-4 ${isDualOccupancy ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
            {/* Beds */}
            <div>
              <label className="label-field">Beds {isDualOccupancy ? '(Primary)' : ''} *</label>
              <select
                value={propertyDescription?.bedsPrimary || ''}
                onChange={(e) => updatePropertyDescription({ bedsPrimary: e.target.value })}
                className="input-field"
                required
                autoComplete="off"
              >
                <option value="">Select...</option>
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={String(i)}>{i}</option>
                ))}
                <option value="TBC">TBC</option>
              </select>
            </div>
            
            {isDualOccupancy && (
              <div>
                <label className="label-field">Beds (Secondary) *</label>
                <select
                  value={propertyDescription?.bedsSecondary || ''}
                  onChange={(e) => updatePropertyDescription({ bedsSecondary: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select...</option>
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={String(i)}>{i}</option>
                  ))}
                  <option value="TBC">TBC</option>
                </select>
              </div>
            )}

            {/* Bath */}
            <div>
              <label className="label-field">Bath {isDualOccupancy ? '(Primary)' : ''} *</label>
              <select
                value={propertyDescription?.bathPrimary || ''}
                onChange={(e) => updatePropertyDescription({ bathPrimary: e.target.value })}
                      className="input-field"
                      required
                    >
                <option value="">Select...</option>
                {Array.from({ length: 21 }, (_, i) => {
                  const value = i / 2;
                  return (
                    <option key={i} value={String(value)}>{value}</option>
                  );
                })}
                <option value="TBC">TBC</option>
              </select>
            </div>
            
            {isDualOccupancy && (
              <div>
                <label className="label-field">Bath (Secondary) *</label>
                <select
                  value={propertyDescription?.bathSecondary || ''}
                  onChange={(e) => updatePropertyDescription({ bathSecondary: e.target.value })}
                  className="input-field"
                  required
                >
                  <option value="">Select...</option>
                  {Array.from({ length: 21 }, (_, i) => {
                    const value = i / 2;
                    return (
                      <option key={i} value={String(value)}>{value}</option>
                    );
                  })}
                  <option value="TBC">TBC</option>
                </select>
              </div>
            )}

            {/* Garage */}
            <div>
              <label className="label-field">Garage {isDualOccupancy ? '(Primary)' : ''} *</label>
              <select
                value={propertyDescription?.garagePrimary || ''}
                onChange={(e) => updatePropertyDescription({ garagePrimary: e.target.value })}
                className="input-field"
                required
              >
                <option value="">Select...</option>
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={String(i)}>{i}</option>
                ))}
                <option value="TBC">TBC</option>
              </select>
            </div>
            
                  {isDualOccupancy && (
                    <div>
                      <label className="label-field">Garage (Secondary) *</label>
                      <select
                        value={propertyDescription?.garageSecondary || ''}
                        onChange={(e) => updatePropertyDescription({ garageSecondary: e.target.value })}
                        className="input-field"
                        required
                      >
                        <option value="">Select...</option>
                        {Array.from({ length: 11 }, (_, i) => (
                          <option key={i} value={String(i)}>{i}</option>
                        ))}
                        <option value="TBC">TBC</option>
                      </select>
                    </div>
                  )}

            {/* Carport */}
            <div>
              <label className="label-field">Carport {isDualOccupancy ? '(Primary)' : ''}</label>
              <select
                value={propertyDescription?.carportPrimary || ''}
                onChange={(e) => updatePropertyDescription({ carportPrimary: e.target.value })}
                className="input-field"
              >
                <option value="">Select...</option>
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={String(i)}>{i}</option>
                ))}
                <option value="TBC">TBC</option>
              </select>
            </div>
            
            {isDualOccupancy && (
              <div>
                <label className="label-field">Carport (Secondary)</label>
                <select
                  value={propertyDescription?.carportSecondary || ''}
                  onChange={(e) => updatePropertyDescription({ carportSecondary: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={String(i)}>{i}</option>
                  ))}
                  <option value="TBC">TBC</option>
                </select>
              </div>
            )}

            {/* Car Spaces */}
            <div>
              <label className="label-field">Car Spaces {isDualOccupancy ? '(Primary)' : ''}</label>
              <select
                value={propertyDescription?.carspacePrimary || ''}
                onChange={(e) => updatePropertyDescription({ carspacePrimary: e.target.value })}
                className="input-field"
              >
                <option value="">Select...</option>
                {Array.from({ length: 11 }, (_, i) => (
                  <option key={i} value={String(i)}>{i}</option>
                ))}
                <option value="TBC">TBC</option>
              </select>
            </div>
            
            {isDualOccupancy && (
              <div>
                <label className="label-field">Car Spaces (Secondary)</label>
                <select
                  value={propertyDescription?.carspaceSecondary || ''}
                  onChange={(e) => updatePropertyDescription({ carspaceSecondary: e.target.value })}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  {Array.from({ length: 11 }, (_, i) => (
                    <option key={i} value={String(i)}>{i}</option>
                  ))}
                  <option value="TBC">TBC</option>
                </select>
              </div>
            )}

            {/* Year Built - Only for Established */}
            {isEstablished && (
              <div>
                <label className="label-field">Year Built *</label>
                <input
                  type="text"
                  value={propertyDescription?.yearBuilt || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const upperValue = value.toUpperCase();
                    // Allow: empty, numbers (4 digits for year), or TBC (allow typing T, TB, TBC)
                    const isNumeric = /^\d{4}$/.test(value);
                    const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                    // Allow partial year input while typing (1-4 digits)
                    const isPartialYear = /^\d{1,4}$/.test(value);
                    if (value === '' || isNumeric || isTBC || isPartialYear) {
                      updatePropertyDescription({ yearBuilt: isTBC ? upperValue : value });
                    }
                  }}
                  className="input-field"
                  placeholder="e.g., 2015 or TBC"
                  required
                />
              </div>
            )}

            {/* Land Registration - Only for H&L and Projects - Moved after Car Spaces */}
            {(isHAndL || isProject) && (
              <div className={isDualOccupancy ? 'col-span-2' : ''}>
                <label className="label-field">Land Registration *</label>
                {(() => {
                  const landRegValue = propertyDescription?.landRegistration || '';
                  const isRegistered = landRegValue.toUpperCase() === 'REGISTERED';
                  const isTBC = landRegValue.toUpperCase() === 'TBC';
                  const registrationData = parseExpiry(landRegValue);
                  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                                  'July', 'August', 'September', 'October', 'November', 'December'];
                  const years = getYearOptions();
                  
                  return (
                    <div className="space-y-3">
                      {/* Expected (Target Date) Option - First */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="landRegistration"
                            id="landRegExpected"
                            checked={!isRegistered && !isTBC && (landRegValue !== '' || !!registrationData.month || !!registrationData.year)}
                            onChange={() => {
                              // If clicking Expected, clear Registered and TBC, show dropdowns
                              if (!registrationData.month && !registrationData.year) {
                                updatePropertyDescription({ landRegistration: '' });
                              }
                            }}
                            className="w-4 h-4"
                          />
                          <label htmlFor="landRegExpected" className="text-sm text-gray-700 cursor-pointer font-medium">
                            Expected
                          </label>
                        </div>
                        {/* Month/Year Dropdowns - Show if Expected is selected */}
                        {!isRegistered && !isTBC && (
                          <div className="ml-6 grid grid-cols-2 gap-2">
                            <select
                              value={registrationData.month}
                              onChange={(e) => {
                                const month = e.target.value;
                                const formatted = formatExpiry(month, registrationData.year, false);
                                updatePropertyDescription({ landRegistration: formatted ? `${formatted} approx.` : '' });
                              }}
                              className="input-field"
                              required={!isRegistered && !isTBC}
                            >
                              <option value="">Select Month</option>
                              {months.map(month => (
                                <option key={month} value={month}>{month}</option>
                              ))}
                            </select>
                            <select
                              value={registrationData.year}
                              onChange={(e) => {
                                const year = e.target.value;
                                const formatted = formatExpiry(registrationData.month, year, false);
                                updatePropertyDescription({ landRegistration: formatted ? `${formatted} approx.` : '' });
                              }}
                              className="input-field"
                              required={!isRegistered && !isTBC}
                            >
                              <option value="">Select Year</option>
                              {years.map(year => (
                                <option key={year} value={String(year)}>{year}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Registered Option - Second */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="landRegRegistered"
                          checked={isRegistered}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // If checking Registered, clear Expected and TBC
                              updatePropertyDescription({ landRegistration: 'Registered' });
                            } else {
                              updatePropertyDescription({ landRegistration: '' });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="landRegRegistered" className="text-sm text-gray-700 cursor-pointer">
                          Registered
                        </label>
                      </div>

                      {/* TBC Option - Third */}
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="landRegTBC"
                          checked={isTBC}
                          onChange={(e) => {
                            if (e.target.checked) {
                              // If checking TBC, clear Expected and Registered
                              updatePropertyDescription({ landRegistration: 'TBC' });
                            } else {
                              updatePropertyDescription({ landRegistration: '' });
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <label htmlFor="landRegTBC" className="text-sm text-gray-700 cursor-pointer">
                          TBC
                        </label>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Land Size - Always on its own row, ~50% width */}
            <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
              <label className="label-field">Land Size (m²) *</label>
              <input
                type="text"
                value={propertyDescription?.landSize || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  const upperValue = value.toUpperCase();
                  // Allow: empty, numbers (with optional decimals), or TBC (allow typing T, TB, TBC)
                  const isNumeric = /^\d*\.?\d*$/.test(value);
                  const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                  if (value === '' || isNumeric || isTBC) {
                    updatePropertyDescription({ landSize: isTBC ? upperValue : value });
                  }
                }}
                className="input-field"
                placeholder="e.g., 600 or TBC"
                required
              />
            </div>

            {/* Build Size - Only for H&L, always on its own row, ~50% width */}
            {isHAndL && (
              <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
                <label className="label-field">Build Size (m²) *</label>
                <input
                  type="text"
                  value={propertyDescription?.buildSize || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    const upperValue = value.toUpperCase();
                    // Allow: empty, numbers (with optional decimals), or TBC (allow typing T, TB, TBC)
                    const isNumeric = /^\d*\.?\d*$/.test(value);
                    const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                    if (value === '' || isNumeric || isTBC) {
                      updatePropertyDescription({ buildSize: isTBC ? upperValue : value });
                    }
                  }}
                  className="input-field"
                  placeholder="e.g., 144.75 or TBC"
                  required
                />
              </div>
            )}

            {/* Title - Always on its own row, ~50% width */}
            <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
              <label className="label-field">Title *</label>
              <select
                value={propertyDescription?.title || ''}
                onChange={(e) => {
                  const newTitle = e.target.value as TitleType;
                  const titleLower = newTitle.toLowerCase();
                  // If changing away from strata/owners corp, clear body corp fields
                  if (!titleLower.includes('strata') && !titleLower.includes('owners corp')) {
                    updatePropertyDescription({ 
                      title: newTitle,
                      bodyCorpPerQuarter: '',
                      bodyCorpDescription: ''
                    });
                  } else {
                    updatePropertyDescription({ title: newTitle });
                  }
                }}
                className="input-field"
                required
              >
                <option value="">Select...</option>
                <option value="Individual">Individual</option>
                <option value="Green">Green</option>
                <option value="Torrens">Torrens</option>
                <option value="Strata">Strata</option>
                <option value="Owners Corp (Community)">Owners Corp (Community)</option>
                <option value="Survey Strata">Survey Strata</option>
                <option value="Built Strata">Built Strata</option>
                <option value="TBC">TBC</option>
              </select>
            </div>

            {/* Body Corp Per Quarter - Only show if Title contains "strata" or "owners corp" */}
            {(propertyDescription?.title?.toLowerCase().includes('strata') || 
              propertyDescription?.title?.toLowerCase().includes('owners corp')) && (
              <div>
                <label className="label-field">Body Corp Per Quarter ($) *</label>
                <input
                  type="text"
                  value={formatCurrency(propertyDescription?.bodyCorpPerQuarter)}
                  onChange={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    const upperValue = rawValue.toUpperCase();
                    // Allow: empty, numbers, or TBC (allow typing T, TB, TBC)
                    const isNumeric = /^\d+$/.test(rawValue);
                    const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                    if (rawValue === '' || isNumeric || isTBC) {
                      updatePropertyDescription({ bodyCorpPerQuarter: isTBC ? upperValue : rawValue });
                    }
                  }}
                  onBlur={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                      const formatted = formatCurrency(rawValue);
                      if (formatted !== e.target.value) {
                        updatePropertyDescription({ bodyCorpPerQuarter: rawValue });
                      }
                    }
                  }}
                  className="input-field"
                  placeholder="e.g., $500 or TBC"
                  required
                />
              </div>
            )}
          </div>

          {/* Body Corp Description - Only show if Title contains "strata" or "owners corp" */}
          {(propertyDescription?.title?.toLowerCase().includes('strata') || 
            propertyDescription?.title?.toLowerCase().includes('owners corp')) && (
            <div className="mt-4">
              <label className="label-field">Body Corp Description (Text will appear exactly as typed in email template)</label>
              <textarea
                value={propertyDescription?.bodyCorpDescription || ''}
                onChange={(e) => updatePropertyDescription({ bodyCorpDescription: e.target.value })}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="input-field resize-none overflow-hidden"
                rows={3}
                placeholder="Describe what's included in body corp"
                spellCheck={true}
              />
            </div>
          )}


          {/* Property Description Additional Dialogue - Collapsible */}
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setIsPropertyDescriptionAdditionalDialogueExpanded(!isPropertyDescriptionAdditionalDialogueExpanded)}
              className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
            >
              <span className="font-semibold text-gray-900">Property Description Additional Dialogue (Text will appear exactly as typed in email template)</span>
              <svg
                className={`w-4 h-4 text-gray-500 transition-transform ${isPropertyDescriptionAdditionalDialogueExpanded ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isPropertyDescriptionAdditionalDialogueExpanded && (
              <div className="p-4 bg-white">
                <textarea
                  value={propertyDescription?.propertyDescriptionAdditionalDialogue || ''}
                  onChange={(e) => updatePropertyDescription({ propertyDescriptionAdditionalDialogue: e.target.value })}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = 'auto';
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                  className="input-field resize-none overflow-hidden"
                  rows={4}
                  placeholder="Any additional details about the property"
                  spellCheck={true}
                />
              </div>
            )}
          </div>
        </div>

        {/* Purchase Price Section */}
        <div className="border-b pb-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Purchase Price</h3>
          
          <div className="space-y-4">
            {/* Asking and Asking Text - Only for Established */}
            {isEstablished && (
              <>
                <div>
                  <label className="label-field">Asking *</label>
                  <select
                    value={purchasePrice?.asking || ''}
                    onChange={(e) => updatePurchasePrice({ asking: e.target.value as AskingType })}
                    className="input-field"
                    required
                  >
                    <option value="">Select...</option>
                    <option value="On-market">On-market</option>
                    <option value="Off-market">Off-market</option>
                    <option value="Pre-launch">Pre-launch</option>
                    <option value="Coming Soon">Coming Soon</option>
                    <option value="TBC">TBC</option>
                  </select>
                </div>

                <div>
                  <label className="label-field">Asking Text *</label>
                  <input
                    type="text"
                    value={purchasePrice?.askingText || ''}
                    onChange={(e) => updatePurchasePrice({ askingText: e.target.value })}
                    className="input-field"
                    placeholder="e.g., $650,000, Contact Agent"
                    spellCheck={true}
                    required
                  />
                </div>
              </>
            )}

            {/* Total Price - Only for Single Contract (02 Single Comms) */}
            {isHAndL && isSingleContract && (
              <div>
                <label className="label-field">Total Price ($) *</label>
                <input
                  type="text"
                  value={formatCurrency(purchasePrice?.totalPrice)}
                  onChange={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    const upperValue = rawValue.toUpperCase();
                    const isNumeric = /^\d+$/.test(rawValue);
                    const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                    if (rawValue === '' || isNumeric || isTBC) {
                      updatePurchasePrice({ totalPrice: isTBC ? upperValue : rawValue });
                    }
                  }}
                  onBlur={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                      const formatted = formatCurrency(rawValue);
                      if (formatted !== e.target.value) {
                        updatePurchasePrice({ totalPrice: rawValue });
                      }
                    }
                  }}
                  className="input-field max-w-md"
                  placeholder="e.g., $650,000 or TBC"
                  required
                />
              </div>
            )}

            {/* Land Price and Build Price - Only for H&L (not Single Contract) */}
            {isHAndL && !isSingleContract && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Land Price ($) *</label>
                  <input
                    type="text"
                    value={formatCurrency(purchasePrice?.landPrice)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updatePurchasePrice({ landPrice: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updatePurchasePrice({ landPrice: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $300,000 or TBC"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Build Price ($) *</label>
                  <input
                    type="text"
                    value={formatCurrency(purchasePrice?.buildPrice)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updatePurchasePrice({ buildPrice: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updatePurchasePrice({ buildPrice: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $350,000 or TBC"
                    required
                  />
                </div>
              </div>
            )}

            {/* Cashback/Rebate - Only for Contract Types 01, 02, 03 */}
            {hasCashbackRebate && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Cashback/Rebate Value ($)</label>
                  <input
                    type="text"
                    value={formatCurrency(purchasePrice?.cashbackRebateValue)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updatePurchasePrice({ cashbackRebateValue: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updatePurchasePrice({ cashbackRebateValue: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $5,000 or TBC"
                  />
                </div>
                <div>
                  <label className="label-field">Cashback/Rebate Type</label>
                  <select
                    value={purchasePrice?.cashbackRebateType || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      updatePurchasePrice({ 
                        cashbackRebateType: value === '' ? undefined : value as 'Cashback' | 'Rebate on Land' | 'Rebate on Build'
                      });
                    }}
                    className="input-field"
                  >
                    <option value="">Select...</option>
                    <option value="Cashback">Cashback</option>
                    <option value="Rebate on Land">Rebate on Land</option>
                    <option value="Rebate on Build">Rebate on Build</option>
                  </select>
                </div>
              </div>
            )}

            {/* Calculated Net Price - Only for H&L with Cashback */}
            {isHAndL && hasCashbackRebate && purchasePrice?.cashbackRebateType === 'Cashback' && (
              <div className="pt-3 border-t">
                <div>
                  <label className="label-field">Net Price</label>
                  <input
                    type="text"
                    value={netPrice !== null ? formatCurrency(String(netPrice)) : ''}
                    readOnly
                    className="input-field bg-gray-100 cursor-not-allowed font-semibold max-w-md"
                    placeholder={isSingleContract ? "Enter Total Price and Cashback to calculate" : "Enter Land Price, Build Price, and Cashback to calculate"}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Auto-calculated: Total - Cashback Value
                    {purchasePrice?.cashbackRebateValue && netPrice !== null && (
                      <span className="ml-1">(when considering the {formatCurrency(purchasePrice.cashbackRebateValue)} cashback)</span>
                    )}
                  </p>
                </div>
              </div>
            )}

            <div>
              <label className="label-field">Comparable Sales (Text will appear exactly as typed in email template) *</label>
              <textarea
                value={purchasePrice?.comparableSales || ''}
                onChange={(e) => updatePurchasePrice({ comparableSales: e.target.value })}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="input-field resize-none overflow-hidden"
                rows={3}
                placeholder="List comparable sales"
                spellCheck={true}
                required
              />
            </div>

            {/* Acceptable Acquisition From & To - Only for Established */}
            {isEstablished && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Acceptable Acquisition From ($) *</label>
                  <input
                    type="text"
                    value={formatCurrency(purchasePrice?.acceptableAcquisitionFrom)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      // Allow: empty, numbers, or TBC (allow typing T, TB, TBC)
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updatePurchasePrice({ acceptableAcquisitionFrom: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      // Re-format on blur to ensure proper formatting
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updatePurchasePrice({ acceptableAcquisitionFrom: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $600,000 or TBC"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Acceptable Acquisition To ($) *</label>
                  <input
                    type="text"
                    value={formatCurrency(purchasePrice?.acceptableAcquisitionTo)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      // Allow: empty, numbers, or TBC (allow typing T, TB, TBC)
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updatePurchasePrice({ acceptableAcquisitionTo: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      // Re-format on blur to ensure proper formatting
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updatePurchasePrice({ acceptableAcquisitionTo: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $650,000 or TBC"
                    required
                  />
                </div>
              </div>
            )}

            {/* Purchase Price Additional Dialogue - Collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsPurchasePriceAdditionalDialogueExpanded(!isPurchasePriceAdditionalDialogueExpanded)}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
              >
                <span className="font-semibold text-gray-900">Purchase Price Additional Dialogue (Text will appear exactly as typed in email template)</span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isPurchasePriceAdditionalDialogueExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isPurchasePriceAdditionalDialogueExpanded && (
                <div className="p-4 bg-white">
                  <textarea
                    value={purchasePrice?.purchasePriceAdditionalDialogue || ''}
                    onChange={(e) => updatePurchasePrice({ purchasePriceAdditionalDialogue: e.target.value })}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    className="input-field resize-none overflow-hidden"
                    rows={3}
                    placeholder="Any additional details about purchase price"
                    spellCheck={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Rental Assessment Section */}
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Rental Assessment</h3>
          
          <div className="space-y-4">
            {/* Occupancy - Only for Established properties */}
            {isEstablished && (
              <>
                {isDualOccupancy ? (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Unit A Occupancy */}
                    <div>
                      <label className="label-field">Occupancy (Unit A) *</label>
                      <select
                        value={rentalAssessment?.occupancyPrimary || ''}
                        onChange={(e) => {
                          const newOccupancy = e.target.value as OccupancyType;
                          // Clear Current Rent and Expiry fields if changing away from Tenanted
                          if (newOccupancy !== 'Tenanted') {
                            updateRentalAssessment({
                              occupancyPrimary: newOccupancy,
                              currentRentPrimary: '',
                              expiryPrimary: '',
                              yield: '', // Clear Current Yield too since it's based on Current Rent
                            });
                          } else {
                            updateRentalAssessment({ occupancyPrimary: newOccupancy });
                          }
                        }}
                        className="input-field"
                        required
                      >
                        <option value="">Select...</option>
                        <option value="Owner Occupied">Owner Occupied</option>
                        <option value="Tenanted">Tenanted</option>
                        <option value="Vacant">Vacant</option>
                      </select>
                    </div>

                    {/* Unit B Occupancy */}
                    <div>
                      <label className="label-field">Occupancy (Unit B) *</label>
                      <select
                        value={rentalAssessment?.occupancySecondary || ''}
                        onChange={(e) => {
                          const newOccupancy = e.target.value as OccupancyType;
                          // Clear Current Rent and Expiry fields if changing away from Tenanted
                          if (newOccupancy !== 'Tenanted') {
                            updateRentalAssessment({
                              occupancySecondary: newOccupancy,
                              currentRentSecondary: '',
                              expirySecondary: '',
                              yield: '', // Clear Current Yield too since it's based on Current Rent
                            });
                          } else {
                            updateRentalAssessment({ occupancySecondary: newOccupancy });
                          }
                        }}
                        className="input-field"
                        required
                      >
                        <option value="">Select...</option>
                        <option value="Owner Occupied">Owner Occupied</option>
                        <option value="Tenanted">Tenanted</option>
                        <option value="Vacant">Vacant</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="label-field">Occupancy *</label>
                    <select
                      value={rentalAssessment?.occupancyPrimary || ''}
                      onChange={(e) => {
                        const newOccupancy = e.target.value as OccupancyType;
                        // Clear Current Rent and Expiry fields if changing away from Tenanted
                        if (newOccupancy !== 'Tenanted') {
                          updateRentalAssessment({
                            occupancyPrimary: newOccupancy,
                            currentRentPrimary: '',
                            currentRentSecondary: '',
                            expiryPrimary: '',
                            expirySecondary: '',
                            yield: '', // Clear Current Yield too since it's based on Current Rent
                          });
                        } else {
                          updateRentalAssessment({ occupancyPrimary: newOccupancy });
                        }
                      }}
                      className="input-field"
                      required
                    >
                      <option value="">Select...</option>
                      <option value="Owner Occupied">Owner Occupied</option>
                      <option value="Tenanted">Tenanted</option>
                      <option value="Vacant">Vacant</option>
                    </select>
                  </div>
                )}
              </>
            )}

            {/* Current Rent and Expiry - Only show if Occupancy is Tenanted AND Established */}
            {isEstablished && (
              (isDualOccupancy 
                ? (rentalAssessment?.occupancyPrimary === 'Tenanted' || rentalAssessment?.occupancySecondary === 'Tenanted')
                : rentalAssessment?.occupancyPrimary === 'Tenanted') && (
              <div>
                {isDualOccupancy ? (
                  <div className="grid grid-cols-2 gap-6">
                    {/* Unit A (Left) */}
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit A</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="label-field">Current Rent ($ per week) *</label>
                          <input
                            type="text"
                            value={formatCurrency(rentalAssessment?.currentRentPrimary)}
                            onChange={(e) => {
                              const rawValue = parseCurrency(e.target.value);
                              const upperValue = rawValue.toUpperCase();
                              const isNumeric = /^\d+$/.test(rawValue);
                              const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                              if (rawValue === '' || isNumeric || isTBC) {
                                updateRentalAssessment({ currentRentPrimary: isTBC ? upperValue : rawValue });
                              }
                            }}
                            onBlur={(e) => {
                              const rawValue = parseCurrency(e.target.value);
                              if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                                const formatted = formatCurrency(rawValue);
                                if (formatted !== e.target.value) {
                                  updateRentalAssessment({ currentRentPrimary: rawValue });
                                }
                              }
                            }}
                            className="input-field"
                            placeholder="e.g., $500 or TBC"
                            required={rentalAssessment?.occupancyPrimary === 'Tenanted'}
                          />
                        </div>
                        <div>
                          <label className="label-field">Expiry{rentalAssessment?.occupancyPrimary === 'Tenanted' ? ' *' : ''}</label>
                          {(() => {
                            const expiryData = parseExpiry(rentalAssessment?.expiryPrimary);
                            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                                            'July', 'August', 'September', 'October', 'November', 'December'];
                            const years = getYearOptions();
                            const isRequired = rentalAssessment?.occupancyPrimary === 'Tenanted' && !expiryData.isTBC;
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={expiryData.isTBC}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateRentalAssessment({ expiryPrimary: 'TBC' });
                                      } else {
                                        updateRentalAssessment({ expiryPrimary: '' });
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <label className="text-sm text-gray-700">TBC</label>
                                </div>
                                {!expiryData.isTBC && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      value={expiryData.month}
                                      onChange={(e) => {
                                        const month = e.target.value;
                                        const formatted = formatExpiry(month, expiryData.year, false);
                                        updateRentalAssessment({ expiryPrimary: formatted });
                                      }}
                                      className="input-field"
                                      required={isRequired}
                                    >
                                      <option value="">Select Month</option>
                                      {months.map(month => (
                                        <option key={month} value={month}>{month}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={expiryData.year}
                                      onChange={(e) => {
                                        const year = e.target.value;
                                        const formatted = formatExpiry(expiryData.month, year, false);
                                        updateRentalAssessment({ expiryPrimary: formatted });
                                      }}
                                      className="input-field"
                                      required={isRequired}
                                    >
                                      <option value="">Select Year</option>
                                      {years.map(year => (
                                        <option key={year} value={String(year)}>{year}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Unit B (Right) */}
                    <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                      <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit B</h4>
                      <div className="space-y-4">
                        <div>
                          <label className="label-field">Current Rent ($ per week) *</label>
                          <input
                            type="text"
                            value={formatCurrency(rentalAssessment?.currentRentSecondary)}
                            onChange={(e) => {
                              const rawValue = parseCurrency(e.target.value);
                              const upperValue = rawValue.toUpperCase();
                              const isNumeric = /^\d+$/.test(rawValue);
                              const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                              if (rawValue === '' || isNumeric || isTBC) {
                                updateRentalAssessment({ currentRentSecondary: isTBC ? upperValue : rawValue });
                              }
                            }}
                            onBlur={(e) => {
                              const rawValue = parseCurrency(e.target.value);
                              if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                                const formatted = formatCurrency(rawValue);
                                if (formatted !== e.target.value) {
                                  updateRentalAssessment({ currentRentSecondary: rawValue });
                                }
                              }
                            }}
                            className="input-field"
                            placeholder="e.g., $400 or TBC"
                            required={rentalAssessment?.occupancySecondary === 'Tenanted'}
                          />
                        </div>
                        <div>
                          <label className="label-field">Expiry{rentalAssessment?.occupancySecondary === 'Tenanted' ? ' *' : ''}</label>
                          {(() => {
                            const expiryData = parseExpiry(rentalAssessment?.expirySecondary);
                            const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                                            'July', 'August', 'September', 'October', 'November', 'December'];
                            const years = getYearOptions();
                            const isRequired = rentalAssessment?.occupancySecondary === 'Tenanted' && !expiryData.isTBC;
                            
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <input
                                    type="checkbox"
                                    checked={expiryData.isTBC}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        updateRentalAssessment({ expirySecondary: 'TBC' });
                                      } else {
                                        updateRentalAssessment({ expirySecondary: '' });
                                      }
                                    }}
                                    className="w-4 h-4"
                                  />
                                  <label className="text-sm text-gray-700">TBC</label>
                                </div>
                                {!expiryData.isTBC && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <select
                                      value={expiryData.month}
                                      onChange={(e) => {
                                        const month = e.target.value;
                                        const formatted = formatExpiry(month, expiryData.year, false);
                                        updateRentalAssessment({ expirySecondary: formatted });
                                      }}
                                      className="input-field"
                                      required={isRequired}
                                    >
                                      <option value="">Select Month</option>
                                      {months.map(month => (
                                        <option key={month} value={month}>{month}</option>
                                      ))}
                                    </select>
                                    <select
                                      value={expiryData.year}
                                      onChange={(e) => {
                                        const year = e.target.value;
                                        const formatted = formatExpiry(expiryData.month, year, false);
                                        updateRentalAssessment({ expirySecondary: formatted });
                                      }}
                                      className="input-field"
                                      required={isRequired}
                                    >
                                      <option value="">Select Year</option>
                                      {years.map(year => (
                                        <option key={year} value={String(year)}>{year}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="label-field">Current Rent ($ per week) *</label>
                      <input
                        type="text"
                        value={formatCurrency(rentalAssessment?.currentRentPrimary)}
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          const upperValue = rawValue.toUpperCase();
                          const isNumeric = /^\d+$/.test(rawValue);
                          const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                          if (rawValue === '' || isNumeric || isTBC) {
                            updateRentalAssessment({ currentRentPrimary: isTBC ? upperValue : rawValue });
                          }
                        }}
                        onBlur={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                            const formatted = formatCurrency(rawValue);
                            if (formatted !== e.target.value) {
                              updateRentalAssessment({ currentRentPrimary: rawValue });
                            }
                          }
                        }}
                        className="input-field"
                        placeholder="e.g., $500 or TBC"
                        required={rentalAssessment?.occupancyPrimary === 'Tenanted'}
                      />
                    </div>
                    <div>
                      <label className="label-field">Expiry{rentalAssessment?.occupancyPrimary === 'Tenanted' ? ' *' : ''}</label>
                      {(() => {
                        const expiryData = parseExpiry(rentalAssessment?.expiryPrimary);
                        const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                                        'July', 'August', 'September', 'October', 'November', 'December'];
                        const years = getYearOptions();
                        const isRequired = rentalAssessment?.occupancyPrimary === 'Tenanted' && !expiryData.isTBC;
                        
                        return (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={expiryData.isTBC}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    updateRentalAssessment({ expiryPrimary: 'TBC' });
                                  } else {
                                    updateRentalAssessment({ expiryPrimary: '' });
                                  }
                                }}
                                className="w-4 h-4"
                              />
                              <label className="text-sm text-gray-700">TBC</label>
                            </div>
                            {!expiryData.isTBC && (
                              <div className="grid grid-cols-2 gap-2">
                                <select
                                  value={expiryData.month}
                                  onChange={(e) => {
                                    const month = e.target.value;
                                    const formatted = formatExpiry(month, expiryData.year, false);
                                    updateRentalAssessment({ expiryPrimary: formatted });
                                  }}
                                  className="input-field"
                                  required={isRequired}
                                >
                                  <option value="">Select Month</option>
                                  {months.map(month => (
                                    <option key={month} value={month}>{month}</option>
                                  ))}
                                </select>
                                <select
                                  value={expiryData.year}
                                  onChange={(e) => {
                                    const year = e.target.value;
                                    const formatted = formatExpiry(expiryData.month, year, false);
                                    updateRentalAssessment({ expiryPrimary: formatted });
                                  }}
                                  className="input-field"
                                  required={isRequired}
                                >
                                  <option value="">Select Year</option>
                                  {years.map(year => (
                                    <option key={year} value={String(year)}>{year}</option>
                                  ))}
                                </select>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
              )
            )}

            {/* Rent Appraisal - Boxed sections for dual occupancy */}
            {isDualOccupancy ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Unit A (Left) */}
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit A</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label-field">Rent Appraisal From ($ per week) *</label>
                      <input
                        type="text"
                        value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryFrom)}
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          const upperValue = rawValue.toUpperCase();
                          const isNumeric = /^\d+$/.test(rawValue);
                          const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                          if (rawValue === '' || isNumeric || isTBC) {
                            updateRentalAssessment({ rentAppraisalPrimaryFrom: isTBC ? upperValue : rawValue });
                          }
                        }}
                        onBlur={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                            const formatted = formatCurrency(rawValue);
                            if (formatted !== e.target.value) {
                              updateRentalAssessment({ rentAppraisalPrimaryFrom: rawValue });
                            }
                          }
                        }}
                        className="input-field"
                        placeholder="e.g., $500 or TBC"
                        required
                      />
                    </div>
                    <div>
                      <label className="label-field">Rent Appraisal To ($ per week) *</label>
                      <input
                        type="text"
                        value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryTo)}
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          const upperValue = rawValue.toUpperCase();
                          const isNumeric = /^\d+$/.test(rawValue);
                          const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                          if (rawValue === '' || isNumeric || isTBC) {
                            updateRentalAssessment({ rentAppraisalPrimaryTo: isTBC ? upperValue : rawValue });
                          }
                        }}
                        onBlur={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                            const formatted = formatCurrency(rawValue);
                            if (formatted !== e.target.value) {
                              updateRentalAssessment({ rentAppraisalPrimaryTo: rawValue });
                            }
                          }
                        }}
                        className="input-field"
                        placeholder="e.g., $550 or TBC"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Unit B (Right) */}
                <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit B</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="label-field">Rent Appraisal From ($ per week) *</label>
                      <input
                        type="text"
                        value={formatCurrency(rentalAssessment?.rentAppraisalSecondaryFrom)}
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          const upperValue = rawValue.toUpperCase();
                          const isNumeric = /^\d+$/.test(rawValue);
                          const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                          if (rawValue === '' || isNumeric || isTBC) {
                            updateRentalAssessment({ rentAppraisalSecondaryFrom: isTBC ? upperValue : rawValue });
                          }
                        }}
                        onBlur={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                            const formatted = formatCurrency(rawValue);
                            if (formatted !== e.target.value) {
                              updateRentalAssessment({ rentAppraisalSecondaryFrom: rawValue });
                            }
                          }
                        }}
                        className="input-field"
                        placeholder="e.g., $400 or TBC"
                        required
                      />
                    </div>
                    <div>
                      <label className="label-field">Rent Appraisal To ($ per week) *</label>
                      <input
                        type="text"
                        value={formatCurrency(rentalAssessment?.rentAppraisalSecondaryTo)}
                        onChange={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          const upperValue = rawValue.toUpperCase();
                          const isNumeric = /^\d+$/.test(rawValue);
                          const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                          if (rawValue === '' || isNumeric || isTBC) {
                            updateRentalAssessment({ rentAppraisalSecondaryTo: isTBC ? upperValue : rawValue });
                          }
                        }}
                        onBlur={(e) => {
                          const rawValue = parseCurrency(e.target.value);
                          if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                            const formatted = formatCurrency(rawValue);
                            if (formatted !== e.target.value) {
                              updateRentalAssessment({ rentAppraisalSecondaryTo: rawValue });
                            }
                          }
                        }}
                        className="input-field"
                        placeholder="e.g., $450 or TBC"
                        required
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-field">Rent Appraisal From ($ per week) *</label>
                  <input
                    type="text"
                    value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryFrom)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updateRentalAssessment({ rentAppraisalPrimaryFrom: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateRentalAssessment({ rentAppraisalPrimaryFrom: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $500 or TBC"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Rent Appraisal To ($ per week) *</label>
                  <input
                    type="text"
                    value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryTo)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updateRentalAssessment({ rentAppraisalPrimaryTo: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateRentalAssessment({ rentAppraisalPrimaryTo: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $550 or TBC"
                    required
                  />
                </div>
              </div>
            )}

            {/* Current Yield - Auto-calculated, only show if Tenanted AND Established */}
            {isEstablished && rentalAssessment?.occupancyPrimary === 'Tenanted' && (
              <div>
                <label className="label-field">Current Yield (%)</label>
                <input
                  type="text"
                  value={rentalAssessment?.yield || (currentYield !== null ? `~ ${currentYield}%` : '')}
                  readOnly
                  className="input-field bg-gray-100 cursor-not-allowed"
                  placeholder={propertyPrice ? 'Auto-calculated' : 'Enter Acceptable Acquisition To to calculate'}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated: ({isDualOccupancy ? '(Unit A + Unit B Rent)' : 'Current Rent'} × 52 / Property Price) × 100
                  {!propertyPrice && ' - Property Price needed'}
                </p>
              </div>
            )}

            <div>
              <label className="label-field">Appraised Yield (%)</label>
              <input
                type="text"
                value={rentalAssessment?.appraisedYield || (appraisedYield !== null ? `~ ${appraisedYield}%` : '')}
                readOnly
                className="input-field bg-gray-100 cursor-not-allowed"
                placeholder={propertyPrice ? 'Auto-calculated' : 'Enter Acceptable Acquisition To to calculate'}
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated: (Rent Appraisal To × 52 / Property Price) × 100
                {!propertyPrice && ' - Property Price needed'}
              </p>
            </div>

            {/* Rental Assessment Additional Dialogue - Collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setIsRentalAssessmentAdditionalDialogueExpanded(!isRentalAssessmentAdditionalDialogueExpanded)}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
              >
                <span className="font-semibold text-gray-900">Rental Assessment Additional Dialogue (Text will appear exactly as typed in email template)</span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${isRentalAssessmentAdditionalDialogueExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {isRentalAssessmentAdditionalDialogueExpanded && (
                <div className="p-4 bg-white">
                  <textarea
                    value={rentalAssessment?.rentalAssessmentAdditionalDialogue || ''}
                    onChange={(e) => updateRentalAssessment({ rentalAssessmentAdditionalDialogue: e.target.value })}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    className="input-field resize-none overflow-hidden"
                    rows={3}
                    placeholder="Any additional details about rental assessment"
                    spellCheck={true}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Project Lots View Component
function ProjectLotsView() {
  const { formData, updateLotPropertyDescription, updateLotPurchasePrice, updateLotRentalAssessment, replicateLotData, updatePurchasePrice, updatePropertyDescription, updateRentalAssessment, updateAddress } = useFormStore();
  const { lots, decisionTree, purchasePrice, propertyDescription, rentalAssessment } = formData;
  const [expandedLots, setExpandedLots] = useState<Set<number>>(new Set([0])); // First lot expanded by default
  const [isProjectFieldsExpanded, setIsProjectFieldsExpanded] = useState<boolean>(true); // Project fields expanded by default
  const [expandedProjectSections, setExpandedProjectSections] = useState<Set<string>>(new Set(['address', 'comparableSales', 'cashback'])); // Project Brief (overview) collapsed by default as it's not mandatory
  const [expandedAdditionalInfoSections, setExpandedAdditionalInfoSections] = useState<Set<string>>(new Set()); // All additional info sections collapsed by default as they're not mandatory
  
  // Track which sections are expanded in each lot: Map<lotIndex, Set<sectionType>>
  const [expandedLotSections, setExpandedLotSections] = useState<Map<number, Set<string>>>(new Map());
  
  // Initialize all sections as expanded for all lots
  useEffect(() => {
    if (lots && lots.length > 0) {
      const initialExpanded = new Map<number, Set<string>>();
      lots.forEach((_, index) => {
        initialExpanded.set(index, new Set(['propertyDescription', 'purchasePrice', 'rentalAssessment']));
      });
      setExpandedLotSections(initialExpanded);
    }
  }, [lots?.length]);
  
  // Sync propertyAddress to projectAddress when checkbox is checked
  useEffect(() => {
    if (formData.address?.usePropertyAddressForProject && formData.address?.propertyAddress) {
      updateAddress({ projectAddress: formData.address.propertyAddress });
    }
  }, [formData.address?.propertyAddress, formData.address?.usePropertyAddressForProject, updateAddress]);

  // Clear lot-level secondary fields when lot's singleOrDual changes from "Yes" to "No" or empty
  useEffect(() => {
    if (lots && lots.length > 0) {
      lots.forEach((lot, lotIndex) => {
        // For projects, check each lot's singleOrDual field
        // For non-projects, check decisionTree.dualOccupancy
        const isDual = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple'
          ? lot.singleOrDual === 'Yes'
          : decisionTree.dualOccupancy === 'Yes';
        
        // If this lot is NOT dual occupancy, clear its secondary fields
        if (!isDual) {
          const hasSecondaryFields = 
            lot.propertyDescription?.bedsSecondary ||
            lot.propertyDescription?.bathSecondary ||
            lot.propertyDescription?.garageSecondary ||
            lot.propertyDescription?.carportSecondary ||
            lot.propertyDescription?.carspaceSecondary;
          
          if (hasSecondaryFields) {
            updateLotPropertyDescription(lotIndex, {
              bedsSecondary: undefined,
              bathSecondary: undefined,
              garageSecondary: undefined,
              carportSecondary: undefined,
              carspaceSecondary: undefined,
            });
          }
        }
      });
    }
  }, [decisionTree.dualOccupancy, decisionTree.propertyType, decisionTree.lotType, lots, updateLotPropertyDescription]);
  
  const toggleLotSection = (lotIndex: number, sectionType: 'propertyDescription' | 'purchasePrice' | 'rentalAssessment') => {
    const newExpanded = new Map(expandedLotSections);
    const lotSections = newExpanded.get(lotIndex) || new Set<string>();
    const newLotSections = new Set(lotSections);
    
    if (newLotSections.has(sectionType)) {
      newLotSections.delete(sectionType);
    } else {
      newLotSections.add(sectionType);
    }
    
    newExpanded.set(lotIndex, newLotSections);
    setExpandedLotSections(newExpanded);
  };
  
  const expandAllSectionsOfType = (sectionType: 'propertyDescription' | 'purchasePrice' | 'rentalAssessment') => {
    if (!lots) return;
    const newExpanded = new Map(expandedLotSections);
    lots.forEach((_, index) => {
      const lotSections = newExpanded.get(index) || new Set<string>();
      const newLotSections = new Set(lotSections);
      newLotSections.add(sectionType);
      newExpanded.set(index, newLotSections);
    });
    setExpandedLotSections(newExpanded);
  };
  
  const collapseAllSectionsOfType = (sectionType: 'propertyDescription' | 'purchasePrice' | 'rentalAssessment') => {
    if (!lots) return;
    const newExpanded = new Map(expandedLotSections);
    lots.forEach((_, index) => {
      const lotSections = newExpanded.get(index) || new Set<string>();
      const newLotSections = new Set(lotSections);
      newLotSections.delete(sectionType);
      newExpanded.set(index, newLotSections);
    });
    setExpandedLotSections(newExpanded);
  };
  
  const toggleProjectSection = (section: string) => {
    const newExpanded = new Set(expandedProjectSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
      // Auto-resize textareas when section expands
      setTimeout(() => {
        if (section === 'comparableSales') {
          const textarea = document.querySelector('[data-comparable-sales]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
          }
        } else if (section === 'overview') {
          const textarea = document.querySelector('[data-project-overview]') as HTMLTextAreaElement;
          if (textarea) {
            textarea.style.height = 'auto';
            textarea.style.height = `${textarea.scrollHeight}px`;
          }
        }
      }, 0);
    }
    setExpandedProjectSections(newExpanded);
  };

  const toggleAdditionalInfoSection = (section: string) => {
    const newExpanded = new Set(expandedAdditionalInfoSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedAdditionalInfoSections(newExpanded);
  };
  
  // Helper functions (same as main component)
  const formatCurrency = (value: string | undefined): string => {
    if (!value || value === '' || value.toUpperCase() === 'TBC') return value || '';
    const numValue = value.replace(/,/g, '');
    if (isNaN(Number(numValue))) return value;
    return '$' + Number(numValue).toLocaleString('en-US');
  };
  
  const parseCurrency = (value: string): string => {
    if (!value) return '';
    const upperValue = value.toUpperCase();
    if (upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC') return upperValue;
    return value.replace(/[$,]/g, '');
  };
  
  const parseExpiry = (value: string | undefined): { month: string; year: string; isTBC: boolean } => {
    if (!value) return { month: '', year: '', isTBC: false };
    if (value.toUpperCase() === 'TBC') return { month: '', year: '', isTBC: true };
    if (value.toUpperCase() === 'REGISTERED') return { month: '', year: '', isTBC: false };
    const trimmed = value.replace(/\s+approx\.?$/i, '').trim();
    const parts = trimmed.split(/\s+/);
    if (parts.length === 2 && parts[0] && parts[1]) {
      return { month: parts[0], year: parts[1], isTBC: false };
    }
    if (trimmed.endsWith(' ') && trimmed.trim().length > 0) {
      return { month: trimmed.trim(), year: '', isTBC: false };
    }
    if (trimmed.startsWith(' ') && trimmed.trim().length > 0) {
      return { month: '', year: trimmed.trim(), isTBC: false };
    }
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    if (months.includes(trimmed)) {
      return { month: trimmed, year: '', isTBC: false };
    }
    if (/^\d{4}$/.test(trimmed)) {
      return { month: '', year: trimmed, isTBC: false };
    }
    return { month: '', year: '', isTBC: false };
  };
  
  const formatExpiry = (month: string, year: string, isTBC: boolean): string => {
    if (isTBC) return 'TBC';
    if (month && year) return `${month} ${year}`;
    if (month) return `${month} `;
    if (year) return ` ${year}`;
    return '';
  };
  
  const getYearOptions = (): number[] => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 11 }, (_, i) => currentYear + i);
  };
  
  const toggleLot = (index: number) => {
    const newExpanded = new Set(expandedLots);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedLots(newExpanded);
  };
  
  const expandAllLots = () => {
    setExpandedLots(new Set((lots || []).map((_, i) => i)));
  };
  
  const collapseAllLots = () => {
    setExpandedLots(new Set());
  };
  
  // Find first lot index of each type (single vs dual)
  const firstSingleIndex = useMemo(() => {
    return (lots || []).findIndex(lot => lot.singleOrDual !== 'Yes');
  }, [lots]);
  
  const firstDualIndex = useMemo(() => {
    return (lots || []).findIndex(lot => lot.singleOrDual === 'Yes');
  }, [lots]);
  
  const handleReplicateSection = (sourceIndex: number, section: 'propertyDescription' | 'purchasePrice' | 'rentalAssessment', targetType?: 'same' | 'all') => {
    if (!lots || lots.length === 0) return;
    const sourceLot = lots[sourceIndex];
    const isSourceDual = sourceLot?.singleOrDual === 'Yes';
    
    let targetIndices: number[];
    if (targetType === 'same') {
      // Replicate only to lots of the same type (single to single, dual to dual)
      targetIndices = lots
        .map((_, i) => i)
        .filter(i => {
          if (i === sourceIndex) return false;
          const lotIsDual = lots[i]?.singleOrDual === 'Yes';
          return lotIsDual === isSourceDual;
        });
    } else {
      // Replicate to all other lots
      targetIndices = lots.map((_, i) => i).filter(i => i !== sourceIndex);
    }
    
    replicateLotData(sourceIndex, targetIndices, [section]);
  };
  
  const handleReplicateEntireLot = (sourceIndex: number, targetType?: 'same' | 'all') => {
    if (!lots || lots.length === 0) return;
    const sourceLot = lots[sourceIndex];
    const isSourceDual = sourceLot?.singleOrDual === 'Yes';
    
    let targetIndices: number[];
    if (targetType === 'same') {
      // Replicate only to lots of the same type (single to single, dual to dual)
      targetIndices = lots
        .map((_, i) => i)
        .filter(i => {
          if (i === sourceIndex) return false;
          const lotIsDual = lots[i]?.singleOrDual === 'Yes';
          return lotIsDual === isSourceDual;
        });
    } else {
      // Replicate to all other lots
      targetIndices = lots.map((_, i) => i).filter(i => i !== sourceIndex);
    }
    
    replicateLotData(sourceIndex, targetIndices, ['all']);
  };
  
  // Check if we have a mixture of single and dual lots
  const hasMixedOccupancy = useMemo(() => {
    if (!lots || lots.length === 0) return false;
    const hasSingle = lots.some(lot => lot.singleOrDual !== 'Yes');
    const hasDual = lots.some(lot => lot.singleOrDual === 'Yes');
    return hasSingle && hasDual;
  }, [lots]);
  
  // Determine if this lot should show replication buttons
  const shouldShowReplicationButtons = (lotIndex: number, isDualOccupancy: boolean): boolean => {
    if (!hasMixedOccupancy) {
      // If all lots are the same type, only show in first lot
      return lotIndex === 0;
    } else {
      // If mixed, show in first lot of each type
      if (isDualOccupancy) {
        return lotIndex === firstDualIndex;
      } else {
        return lotIndex === firstSingleIndex;
      }
    }
  };
  
  // Check if Contract Type has cashback/rebate
  const hasCashbackRebate = decisionTree.contractType === '01 H&L Comms' || 
                            decisionTree.contractType === '02 Single Comms' || 
                            decisionTree.contractType === '03 Internal with Comms';
  
  // Check if Contract Type is 02 Single Comms (uses Total Price instead of Land + Build)
  const isSingleContract = decisionTree.contractType === '02 Single Comms';
  
  // Auto-populate cashback/rebate for lots that don't have values yet
  useEffect(() => {
    if (hasCashbackRebate && purchasePrice?.cashbackRebateValue && purchasePrice?.cashbackRebateType && lots) {
      lots.forEach((lot, index) => {
        // Only populate if lot doesn't already have values
        if (!lot.purchasePrice?.cashbackRebateValue || !lot.purchasePrice?.cashbackRebateType) {
          updateLotPurchasePrice(index, {
            cashbackRebateValue: lot.purchasePrice?.cashbackRebateValue || purchasePrice.cashbackRebateValue,
            cashbackRebateType: lot.purchasePrice?.cashbackRebateType || purchasePrice.cashbackRebateType,
          });
        }
      });
    }
  }, [hasCashbackRebate, purchasePrice?.cashbackRebateValue, purchasePrice?.cashbackRebateType, lots?.length, updateLotPurchasePrice]);
  
  if (!lots || lots.length === 0) {
    return (
      <div>
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">Property Details - Project Lots</h2>
          <p className="text-gray-600">
            Please add lots in Step 2 (Decision Tree) first.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Property Details - Project Lots</h2>
        <p className="text-gray-600">
          Enter property details for each lot. Use replication buttons to copy data across lots.
        </p>
      </div>
      
      {/* Project-Level Fields at Top - Collapsible */}
      <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsProjectFieldsExpanded(!isProjectFieldsExpanded)}
          className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
        >
          <div className="flex items-center gap-3">
            <span className="text-lg font-semibold text-gray-900">
              Project-Level Information
            </span>
          </div>
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform ${isProjectFieldsExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        
        {/* Accordion Content */}
        {isProjectFieldsExpanded && (
          <div className="p-6 bg-white space-y-4">
            {/* Project Address - Collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleProjectSection('address')}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
              >
                <span className="font-semibold text-gray-900">Project Address (Address to be shown in the email template for the Project) *</span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedProjectSections.has('address') ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedProjectSections.has('address') && (
                <div className="p-4 bg-white">
                  {/* Checkbox to use property address */}
                  <div className="mb-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.address?.usePropertyAddressForProject || false}
                        onChange={(e) => {
                          const usePropertyAddress = e.target.checked;
                          updateAddress({ 
                            usePropertyAddressForProject: usePropertyAddress,
                            // If checked, copy property address; if unchecked, keep current value
                            projectAddress: usePropertyAddress 
                              ? (formData.address?.propertyAddress || '')
                              : (formData.address?.projectAddress || '')
                          });
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Use Property Address from Step 1
                      </span>
                    </label>
                  </div>
                  
                  <input
                    type="text"
                    value={
                      formData.address?.usePropertyAddressForProject
                        ? (formData.address?.propertyAddress || '')
                        : (formData.address?.projectAddress || '')
                    }
                    onChange={(e) => {
                      if (!formData.address?.usePropertyAddressForProject) {
                        updateAddress({ projectAddress: e.target.value });
                      }
                    }}
                    onBlur={(e) => {
                      if (!formData.address?.usePropertyAddressForProject) {
                        // Trim whitespace on blur
                        const trimmed = e.target.value.trim();
                        if (trimmed !== e.target.value) {
                          updateAddress({ projectAddress: trimmed });
                        }
                      }
                    }}
                    onPaste={(e) => {
                      if (!formData.address?.usePropertyAddressForProject) {
                        // Trim whitespace on paste
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        const trimmed = pastedText.trim();
                        updateAddress({ projectAddress: trimmed });
                      } else {
                        e.preventDefault();
                      }
                    }}
                    className="input-field"
                    placeholder={formData.address?.usePropertyAddressForProject ? "Using Property Address from Step 1" : "Enter project address"}
                    spellCheck={true}
                    required
                    disabled={formData.address?.usePropertyAddressForProject || false}
                    readOnly={formData.address?.usePropertyAddressForProject || false}
                  />
                  
                  {/* Project Name - Non-mandatory */}
                  <div className="mt-4">
                    <label className="label-field">Project Name</label>
                    <input
                      type="text"
                      value={formData.address?.projectName || ''}
                      onChange={(e) => {
                        updateAddress({ projectName: e.target.value });
                      }}
                      onBlur={(e) => {
                        // Trim whitespace on blur
                        const trimmed = e.target.value.trim();
                        if (trimmed !== e.target.value) {
                          updateAddress({ projectName: trimmed });
                        }
                      }}
                      onPaste={(e) => {
                        // Trim whitespace on paste
                        e.preventDefault();
                        const pastedText = e.clipboardData.getData('text');
                        const trimmed = pastedText.trim();
                        updateAddress({ projectName: trimmed });
                      }}
                      className="input-field"
                      placeholder="To enter project name - should it have one"
                      spellCheck={true}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Comparable Sales - Shared - Collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleProjectSection('comparableSales')}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
              >
                <span className="font-semibold text-gray-900">Comparable Sales (Shared) (Text will appear exactly as typed in email template) *</span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedProjectSections.has('comparableSales') ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedProjectSections.has('comparableSales') && (
                <div className="p-4 bg-white">
                  <textarea
                    data-comparable-sales
                    value={purchasePrice?.comparableSales || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Update project-level comparable sales
                      updatePurchasePrice({ comparableSales: value });
                      // Also update all lots
                      if (lots) {
                        lots.forEach((_, index) => {
                          updateLotPurchasePrice(index, { comparableSales: value });
                        });
                      }
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    spellCheck={true}
                    autoCorrect="on"
                    autoCapitalize="on"
                    className="input-field resize-none overflow-hidden"
                    rows={3}
                    placeholder="List comparable sales (applies to all lots)"
                    required
                  />
                </div>
              )}
            </div>

            {/* Project Brief - Collapsible */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => toggleProjectSection('overview')}
                className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
              >
                <span className="font-semibold text-gray-900">Project Brief (Text will appear exactly as typed in email template)</span>
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform ${expandedProjectSections.has('overview') ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {expandedProjectSections.has('overview') && (
                <div className="p-4 bg-white">
                  <textarea
                    data-project-overview
                    value={propertyDescription?.projectOverview || ''}
                    onChange={(e) => {
                      updatePropertyDescription({ projectOverview: e.target.value });
                    }}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement;
                      target.style.height = 'auto';
                      target.style.height = `${target.scrollHeight}px`;
                    }}
                    className="input-field resize-none overflow-hidden"
                    rows={4}
                    placeholder="Enter project brief (applies to all lots)"
                    spellCheck={true}
                  />
                </div>
              )}
            </div>

            {/* Cashback/Rebate - Project Level (auto-populates lots) - Collapsible */}
            {hasCashbackRebate && (
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleProjectSection('cashback')}
                  className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
                >
                  <div>
                    <span className="font-semibold text-gray-900 block">Cashback/Rebate (Project Level)</span>
                    <span className="text-xs text-gray-600">These values will auto-populate each lot, but can be edited individually per lot.</span>
                  </div>
                  <svg
                    className={`w-4 h-4 text-gray-500 transition-transform ${expandedProjectSections.has('cashback') ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {expandedProjectSections.has('cashback') && (
                  <div className="p-4 bg-white">
                    <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">Cashback/Rebate Value ($)</label>
                <input
                  type="text"
                  value={formatCurrency(purchasePrice?.cashbackRebateValue)}
                  onChange={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    const upperValue = rawValue.toUpperCase();
                    const isNumeric = /^\d+$/.test(rawValue);
                    const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                    if (rawValue === '' || isNumeric || isTBC) {
                      const valueToSet = isTBC ? upperValue : rawValue;
                      // Update project-level
                      updatePurchasePrice({ cashbackRebateValue: valueToSet });
                      // Auto-populate all lots (only if lot doesn't already have a value)
                      if (lots) {
                        lots.forEach((lot, index) => {
                          if (!lot.purchasePrice?.cashbackRebateValue) {
                            updateLotPurchasePrice(index, { cashbackRebateValue: valueToSet });
                          }
                        });
                      }
                    }
                  }}
                  onBlur={(e) => {
                    const rawValue = parseCurrency(e.target.value);
                    if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                      const formatted = formatCurrency(rawValue);
                      if (formatted !== e.target.value) {
                        updatePurchasePrice({ cashbackRebateValue: rawValue });
                        // Auto-populate all lots (only if lot doesn't already have a value)
                        if (lots) {
                          lots.forEach((lot, index) => {
                            if (!lot.purchasePrice?.cashbackRebateValue) {
                              updateLotPurchasePrice(index, { cashbackRebateValue: rawValue });
                            }
                          });
                        }
                      }
                    }
                  }}
                  className="input-field"
                  placeholder="e.g., $20,000 or TBC"
                />
              </div>
              <div>
                <label className="label-field">Cashback/Rebate Type</label>
                <select
                  value={purchasePrice?.cashbackRebateType || ''}
                  onChange={(e) => {
                    const value = e.target.value as CashbackRebateType;
                    // Update project-level
                    updatePurchasePrice({ cashbackRebateType: value });
                    // Auto-populate all lots (only if lot doesn't already have a value)
                    if (lots) {
                      lots.forEach((lot, index) => {
                        if (!lot.purchasePrice?.cashbackRebateType) {
                          updateLotPurchasePrice(index, { cashbackRebateType: value });
                        }
                      });
                    }
                  }}
                  className="input-field"
                >
                  <option value="">Select...</option>
                  <option value="Cashback">Cashback</option>
                  <option value="Rebate on Land">Rebate on Land</option>
                  <option value="Rebate on Build">Rebate on Build</option>
                </select>
              </div>
            </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Lot Level Information */}
      <div className="mb-6 border border-gray-300 rounded-lg overflow-hidden">
        {/* Header with Expand/Collapse All buttons */}
        <div className="px-6 py-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-900">Lot Level Information</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={expandAllLots}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              >
                Expand All Lots
              </button>
              <button
                type="button"
                onClick={collapseAllLots}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-1 border border-blue-300 rounded hover:bg-blue-50"
              >
                Collapse All Lots
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Lots Accordion */}
      <div className="space-y-4">
        
        {(lots || []).map((lot, lotIndex) => {
          const isExpanded = expandedLots.has(lotIndex);
          const isDualOccupancy = lot.singleOrDual === 'Yes';
          const lotPropertyDescription = lot.propertyDescription || {};
          const lotPurchasePrice = lot.purchasePrice || {};
          const lotRentalAssessment = lot.rentalAssessment || {};
          
          return (
            <div key={lotIndex} className="border border-gray-300 rounded-lg overflow-hidden">
              {/* Accordion Header */}
              <button
                type="button"
                onClick={() => toggleLot(lotIndex)}
                className="w-full px-6 py-4 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-semibold text-gray-900">
                    Lot {lot.lotNumber || lotIndex + 1}
                  </span>
                  {lot.singleOrDual && (
                    <span className="text-sm text-gray-600">
                      ({lot.singleOrDual === 'Yes' ? 'Dual Occupancy' : 'Single Occupancy'})
                    </span>
                  )}
                </div>
                <svg
                  className={`w-5 h-5 text-gray-500 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Accordion Content */}
              {isExpanded && (
                <div className="p-6 bg-white space-y-4">
                  {/* Property Description Section - Collapsible */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleLotSection(lotIndex, 'propertyDescription')}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left border-b border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">Property Description</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            expandAllSectionsOfType('propertyDescription');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Expand All
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            collapseAllSectionsOfType('propertyDescription');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Collapse All
                        </button>
                        {shouldShowReplicationButtons(lotIndex, isDualOccupancy) && (
                          <>
                            <span className="text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplicateSection(lotIndex, 'propertyDescription', hasMixedOccupancy ? 'same' : 'all');
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {hasMixedOccupancy 
                                ? `Replicate to All Other ${isDualOccupancy ? 'Dual' : 'Single'} Occupancy`
                                : 'Replicate to All Lots'}
                            </button>
                          </>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${(expandedLotSections.get(lotIndex) || new Set()).has('propertyDescription') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {(expandedLotSections.get(lotIndex) || new Set()).has('propertyDescription') && (
                      <div className="p-6 bg-white border-b pb-6">
                        <LotPropertyDescriptionFields
                          lotIndex={lotIndex}
                          propertyDescription={lotPropertyDescription}
                          isDualOccupancy={isDualOccupancy}
                          updateLotPropertyDescription={updateLotPropertyDescription}
                          formatCurrency={formatCurrency}
                          parseCurrency={parseCurrency}
                          parseExpiry={parseExpiry}
                          formatExpiry={formatExpiry}
                          getYearOptions={getYearOptions}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Purchase Price Section - Collapsible */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleLotSection(lotIndex, 'purchasePrice')}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left border-b border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">Purchase Price</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            expandAllSectionsOfType('purchasePrice');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Expand All
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            collapseAllSectionsOfType('purchasePrice');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Collapse All
                        </button>
                        {shouldShowReplicationButtons(lotIndex, isDualOccupancy) && (
                          <>
                            <span className="text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplicateSection(lotIndex, 'purchasePrice', hasMixedOccupancy ? 'same' : 'all');
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {hasMixedOccupancy 
                                ? `Replicate to All Other ${isDualOccupancy ? 'Dual' : 'Single'} Occupancy`
                                : 'Replicate to All Lots'}
                            </button>
                          </>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${(expandedLotSections.get(lotIndex) || new Set()).has('purchasePrice') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {(expandedLotSections.get(lotIndex) || new Set()).has('purchasePrice') && (
                      <div className="p-6 bg-white border-b pb-6">
                        <LotPurchasePriceFields
                          lotIndex={lotIndex}
                          purchasePrice={lotPurchasePrice}
                          hasCashbackRebate={hasCashbackRebate}
                          isSingleContract={isSingleContract}
                          updateLotPurchasePrice={updateLotPurchasePrice}
                          formatCurrency={formatCurrency}
                          parseCurrency={parseCurrency}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Rental Assessment Section - Collapsible */}
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleLotSection(lotIndex, 'rentalAssessment')}
                      className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left border-b border-gray-200"
                    >
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-gray-900">Rental Assessment</h3>
                      </div>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            expandAllSectionsOfType('rentalAssessment');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Expand All
                        </button>
                        <span className="text-gray-400">|</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            collapseAllSectionsOfType('rentalAssessment');
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Collapse All
                        </button>
                        {shouldShowReplicationButtons(lotIndex, isDualOccupancy) && (
                          <>
                            <span className="text-gray-400">|</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReplicateSection(lotIndex, 'rentalAssessment', hasMixedOccupancy ? 'same' : 'all');
                              }}
                              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                            >
                              {hasMixedOccupancy 
                                ? `Replicate to All Other ${isDualOccupancy ? 'Dual' : 'Single'} Occupancy`
                                : 'Replicate to All Lots'}
                            </button>
                          </>
                        )}
                        <svg
                          className={`w-4 h-4 text-gray-500 transition-transform ${(expandedLotSections.get(lotIndex) || new Set()).has('rentalAssessment') ? 'rotate-180' : ''}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>
                    {(expandedLotSections.get(lotIndex) || new Set()).has('rentalAssessment') && (
                      <div className="p-6 bg-white">
                        <LotRentalAssessmentFields
                          lotIndex={lotIndex}
                          rentalAssessment={lotRentalAssessment}
                          isDualOccupancy={isDualOccupancy}
                          isSingleContract={isSingleContract}
                          updateLotRentalAssessment={updateLotRentalAssessment}
                          formatCurrency={formatCurrency}
                          parseCurrency={parseCurrency}
                          parseExpiry={parseExpiry}
                          formatExpiry={formatExpiry}
                          getYearOptions={getYearOptions}
                          lotPurchasePrice={lotPurchasePrice}
                        />
                      </div>
                    )}
                  </div>
                  
                  {/* Replicate Entire Lot Button */}
                  {shouldShowReplicationButtons(lotIndex, isDualOccupancy) && (
                    <div className="pt-4 border-t">
                      <button
                        type="button"
                        onClick={() => handleReplicateEntireLot(lotIndex, hasMixedOccupancy ? 'same' : 'all')}
                        className="btn-secondary w-full"
                      >
                        {hasMixedOccupancy 
                          ? `Replicate Entire Lot to All Other ${isDualOccupancy ? 'Dual' : 'Single'} Occupancy`
                          : 'Replicate Entire Lot to All Other Lots'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Optional Shared Fields - At the bottom */}
      <div className="mt-8 pt-6 border-t">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Optional Additional Information (Shared)</h3>
        
        {/* Property Description Additional Dialogue - Shared - Collapsible */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => toggleAdditionalInfoSection('propertyDescription')}
            className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
          >
            <span className="font-semibold text-gray-900">Property Description Additional Dialogue (Text will appear exactly as typed in email template)</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${expandedAdditionalInfoSections.has('propertyDescription') ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedAdditionalInfoSections.has('propertyDescription') && (
            <div className="p-4 bg-white">
              <textarea
                value={propertyDescription?.propertyDescriptionAdditionalDialogue || ''}
                onChange={(e) => updatePropertyDescription({ propertyDescriptionAdditionalDialogue: e.target.value })}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="input-field resize-none overflow-hidden"
                rows={4}
                placeholder="Any additional details about the property (applies to all lots)"
                spellCheck={true}
              />
            </div>
          )}
        </div>

        {/* Purchase Price Additional Dialogue - Shared - Collapsible */}
        <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
          <button
            type="button"
            onClick={() => toggleAdditionalInfoSection('purchasePrice')}
            className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
          >
            <span className="font-semibold text-gray-900">Purchase Price Additional Dialogue (Text will appear exactly as typed in email template)</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${expandedAdditionalInfoSections.has('purchasePrice') ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedAdditionalInfoSections.has('purchasePrice') && (
            <div className="p-4 bg-white">
              <textarea
                value={purchasePrice?.purchasePriceAdditionalDialogue || ''}
                onChange={(e) => updatePurchasePrice({ purchasePriceAdditionalDialogue: e.target.value })}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="input-field resize-none overflow-hidden"
                rows={3}
                placeholder="Any additional details about purchase price (applies to all lots)"
                spellCheck={true}
              />
            </div>
          )}
        </div>

        {/* Rental Assessment Additional Dialogue - Shared - Collapsible */}
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <button
            type="button"
            onClick={() => toggleAdditionalInfoSection('rentalAssessment')}
            className="w-full px-4 py-3 bg-blue-50 hover:bg-blue-100 flex items-center justify-between text-left border-b border-gray-200"
          >
            <span className="font-semibold text-gray-900">Rental Assessment Additional Dialogue (Text will appear exactly as typed in email template)</span>
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${expandedAdditionalInfoSections.has('rentalAssessment') ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {expandedAdditionalInfoSections.has('rentalAssessment') && (
            <div className="p-4 bg-white">
              <textarea
                value={rentalAssessment?.rentalAssessmentAdditionalDialogue || ''}
                onChange={(e) => updateRentalAssessment({ rentalAssessmentAdditionalDialogue: e.target.value })}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
                className="input-field resize-none overflow-hidden"
                rows={3}
                placeholder="Any additional details about rental assessment (applies to all lots)"
                spellCheck={true}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components for lot fields
interface LotPropertyDescriptionFieldsProps {
  lotIndex: number;
  propertyDescription: any;
  isDualOccupancy: boolean;
  updateLotPropertyDescription: (lotIndex: number, description: Partial<any>) => void;
  formatCurrency: (value: string | undefined) => string;
  parseCurrency: (value: string) => string;
  parseExpiry: (value: string | undefined) => { month: string; year: string; isTBC: boolean };
  formatExpiry: (month: string, year: string, isTBC: boolean) => string;
  getYearOptions: () => number[];
}

function LotPropertyDescriptionFields({ lotIndex, propertyDescription, isDualOccupancy, updateLotPropertyDescription, formatCurrency, parseCurrency, parseExpiry, formatExpiry, getYearOptions }: LotPropertyDescriptionFieldsProps) {
  return (
    <>
    <div className={`grid gap-4 ${isDualOccupancy ? 'grid-cols-2' : 'grid-cols-1 max-w-md'}`}>
      {/* Beds */}
      <div>
        <label className="label-field">Beds {isDualOccupancy ? '(Primary)' : ''} *</label>
        <select
          value={propertyDescription?.bedsPrimary || ''}
          onChange={(e) => updateLotPropertyDescription(lotIndex, { bedsPrimary: e.target.value })}
          className="input-field"
          required
        >
          <option value="">Select...</option>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={String(i)}>{i}</option>
          ))}
          <option value="TBC">TBC</option>
        </select>
      </div>
      
      {isDualOccupancy && (
        <div>
          <label className="label-field">Beds (Secondary) *</label>
          <select
            value={propertyDescription?.bedsSecondary || ''}
            onChange={(e) => updateLotPropertyDescription(lotIndex, { bedsSecondary: e.target.value })}
            className="input-field"
            required
          >
            <option value="">Select...</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={String(i)}>{i}</option>
            ))}
            <option value="TBC">TBC</option>
          </select>
        </div>
      )}

      {/* Bath */}
      <div>
        <label className="label-field">Bath {isDualOccupancy ? '(Primary)' : ''} *</label>
        <select
          value={propertyDescription?.bathPrimary || ''}
          onChange={(e) => updateLotPropertyDescription(lotIndex, { bathPrimary: e.target.value })}
          className="input-field"
          required
        >
          <option value="">Select...</option>
          {Array.from({ length: 21 }, (_, i) => {
            const value = i / 2;
            return (
              <option key={i} value={String(value)}>{value}</option>
            );
          })}
          <option value="TBC">TBC</option>
        </select>
      </div>
      
      {isDualOccupancy && (
        <div>
          <label className="label-field">Bath (Secondary) *</label>
          <select
            value={propertyDescription?.bathSecondary || ''}
            onChange={(e) => updateLotPropertyDescription(lotIndex, { bathSecondary: e.target.value })}
            className="input-field"
            required
          >
            <option value="">Select...</option>
            {Array.from({ length: 21 }, (_, i) => {
              const value = i / 2;
              return (
                <option key={i} value={String(value)}>{value}</option>
              );
            })}
            <option value="TBC">TBC</option>
          </select>
        </div>
      )}

      {/* Garage */}
      <div>
        <label className="label-field">Garage {isDualOccupancy ? '(Primary)' : ''} *</label>
        <select
          value={propertyDescription?.garagePrimary || ''}
          onChange={(e) => updateLotPropertyDescription(lotIndex, { garagePrimary: e.target.value })}
          className="input-field"
          required
        >
          <option value="">Select...</option>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={String(i)}>{i}</option>
          ))}
          <option value="TBC">TBC</option>
        </select>
      </div>
      
      {isDualOccupancy && (
        <div>
          <label className="label-field">Garage (Secondary) *</label>
          <select
            value={propertyDescription?.garageSecondary || ''}
            onChange={(e) => updateLotPropertyDescription(lotIndex, { garageSecondary: e.target.value })}
            className="input-field"
            required
          >
            <option value="">Select...</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={String(i)}>{i}</option>
            ))}
            <option value="TBC">TBC</option>
          </select>
        </div>
      )}

      {/* Carport */}
      <div>
        <label className="label-field">Carport {isDualOccupancy ? '(Primary)' : ''}</label>
        <select
          value={propertyDescription?.carportPrimary || ''}
          onChange={(e) => updateLotPropertyDescription(lotIndex, { carportPrimary: e.target.value })}
          className="input-field"
        >
          <option value="">Select...</option>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={String(i)}>{i}</option>
          ))}
          <option value="TBC">TBC</option>
        </select>
      </div>
      
      {isDualOccupancy && (
        <div>
          <label className="label-field">Carport (Secondary)</label>
          <select
            value={propertyDescription?.carportSecondary || ''}
            onChange={(e) => updateLotPropertyDescription(lotIndex, { carportSecondary: e.target.value })}
            className="input-field"
          >
            <option value="">Select...</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={String(i)}>{i}</option>
            ))}
            <option value="TBC">TBC</option>
          </select>
        </div>
      )}

      {/* Car Spaces */}
      <div>
        <label className="label-field">Car Spaces {isDualOccupancy ? '(Primary)' : ''}</label>
        <select
          value={propertyDescription?.carspacePrimary || ''}
          onChange={(e) => updateLotPropertyDescription(lotIndex, { carspacePrimary: e.target.value })}
          className="input-field"
        >
          <option value="">Select...</option>
          {Array.from({ length: 11 }, (_, i) => (
            <option key={i} value={String(i)}>{i}</option>
          ))}
          <option value="TBC">TBC</option>
        </select>
      </div>
      
      {isDualOccupancy && (
        <div>
          <label className="label-field">Car Spaces (Secondary)</label>
          <select
            value={propertyDescription?.carspaceSecondary || ''}
            onChange={(e) => updateLotPropertyDescription(lotIndex, { carspaceSecondary: e.target.value })}
            className="input-field"
          >
            <option value="">Select...</option>
            {Array.from({ length: 11 }, (_, i) => (
              <option key={i} value={String(i)}>{i}</option>
            ))}
            <option value="TBC">TBC</option>
          </select>
        </div>
      )}

      {/* Land Registration - For Projects */}
      <div className={isDualOccupancy ? 'col-span-2' : ''}>
        <label className="label-field">Land Registration *</label>
        {(() => {
          const landRegValue = propertyDescription?.landRegistration || '';
          const isRegistered = landRegValue.toUpperCase() === 'REGISTERED';
          const isTBC = landRegValue.toUpperCase() === 'TBC';
          const registrationData = parseExpiry(landRegValue);
          const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                          'July', 'August', 'September', 'October', 'November', 'December'];
          const years = getYearOptions();
          
          return (
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`landRegistration-${lotIndex}`}
                    id={`landRegExpected-${lotIndex}`}
                    checked={!isRegistered && !isTBC && (landRegValue !== '' || !!registrationData.month || !!registrationData.year)}
                    onChange={() => {
                      if (!registrationData.month && !registrationData.year) {
                        updateLotPropertyDescription(lotIndex, { landRegistration: '' });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <label htmlFor={`landRegExpected-${lotIndex}`} className="text-sm text-gray-700 cursor-pointer font-medium">
                    Expected
                  </label>
                </div>
                {!isRegistered && !isTBC && (
                  <div className="ml-6 grid grid-cols-2 gap-2">
                    <select
                      value={registrationData.month}
                      onChange={(e) => {
                        const month = e.target.value;
                        const formatted = formatExpiry(month, registrationData.year, false);
                        updateLotPropertyDescription(lotIndex, { landRegistration: formatted ? `${formatted} approx.` : '' });
                      }}
                      className="input-field"
                      required={!isRegistered && !isTBC}
                    >
                      <option value="">Select Month</option>
                      {months.map(month => (
                        <option key={month} value={month}>{month}</option>
                      ))}
                    </select>
                    <select
                      value={registrationData.year}
                      onChange={(e) => {
                        const year = e.target.value;
                        const formatted = formatExpiry(registrationData.month, year, false);
                        updateLotPropertyDescription(lotIndex, { landRegistration: formatted ? `${formatted} approx.` : '' });
                      }}
                      className="input-field"
                      required={!isRegistered && !isTBC}
                    >
                      <option value="">Select Year</option>
                      {years.map(year => (
                        <option key={year} value={String(year)}>{year}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`landRegistration-${lotIndex}`}
                  id={`landRegRegistered-${lotIndex}`}
                  checked={isRegistered}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateLotPropertyDescription(lotIndex, { landRegistration: 'Registered' });
                    } else {
                      updateLotPropertyDescription(lotIndex, { landRegistration: '' });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor={`landRegRegistered-${lotIndex}`} className="text-sm text-gray-700 cursor-pointer">
                  Registered
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`landRegistration-${lotIndex}`}
                  id={`landRegTBC-${lotIndex}`}
                  checked={isTBC}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateLotPropertyDescription(lotIndex, { landRegistration: 'TBC' });
                    } else {
                      updateLotPropertyDescription(lotIndex, { landRegistration: '' });
                    }
                  }}
                  className="w-4 h-4"
                />
                <label htmlFor={`landRegTBC-${lotIndex}`} className="text-sm text-gray-700 cursor-pointer">
                  TBC
                </label>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Land Size */}
      <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
        <label className="label-field">Land Size (m²) *</label>
        <input
          type="text"
          value={propertyDescription?.landSize || ''}
          onChange={(e) => {
            const value = e.target.value;
            const upperValue = value.toUpperCase();
            const isNumeric = /^\d*\.?\d*$/.test(value);
            const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
            if (value === '' || isNumeric || isTBC) {
              updateLotPropertyDescription(lotIndex, { landSize: isTBC ? upperValue : value });
            }
          }}
          className="input-field"
          placeholder="e.g., 600 or TBC"
          required
        />
      </div>

      {/* Build Size - For Projects */}
      <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
        <label className="label-field">Build Size (m²) *</label>
        <input
          type="text"
          value={propertyDescription?.buildSize || ''}
          onChange={(e) => {
            const value = e.target.value;
            const upperValue = value.toUpperCase();
            const isNumeric = /^\d*\.?\d*$/.test(value);
            const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
            if (value === '' || isNumeric || isTBC) {
              updateLotPropertyDescription(lotIndex, { buildSize: isTBC ? upperValue : value });
            }
          }}
          className="input-field"
          placeholder="e.g., 144.75 or TBC"
          required
        />
      </div>

      {/* Title */}
      <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
        <label className="label-field">Title *</label>
        <select
          value={propertyDescription?.title || ''}
          onChange={(e) => {
            const newTitle = e.target.value as TitleType;
            const titleLower = newTitle.toLowerCase();
            if (!titleLower.includes('strata') && !titleLower.includes('owners corp')) {
              updateLotPropertyDescription(lotIndex, { 
                title: newTitle,
                bodyCorpPerQuarter: '',
                bodyCorpDescription: ''
              });
            } else {
              updateLotPropertyDescription(lotIndex, { title: newTitle });
            }
          }}
          className="input-field"
          required
        >
          <option value="">Select...</option>
          <option value="Individual">Individual</option>
          <option value="Green">Green</option>
          <option value="Torrens">Torrens</option>
          <option value="Strata">Strata</option>
          <option value="Owners Corp (Community)">Owners Corp (Community)</option>
          <option value="Survey Strata">Survey Strata</option>
          <option value="Built Strata">Built Strata</option>
          <option value="TBC">TBC</option>
        </select>
      </div>

      {/* Body Corp Per Quarter */}
      {(propertyDescription?.title?.toLowerCase().includes('strata') || 
        propertyDescription?.title?.toLowerCase().includes('owners corp')) && (
        <div className={`max-w-md ${isDualOccupancy ? 'col-span-2' : ''}`}>
          <label className="label-field">Body Corp Per Quarter ($) *</label>
          <input
            type="text"
            value={formatCurrency(propertyDescription?.bodyCorpPerQuarter)}
            onChange={(e) => {
              const rawValue = parseCurrency(e.target.value);
              const upperValue = rawValue.toUpperCase();
              const isNumeric = /^\d+$/.test(rawValue);
              const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
              if (rawValue === '' || isNumeric || isTBC) {
                updateLotPropertyDescription(lotIndex, { bodyCorpPerQuarter: isTBC ? upperValue : rawValue });
              }
            }}
            onBlur={(e) => {
              const rawValue = parseCurrency(e.target.value);
              if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                const formatted = formatCurrency(rawValue);
                if (formatted !== e.target.value) {
                  updateLotPropertyDescription(lotIndex, { bodyCorpPerQuarter: rawValue });
                }
              }
            }}
            className="input-field"
            placeholder="e.g., $500 or TBC"
            required
          />
        </div>
      )}

    </div>
    
    {/* Body Corp Description - Only show if Title contains "strata" or "owners corp" - Outside grid for full width like H&L view */}
    {(propertyDescription?.title?.toLowerCase().includes('strata') || 
      propertyDescription?.title?.toLowerCase().includes('owners corp')) && (
      <div className="mt-4">
        <label className="label-field">Body Corp Description (Text will appear exactly as typed in email template)</label>
        <textarea
          value={propertyDescription?.bodyCorpDescription || ''}
          onChange={(e) => updateLotPropertyDescription(lotIndex, { bodyCorpDescription: e.target.value })}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = 'auto';
            target.style.height = `${target.scrollHeight}px`;
          }}
          className="input-field resize-none overflow-hidden"
          rows={3}
          placeholder="Describe what's included in body corp"
          spellCheck={true}
        />
      </div>
    )}
    </>
  );
}

interface LotPurchasePriceFieldsProps {
  lotIndex: number;
  purchasePrice: any;
  hasCashbackRebate: boolean;
  isSingleContract: boolean;
  updateLotPurchasePrice: (lotIndex: number, price: Partial<any>) => void;
  formatCurrency: (value: string | undefined) => string;
  parseCurrency: (value: string) => string;
}

function LotPurchasePriceFields({ lotIndex, purchasePrice, hasCashbackRebate, isSingleContract, updateLotPurchasePrice, formatCurrency, parseCurrency }: LotPurchasePriceFieldsProps) {
  // Set default cashback/rebate values if applicable
  useEffect(() => {
    if (hasCashbackRebate && !purchasePrice?.cashbackRebateValue && !purchasePrice?.cashbackRebateType) {
      updateLotPurchasePrice(lotIndex, {
        cashbackRebateValue: '20000',
        cashbackRebateType: 'Cashback',
      });
    }
  }, [hasCashbackRebate, lotIndex, purchasePrice?.cashbackRebateValue, purchasePrice?.cashbackRebateType, updateLotPurchasePrice]);

  // Calculate Total - For Single Contract: use totalPrice field, Otherwise: use Land + Build
  const totalPrice = useMemo(() => {
    // For Single Contract (02 Single Comms), use totalPrice field directly
    if (isSingleContract && purchasePrice?.totalPrice) {
      const totalPriceStr = purchasePrice.totalPrice;
      if (totalPriceStr.toUpperCase() === 'TBC') return null;
      const total = parseFloat(parseCurrency(totalPriceStr));
      return isNaN(total) ? null : total;
    }
    
    // Otherwise, calculate Land + Build
    const landPriceStr = purchasePrice?.landPrice || '';
    const buildPriceStr = purchasePrice?.buildPrice || '';
    
    if (!landPriceStr || !buildPriceStr) return null;
    if (landPriceStr.toUpperCase() === 'TBC' || buildPriceStr.toUpperCase() === 'TBC') return null;
    
    const landPrice = parseFloat(parseCurrency(landPriceStr));
    const buildPrice = parseFloat(parseCurrency(buildPriceStr));
    
    if (isNaN(landPrice) || isNaN(buildPrice)) return null;
    
    return landPrice + buildPrice;
  }, [isSingleContract, purchasePrice?.landPrice, purchasePrice?.buildPrice, purchasePrice?.totalPrice, parseCurrency]);

  // Calculate Net Price (Total - Cashback) - Only for Cashback type, not Rebates
  const netPrice = useMemo(() => {
    // Only calculate Net Price if type is "Cashback"
    if (purchasePrice?.cashbackRebateType !== 'Cashback') return null;
    
    if (!totalPrice) return null;
    
    const cashbackStr = purchasePrice?.cashbackRebateValue || '';
    if (!cashbackStr || cashbackStr.toUpperCase() === 'TBC') return null;
    
    const cashback = parseFloat(parseCurrency(cashbackStr));
    if (isNaN(cashback)) return null;
    
    return totalPrice - cashback;
  }, [totalPrice, purchasePrice?.cashbackRebateValue, purchasePrice?.cashbackRebateType, parseCurrency]);

  return (
    <div className="space-y-4">
      {/* Total Price - Only for Single Contract (02 Single Comms) */}
      {isSingleContract && (
        <div>
          <label className="label-field">Total Price ($) *</label>
          <input
            type="text"
            value={formatCurrency(purchasePrice?.totalPrice)}
            onChange={(e) => {
              const rawValue = parseCurrency(e.target.value);
              const upperValue = rawValue.toUpperCase();
              const isNumeric = /^\d+$/.test(rawValue);
              const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
              if (rawValue === '' || isNumeric || isTBC) {
                updateLotPurchasePrice(lotIndex, { totalPrice: isTBC ? upperValue : rawValue });
              }
            }}
            onBlur={(e) => {
              const rawValue = parseCurrency(e.target.value);
              if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                const formatted = formatCurrency(rawValue);
                if (formatted !== e.target.value) {
                  updateLotPurchasePrice(lotIndex, { totalPrice: rawValue });
                }
              }
            }}
            className="input-field max-w-md"
            placeholder="e.g., $650,000 or TBC"
            required
          />
        </div>
      )}

      {/* Land Price and Build Price - Only for non-Single Contract */}
      {!isSingleContract && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Land Price ($) *</label>
            <input
              type="text"
              value={formatCurrency(purchasePrice?.landPrice)}
              onChange={(e) => {
                const rawValue = parseCurrency(e.target.value);
                const upperValue = rawValue.toUpperCase();
                const isNumeric = /^\d+$/.test(rawValue);
                const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                if (rawValue === '' || isNumeric || isTBC) {
                  updateLotPurchasePrice(lotIndex, { landPrice: isTBC ? upperValue : rawValue });
                }
              }}
              onBlur={(e) => {
                const rawValue = parseCurrency(e.target.value);
                if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                  const formatted = formatCurrency(rawValue);
                  if (formatted !== e.target.value) {
                    updateLotPurchasePrice(lotIndex, { landPrice: rawValue });
                  }
                }
              }}
              className="input-field"
              placeholder="e.g., $300,000 or TBC"
              required
            />
          </div>
          <div>
            <label className="label-field">Build Price ($) *</label>
            <input
              type="text"
              value={formatCurrency(purchasePrice?.buildPrice)}
              onChange={(e) => {
                const rawValue = parseCurrency(e.target.value);
                const upperValue = rawValue.toUpperCase();
                const isNumeric = /^\d+$/.test(rawValue);
                const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                if (rawValue === '' || isNumeric || isTBC) {
                  updateLotPurchasePrice(lotIndex, { buildPrice: isTBC ? upperValue : rawValue });
                }
              }}
              onBlur={(e) => {
                const rawValue = parseCurrency(e.target.value);
                if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                  const formatted = formatCurrency(rawValue);
                  if (formatted !== e.target.value) {
                    updateLotPurchasePrice(lotIndex, { buildPrice: rawValue });
                  }
                }
              }}
              className="input-field"
              placeholder="e.g., $350,000 or TBC"
              required
            />
          </div>
        </div>
      )}

      {/* Cashback/Rebate Fields */}
      {hasCashbackRebate && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Cashback/Rebate Value ($)</label>
            <input
              type="text"
              value={formatCurrency(purchasePrice?.cashbackRebateValue)}
              onChange={(e) => {
                const rawValue = parseCurrency(e.target.value);
                const upperValue = rawValue.toUpperCase();
                const isNumeric = /^\d+$/.test(rawValue);
                const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                if (rawValue === '' || isNumeric || isTBC) {
                  updateLotPurchasePrice(lotIndex, { cashbackRebateValue: isTBC ? upperValue : rawValue });
                }
              }}
              onBlur={(e) => {
                const rawValue = parseCurrency(e.target.value);
                if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                  const formatted = formatCurrency(rawValue);
                  if (formatted !== e.target.value) {
                    updateLotPurchasePrice(lotIndex, { cashbackRebateValue: rawValue });
                  }
                }
              }}
              className="input-field"
              placeholder="e.g., $20,000 or TBC"
            />
          </div>
          <div>
            <label className="label-field">Cashback/Rebate Type</label>
            <select
              value={purchasePrice?.cashbackRebateType || ''}
              onChange={(e) => updateLotPurchasePrice(lotIndex, { cashbackRebateType: e.target.value as CashbackRebateType })}
              className="input-field"
            >
              <option value="">Select...</option>
              <option value="Cashback">Cashback</option>
              <option value="Rebate on Land">Rebate on Land</option>
              <option value="Rebate on Build">Rebate on Build</option>
            </select>
          </div>
        </div>
      )}

      {/* Calculated Total and Net Price */}
      {!isSingleContract && (
        <div className="pt-3 border-t">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Total</label>
              <input
                type="text"
                value={totalPrice !== null ? formatCurrency(String(totalPrice)) : ''}
                readOnly
                className="input-field bg-gray-100 cursor-not-allowed font-semibold"
                placeholder="Enter Land Price and Build Price to calculate"
              />
              <p className="text-xs text-gray-500 mt-1">
                Auto-calculated: Land Price + Build Price
              </p>
            </div>
            
            {hasCashbackRebate && purchasePrice?.cashbackRebateType === 'Cashback' && (
              <div>
                <label className="label-field">Net Price</label>
                <input
                  type="text"
                  value={netPrice !== null ? formatCurrency(String(netPrice)) : ''}
                  readOnly
                  className="input-field bg-gray-100 cursor-not-allowed font-semibold"
                  placeholder="Enter Land Price, Build Price, and Cashback to calculate"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Auto-calculated: Total - Cashback Value
                  {purchasePrice?.cashbackRebateValue && netPrice !== null && (
                    <span className="ml-1">(when considering the {formatCurrency(purchasePrice.cashbackRebateValue)} cashback)</span>
                  )}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Calculated Net Price - Only for Single Contract when Cashback type */}
      {isSingleContract && hasCashbackRebate && purchasePrice?.cashbackRebateType === 'Cashback' && (
        <div className="pt-3 border-t">
          <div>
            <label className="label-field">Net Price</label>
            <input
              type="text"
              value={netPrice !== null ? formatCurrency(String(netPrice)) : ''}
              readOnly
              className="input-field bg-gray-100 cursor-not-allowed font-semibold max-w-md"
              placeholder="Enter Total Price and Cashback to calculate"
            />
            <p className="text-xs text-gray-500 mt-1">
              Auto-calculated: Total - Cashback Value
              {purchasePrice?.cashbackRebateValue && netPrice !== null && (
                <span className="ml-1">(when considering the {formatCurrency(purchasePrice.cashbackRebateValue)} cashback)</span>
              )}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface LotRentalAssessmentFieldsProps {
  lotIndex: number;
  rentalAssessment: any;
  isDualOccupancy: boolean;
  isSingleContract: boolean;
  updateLotRentalAssessment: (lotIndex: number, assessment: Partial<any>) => void;
  formatCurrency: (value: string | undefined) => string;
  parseCurrency: (value: string) => string;
  parseExpiry: (value: string | undefined) => { month: string; year: string; isTBC: boolean };
  formatExpiry: (month: string, year: string, isTBC: boolean) => string;
  getYearOptions: () => number[];
  lotPurchasePrice: any; // Need lot's purchase price to calculate yield
}

function LotRentalAssessmentFields({ lotIndex, rentalAssessment, isDualOccupancy, isSingleContract, updateLotRentalAssessment, formatCurrency, parseCurrency, parseExpiry, formatExpiry, getYearOptions, lotPurchasePrice }: LotRentalAssessmentFieldsProps) {
  // Calculate property price for this lot
  // For Single Contract: use totalPrice, Otherwise: use Land + Build
  const lotPropertyPrice = useMemo(() => {
    // For Single Contract (02 Single Comms), use totalPrice field directly
    if (isSingleContract && lotPurchasePrice?.totalPrice) {
      const totalPriceStr = lotPurchasePrice.totalPrice;
      if (totalPriceStr.toUpperCase() === 'TBC') return null;
      const total = parseFloat(parseCurrency(totalPriceStr));
      return isNaN(total) ? null : total;
    }
    
    // Otherwise, calculate Land + Build (even if totalPrice exists from previous Single Contract)
    const landPriceStr = lotPurchasePrice?.landPrice || '';
    const buildPriceStr = lotPurchasePrice?.buildPrice || '';
    
    if (!landPriceStr || !buildPriceStr) return null;
    if (landPriceStr.toUpperCase() === 'TBC' || buildPriceStr.toUpperCase() === 'TBC') return null;
    
    const landPrice = parseFloat(parseCurrency(landPriceStr));
    const buildPrice = parseFloat(parseCurrency(buildPriceStr));
    
    if (isNaN(landPrice) || isNaN(buildPrice)) return null;
    
    return landPrice + buildPrice;
  }, [isSingleContract, lotPurchasePrice?.landPrice, lotPurchasePrice?.buildPrice, lotPurchasePrice?.totalPrice, parseCurrency]);

  // Calculate Appraised Yield for this lot
  const appraisedYield = useMemo(() => {
    if (!lotPropertyPrice || !rentalAssessment?.rentAppraisalPrimaryTo) {
      return null;
    }
    
    // Get Primary rent appraisal - handle currency formatting ($ and commas)
    const rentPrimaryStr = parseCurrency(rentalAssessment.rentAppraisalPrimaryTo);
    if (rentPrimaryStr.toUpperCase() === 'TBC') return null;
    const weeklyRent = parseFloat(rentPrimaryStr);
    if (isNaN(weeklyRent)) return null;

    // For dual occupancy, add Secondary rent appraisal if available
    let totalWeeklyRent = weeklyRent;
    if (isDualOccupancy && rentalAssessment?.rentAppraisalSecondaryTo) {
      const rentSecondaryStr = parseCurrency(rentalAssessment.rentAppraisalSecondaryTo);
      if (rentSecondaryStr.toUpperCase() !== 'TBC') {
        const weeklyRentSecondary = parseFloat(rentSecondaryStr);
        if (!isNaN(weeklyRentSecondary)) {
          totalWeeklyRent += weeklyRentSecondary;
        }
      }
    }
    
    const annualRent = totalWeeklyRent * 52;
    if (lotPropertyPrice > 0) {
      const yieldValue = (annualRent / lotPropertyPrice) * 100;
      return yieldValue.toFixed(2);
    }
    return null;
  }, [rentalAssessment?.rentAppraisalPrimaryTo, rentalAssessment?.rentAppraisalSecondaryTo, isDualOccupancy, lotPropertyPrice, parseCurrency]);

  // Update appraised yield field when calculated value changes
  useEffect(() => {
    if (appraisedYield !== null) {
      const newValue = `~ ${appraisedYield}%`;
      if (rentalAssessment?.appraisedYield !== newValue) {
        updateLotRentalAssessment(lotIndex, { appraisedYield: newValue });
      }
    } else if (rentalAssessment?.appraisedYield) {
      updateLotRentalAssessment(lotIndex, { appraisedYield: '' });
    }
  }, [appraisedYield, lotIndex, rentalAssessment?.appraisedYield, updateLotRentalAssessment]);
  return (
    <div className="space-y-4">
      {/* Rent Appraisal */}
      <div>
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Rent Appraisal</h4>
        {isDualOccupancy ? (
          <div className="grid grid-cols-2 gap-6">
            {/* Unit A */}
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit A</h4>
              <div className="space-y-4">
                <div>
                  <label className="label-field">Rent Appraisal From ($ per week) *</label>
                  <input
                    type="text"
                    value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryFrom)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryFrom: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryFrom: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $500 or TBC"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Rent Appraisal To ($ per week) *</label>
                  <input
                    type="text"
                    value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryTo)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryTo: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryTo: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $550 or TBC"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Unit B */}
            <div className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">Unit B</h4>
              <div className="space-y-4">
                <div>
                  <label className="label-field">Rent Appraisal From ($ per week) *</label>
                  <input
                    type="text"
                    value={formatCurrency(rentalAssessment?.rentAppraisalSecondaryFrom)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updateLotRentalAssessment(lotIndex, { rentAppraisalSecondaryFrom: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateLotRentalAssessment(lotIndex, { rentAppraisalSecondaryFrom: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $400 or TBC"
                    required
                  />
                </div>
                <div>
                  <label className="label-field">Rent Appraisal To ($ per week) *</label>
                  <input
                    type="text"
                    value={formatCurrency(rentalAssessment?.rentAppraisalSecondaryTo)}
                    onChange={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      const upperValue = rawValue.toUpperCase();
                      const isNumeric = /^\d+$/.test(rawValue);
                      const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                      if (rawValue === '' || isNumeric || isTBC) {
                        updateLotRentalAssessment(lotIndex, { rentAppraisalSecondaryTo: isTBC ? upperValue : rawValue });
                      }
                    }}
                    onBlur={(e) => {
                      const rawValue = parseCurrency(e.target.value);
                      if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                        const formatted = formatCurrency(rawValue);
                        if (formatted !== e.target.value) {
                          updateLotRentalAssessment(lotIndex, { rentAppraisalSecondaryTo: rawValue });
                        }
                      }
                    }}
                    className="input-field"
                    placeholder="e.g., $450 or TBC"
                    required
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label-field">Rent Appraisal From ($ per week) *</label>
              <input
                type="text"
                value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryFrom)}
                onChange={(e) => {
                  const rawValue = parseCurrency(e.target.value);
                  const upperValue = rawValue.toUpperCase();
                  const isNumeric = /^\d+$/.test(rawValue);
                  const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                  if (rawValue === '' || isNumeric || isTBC) {
                    updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryFrom: isTBC ? upperValue : rawValue });
                  }
                }}
                onBlur={(e) => {
                  const rawValue = parseCurrency(e.target.value);
                  if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                    const formatted = formatCurrency(rawValue);
                    if (formatted !== e.target.value) {
                      updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryFrom: rawValue });
                    }
                  }
                }}
                className="input-field"
                placeholder="e.g., $500 or TBC"
                required
              />
            </div>
            <div>
              <label className="label-field">Rent Appraisal To ($ per week) *</label>
              <input
                type="text"
                value={formatCurrency(rentalAssessment?.rentAppraisalPrimaryTo)}
                onChange={(e) => {
                  const rawValue = parseCurrency(e.target.value);
                  const upperValue = rawValue.toUpperCase();
                  const isNumeric = /^\d+$/.test(rawValue);
                  const isTBC = upperValue === 'T' || upperValue === 'TB' || upperValue === 'TBC';
                  if (rawValue === '' || isNumeric || isTBC) {
                    updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryTo: isTBC ? upperValue : rawValue });
                  }
                }}
                onBlur={(e) => {
                  const rawValue = parseCurrency(e.target.value);
                  if (rawValue && rawValue.toUpperCase() !== 'TBC') {
                    const formatted = formatCurrency(rawValue);
                    if (formatted !== e.target.value) {
                      updateLotRentalAssessment(lotIndex, { rentAppraisalPrimaryTo: rawValue });
                    }
                  }
                }}
                className="input-field"
                placeholder="e.g., $550 or TBC"
                required
              />
            </div>
          </div>
        )}
      </div>

      {/* Appraised Yield */}
      <div className="mt-4">
        <label className="label-field">Appraised Yield (%)</label>
        <input
          type="text"
          value={rentalAssessment?.appraisedYield || (appraisedYield !== null ? `~ ${appraisedYield}%` : '')}
          readOnly
          className="input-field bg-gray-100 cursor-not-allowed"
          placeholder={lotPropertyPrice ? 'Auto-calculated' : 'Enter Land Price, Build Price, and Rent Appraisal To to calculate'}
        />
        <p className="text-xs text-gray-500 mt-1">
          Auto-calculated: (Rent Appraisal To × 52 / Property Price) × 100
          {!lotPropertyPrice && ' - Property Price (Land + Build) needed'}
        </p>
      </div>
    </div>
  );
}
