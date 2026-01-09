'use client';

import { useState, useEffect } from 'react';
import { useFormStore } from '@/store/formStore';
import { PropertyType, ContractType, LotType, DualOccupancy, StatusType, LotDetails } from '@/types/form';

export function Step1DecisionTree() {
  const { formData, updateDecisionTree, updateLots, clearStep2Data, setCurrentStep, updateAddress } = useFormStore();
  const { decisionTree, address } = formData;
  const [numberOfLots, setNumberOfLots] = useState<string>('');
  const [lots, setLots] = useState<LotDetails[]>(formData.lots || []);
  const [lotNumber, setLotNumber] = useState<string>(address?.lotNumber || '');
  const [lotNumberNotApplicable, setLotNumberNotApplicable] = useState<boolean>(address?.lotNumberNotApplicable || false);
  const [hasUnitNumbers, setHasUnitNumbers] = useState<boolean | undefined>(address?.hasUnitNumbers);
  const [unitNumber, setUnitNumber] = useState<string>(address?.unitNumber || '');

  const isProject = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple';
  const isHAndL = decisionTree.propertyType === 'New' && decisionTree.lotType === 'Individual';
  const hasPropertyType = decisionTree.propertyType !== null; // Show unit number for all property types
  
  // Helper function to clear dependent address fields (lot/unit numbers) and rebuild address
  const clearDependentAddressFields = () => {
    // Clear local state
    setLotNumber('');
    setLotNumberNotApplicable(false);
    setHasUnitNumbers(undefined); // Reset to undefined (unselected)
    setUnitNumber('');
    setNumberOfLots('');
    setLots([]);
    
    // Rebuild address from individual fields (remove lot/unit prefixes)
    const baseAddressParts: string[] = [];
    if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
    if (address?.streetName) baseAddressParts.push(address.streetName);
    if (address?.suburbName) baseAddressParts.push(address.suburbName);
    if (address?.state) baseAddressParts.push(address.state);
    if (address?.postCode) baseAddressParts.push(address.postCode);
    
    const cleanedAddress = baseAddressParts.length > 0 
      ? baseAddressParts.join(' ')
      : (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
    
    // Update address to remove lot/unit numbers and clear lots
    updateAddress({
      lotNumber: '',
      lotNumberNotApplicable: false,
      unitNumber: '',
      hasUnitNumbers: undefined, // Reset to undefined (unselected)
      propertyAddress: cleanedAddress || address?.propertyAddress || '',
    });
    updateLots([]); // Clear project lots
  };
  
  // Debug log
  console.log('Step1DecisionTree - isHAndL:', isHAndL, 'propertyType:', decisionTree.propertyType, 'lotType:', decisionTree.lotType);

  // Sync lotNumber state with address
  useEffect(() => {
    if (address?.lotNumber) {
      setLotNumber(address.lotNumber);
      setLotNumberNotApplicable(false);
    } else if (address?.lotNumberNotApplicable) {
      setLotNumber('');
      setLotNumberNotApplicable(true);
    } else {
      setLotNumber('');
      setLotNumberNotApplicable(false);
    }
  }, [address?.lotNumber, address?.lotNumberNotApplicable]);

  // Sync unitNumber state with address
  useEffect(() => {
    if (address?.unitNumber) {
      setUnitNumber(address.unitNumber);
    } else {
      setUnitNumber('');
    }
    // Only sync if address has a value - don't default to false
    if (address?.hasUnitNumbers !== undefined) {
      setHasUnitNumbers(address.hasUnitNumbers);
    } else {
      setHasUnitNumbers(undefined); // Keep as undefined (unselected)
    }
  }, [address?.unitNumber, address?.hasUnitNumbers]);
  
  // Auto-select "Yes" for hasUnitNumbers if Dual Occupancy is selected
  // Clear to undefined if Dual Occupancy is not "Yes" and was previously auto-set
  useEffect(() => {
    if (decisionTree.dualOccupancy === 'Yes') {
      // Dual Occupancy always requires unit numbers
      if (hasUnitNumbers !== true) {
        setHasUnitNumbers(true);
        updateAddress({ hasUnitNumbers: true });
      }
    } else if (decisionTree.dualOccupancy === 'No' || decisionTree.dualOccupancy === null) {
      // If Dual Occupancy changes away from Yes, reset to undefined (unless user explicitly set it)
      // Only reset if it was true (could have been auto-set)
      if (hasUnitNumbers === true && !address?.unitNumber) {
        // Only auto-clear if no unit number was entered (meaning it was just auto-set)
        setHasUnitNumbers(undefined);
        updateAddress({ hasUnitNumbers: undefined });
      }
    }
  }, [decisionTree.dualOccupancy]);

  // Clear dependent fields when property type or lot type changes
  useEffect(() => {
    // Clear lot/unit fields when switching property types
    // This runs whenever propertyType or lotType changes
    if (decisionTree.propertyType === null) {
      setLotNumber('');
      setLotNumberNotApplicable(false);
      setHasUnitNumbers(undefined);
      setUnitNumber('');
      // Also clear from address
      clearDependentAddressFields();
      return;
    }
    
    // If changing to Established, clear lot number (Established doesn't have lot numbers)
    if (decisionTree.propertyType === 'Established') {
      setLotNumber('');
      setLotNumberNotApplicable(false);
      // Clear unit numbers too when switching to Established (unless Dual is selected)
      if (decisionTree.dualOccupancy !== 'Yes') {
        setHasUnitNumbers(undefined);
        setUnitNumber('');
        // Update address to remove unit numbers
        const baseAddressParts: string[] = [];
        if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
        if (address?.streetName) baseAddressParts.push(address.streetName);
        if (address?.suburbName) baseAddressParts.push(address.suburbName);
        if (address?.state) baseAddressParts.push(address.state);
        if (address?.postCode) baseAddressParts.push(address.postCode);
        
        const cleanedAddress = baseAddressParts.length > 0 
          ? baseAddressParts.join(' ')
          : (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
        
        updateAddress({
          hasUnitNumbers: undefined,
          unitNumber: '',
          propertyAddress: cleanedAddress || address?.propertyAddress || '',
        });
      }
    }
    
    // If changing to Project (Multiple), clear lot/unit fields (handled in Project Lots section)
    if (decisionTree.propertyType === 'New' && decisionTree.lotType === 'Multiple') {
      setLotNumber('');
      setLotNumberNotApplicable(false);
      setHasUnitNumbers(undefined);
      setUnitNumber('');
      // Update address to remove lot/unit numbers
      const baseAddressParts: string[] = [];
      if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
      if (address?.streetName) baseAddressParts.push(address.streetName);
      if (address?.suburbName) baseAddressParts.push(address.suburbName);
      if (address?.state) baseAddressParts.push(address.state);
      if (address?.postCode) baseAddressParts.push(address.postCode);
      
      const cleanedAddress = baseAddressParts.length > 0 
        ? baseAddressParts.join(' ')
        : (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
      
      updateAddress({
        lotNumber: '',
        lotNumberNotApplicable: false,
        hasUnitNumbers: undefined,
        unitNumber: '',
        propertyAddress: cleanedAddress || address?.propertyAddress || '',
      });
    }
  }, [decisionTree.propertyType, decisionTree.lotType, decisionTree.dualOccupancy]);

  // Note: Lot number now shows for H&L and Established, so we don't clear it when switching property types

  // Clear lots if they change from Project to something else
  useEffect(() => {
    if (!isProject && lots.length > 0) {
      setLots([]);
      setNumberOfLots('');
      updateLots([]);
    }
  }, [isProject, lots.length, updateLots]);

  // Initialize lots when numberOfLots changes
  useEffect(() => {
    if (isProject && numberOfLots) {
      const count = parseInt(numberOfLots, 10);
      if (count > 0 && count !== lots.length) {
        // Create or adjust lots array
        const newLots: LotDetails[] = [];
        for (let i = 0; i < count; i++) {
          newLots.push({
            lotNumber: lots[i]?.lotNumber || '',
            singleOrDual: lots[i]?.singleOrDual || '',
          });
        }
        setLots(newLots);
        updateLots(newLots);
      }
    }
  }, [numberOfLots, isProject]);

  // Update lot when user changes values
  const updateLot = (index: number, field: keyof LotDetails, value: string | DualOccupancy) => {
    const updatedLots = [...lots];
    updatedLots[index] = {
      ...updatedLots[index],
      [field]: value,
    };
    setLots(updatedLots);
    updateLots(updatedLots);
  };

  // Add a new lot
  const addLot = () => {
    const newLot: LotDetails = {
      lotNumber: '',
      singleOrDual: '',
    };
    const updatedLots = [...lots, newLot];
    setLots(updatedLots);
    setNumberOfLots(String(updatedLots.length));
    updateLots(updatedLots);
  };

  // Remove a lot
  const removeLot = (index: number) => {
    const updatedLots = lots.filter((_, i) => i !== index);
    setLots(updatedLots);
    setNumberOfLots(String(updatedLots.length));
    updateLots(updatedLots);
  };

  // Check for duplicate lot numbers
  const getDuplicateLotNumbers = (): Set<string> => {
    const lotNumberCounts = new Map<string, number>();
    lots.forEach((lot) => {
      if (lot.lotNumber && lot.lotNumber.toUpperCase() !== 'TBC') {
        const normalized = lot.lotNumber.trim();
        lotNumberCounts.set(normalized, (lotNumberCounts.get(normalized) || 0) + 1);
      }
    });
    const duplicates = new Set<string>();
    lotNumberCounts.forEach((count, lotNumber) => {
      if (count > 1) {
        duplicates.add(lotNumber);
      }
    });
    return duplicates;
  };

  const duplicateLotNumbers = getDuplicateLotNumbers();
  
  // Check if a specific lot number is a duplicate
  const isDuplicateLotNumber = (lotNumber: string, currentIndex: number): boolean => {
    if (!lotNumber || lotNumber.toUpperCase() === 'TBC') return false;
    const normalized = lotNumber.trim();
    return lots.some((lot, index) => 
      index !== currentIndex && 
      lot.lotNumber && 
      lot.lotNumber.trim() === normalized &&
      lot.lotNumber.toUpperCase() !== 'TBC'
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Decision Tree</h2>
          <p className="text-gray-600">
            Answer these questions to determine the form structure and email subject line format.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm('Are you sure you want to clear all Decision Tree data?')) {
              // Clear decision tree fields
              updateDecisionTree({
                propertyType: null,
                contractType: null,
                lotType: null,
                dualOccupancy: null,
                status: null,
              });
              
              // Clear unit number fields
              setHasUnitNumbers(undefined); // Reset to undefined (unselected)
              setUnitNumber('');
              
              // Clear lot number fields
              setLotNumber('');
              setLotNumberNotApplicable(false);
              
              // Remove lot/unit prefixes from address, rebuild from individual fields
              const baseAddressParts: string[] = [];
              if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
              if (address?.streetName) baseAddressParts.push(address.streetName);
              if (address?.suburbName) baseAddressParts.push(address.suburbName);
              if (address?.state) baseAddressParts.push(address.state);
              if (address?.postCode) baseAddressParts.push(address.postCode);
              
              const cleanedAddress = baseAddressParts.length > 0 
                ? baseAddressParts.join(' ')
                : (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
              
              // Update address to remove lot/unit numbers
              updateAddress({
                lotNumber: '',
                lotNumberNotApplicable: false,
                unitNumber: '',
                hasUnitNumbers: undefined, // Reset to undefined (unselected)
                propertyAddress: cleanedAddress || address?.propertyAddress || '',
              });
            }
          }}
          className="btn-secondary text-sm"
        >
          Clear Decision Tree Data
        </button>
      </div>

      <div className="space-y-6">
        {/* Property Type - FIRST */}
        <div>
          <label className="label-field">Property Type *</label>
          <select
            value={decisionTree.propertyType || ''}
            onChange={(e) => {
              const newType = e.target.value as PropertyType;
              // If changing property type, clear dependent fields
              updateDecisionTree({ 
                propertyType: newType,
                lotType: null, // Clear lot type when property type changes
                dualOccupancy: null, // Clear dual occupancy when property type changes
              });
              clearDependentAddressFields(); // Clear lot/unit numbers from address
            }}
            className="input-field"
            required
          >
            <option value="">Select...</option>
            <option value="New">New</option>
            <option value="Established">Established</option>
          </select>
        </div>

        {/* H&L or Project - SECOND (only if New) */}
        {decisionTree.propertyType === 'New' && (
          <div>
            <label className="label-field">H&L or Project? *</label>
            <select
              value={decisionTree.lotType || ''}
              onChange={(e) => {
                const newLotType = e.target.value as LotType;
                // If changing H&L/Project, clear dependent fields
                updateDecisionTree({ 
                  lotType: newLotType,
                  dualOccupancy: null, // Clear dual occupancy when H&L/Project changes
                });
                clearDependentAddressFields(); // Clear lot/unit numbers from address
              }}
              className="input-field"
              required
            >
              <option value="">Select...</option>
              <option value="Individual">H&L</option>
              <option value="Multiple">Project</option>
            </select>
          </div>
        )}

        {/* Single or Dual Occupancy - THIRD (only for H&L Individual or Established, not Projects) */}
        {(decisionTree.propertyType === 'Established' || 
          (decisionTree.propertyType === 'New' && decisionTree.lotType === 'Individual')) && (
          <div>
            <label className="label-field">Is this single or dual occupancy? *</label>
            <select
              value={decisionTree.dualOccupancy || ''}
              onChange={(e) =>
                updateDecisionTree({ dualOccupancy: e.target.value as DualOccupancy })
              }
              className="input-field"
              required
            >
              <option value="">Select...</option>
              <option value="No">Single Occupancy</option>
              <option value="Yes">Dual Occupancy</option>
            </select>
          </div>
        )}

        {/* Contract Type - FOURTH */}
        <div>
          <label className="label-field">Contract Type (for Deal Sheet) *</label>
          <select
            value={decisionTree.contractType || ''}
            onChange={(e) =>
              updateDecisionTree({ contractType: e.target.value as ContractType })
            }
            className="input-field"
            required
          >
            <option value="">Select...</option>
            <option value="01 H&L Comms">01 H&L Comms</option>
            <option value="02 Single Comms">02 Single Comms</option>
            <option value="03 Internal with Comms">03 Internal with Comms</option>
            <option value="04 Internal No-Comms">04 Internal No-Comms</option>
            <option value="05 Established">05 Established</option>
          </select>
        </div>

        {/* Status - FIFTH */}
        <div>
          <label className="label-field">What status to open it in? *</label>
          <select
            value={decisionTree.status || ''}
            onChange={(e) =>
              updateDecisionTree({ status: e.target.value as StatusType })
            }
            className="input-field"
            required
          >
            <option value="">Select...</option>
            <option value="01 Available">01 Available</option>
            <option value="02 EOI">02 EOI</option>
            <option value="03 Contr' Exchanged">03 Contr' Exchanged</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Only "01 Available" triggers BA Auto select email
          </p>
        </div>

        {/* Lot Number Section - Only for H&L */}
        {isHAndL && (
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Lot Number</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter the lot number if available. If the land is already registered and you have the full address, select "Not Applicable".
            </p>

            <div className="flex items-start gap-4">
              <div className="flex-1">
                <label className="label-field">Lot Number *</label>
                <input
                  type="text"
                  value={lotNumber}
                  onChange={(e) => {
                    const value = e.target.value;
                    const upperValue = value.toUpperCase();
                    
                    // Allow: empty, numbers only, or TBC (allow typing T, TB, TBC)
                    const isNumber = /^\d+$/.test(value);
                    const isTBC = value.toUpperCase() === 'T' || 
                                 value.toUpperCase() === 'TB' || 
                                 value.toUpperCase() === 'TBC';
                    
                    if (value === '' || isNumber || isTBC) {
                      // Convert TBC to uppercase, keep numbers as-is
                      const finalValue = isTBC ? upperValue : value;
                      setLotNumber(finalValue);
                      setLotNumberNotApplicable(false);
                      
                      // Update address in Step 0
                      if (finalValue) {
                        // Build base address from individual fields to ensure we preserve everything
                        const baseAddressParts: string[] = [];
                        if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
                        if (address?.streetName) baseAddressParts.push(address.streetName);
                        if (address?.suburbName) baseAddressParts.push(address.suburbName);
                        if (address?.state) baseAddressParts.push(address.state);
                        if (address?.postCode) baseAddressParts.push(address.postCode);
                        
                        // If we don't have individual fields, fall back to propertyAddress but remove lot/unit prefixes
                        let baseAddress = baseAddressParts.length > 0 
                          ? baseAddressParts.join(' ')
                          : (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
                        
                        // Build address: Lot + Unit (if exists) + Street
                        let newAddress = '';
                        if (address?.unitNumber) {
                          // Format unit number
                          let unitPrefix = '';
                          // For dual occupancy, always use "Units" (plural), otherwise "Unit" (singular)
                          if (decisionTree.dualOccupancy === 'Yes') {
                            unitPrefix = `Units ${address.unitNumber}`;
                          } else {
                            unitPrefix = `Unit ${address.unitNumber}`;
                          }
                          newAddress = baseAddress ? `Lot ${finalValue}, ${unitPrefix}, ${baseAddress}` : `Lot ${finalValue}, ${unitPrefix}`;
                        } else {
                          newAddress = baseAddress ? `Lot ${finalValue}, ${baseAddress}` : `Lot ${finalValue}`;
                        }
                        updateAddress({ 
                          lotNumber: finalValue,
                          lotNumberNotApplicable: false,
                          propertyAddress: newAddress 
                        });
                      } else {
                        // Remove lot prefix from address, preserve unit if exists
                        // Build base address from individual fields to ensure we preserve everything
                        const baseAddressParts: string[] = [];
                        if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
                        if (address?.streetName) baseAddressParts.push(address.streetName);
                        if (address?.suburbName) baseAddressParts.push(address.suburbName);
                        if (address?.state) baseAddressParts.push(address.state);
                        if (address?.postCode) baseAddressParts.push(address.postCode);
                        
                        let finalAddress = '';
                        if (baseAddressParts.length > 0) {
                          // Use individual fields
                          const baseAddress = baseAddressParts.join(' ');
                          if (address?.unitNumber) {
                            // Format unit number
                            let unitPrefix = '';
                            // For dual occupancy, always use "Units" (plural), otherwise "Unit" (singular)
                            if (decisionTree.dualOccupancy === 'Yes') {
                              unitPrefix = `Units ${address.unitNumber}`;
                            } else {
                              unitPrefix = `Unit ${address.unitNumber}`;
                            }
                            finalAddress = `${unitPrefix}, ${baseAddress}`;
                          } else {
                            finalAddress = baseAddress;
                          }
                        } else {
                          // Fall back to propertyAddress, remove lot/unit prefixes
                          let addressWithoutLot = (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').trim();
                          if (address?.unitNumber) {
                            // Keep unit in address
                            let unitPrefix = '';
                            // For dual occupancy, always use "Units" (plural), otherwise "Unit" (singular)
                            if (decisionTree.dualOccupancy === 'Yes') {
                              unitPrefix = `Units ${address.unitNumber}`;
                            } else {
                              unitPrefix = `Unit ${address.unitNumber}`;
                            }
                            // Remove unit prefix to get base address
                            const baseAddress = addressWithoutLot.replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
                            finalAddress = `${unitPrefix}, ${baseAddress}`;
                          } else {
                            finalAddress = addressWithoutLot;
                          }
                        }
                        updateAddress({ 
                          lotNumber: '',
                          lotNumberNotApplicable: false,
                          propertyAddress: finalAddress || address?.propertyAddress || ''
                        });
                      }
                    }
                  }}
                  className="input-field"
                  placeholder="e.g., 17, 5, 12, or TBC"
                  disabled={lotNumberNotApplicable}
                  required={!lotNumberNotApplicable}
                />
              </div>
              <div className="flex items-center pt-8">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={lotNumberNotApplicable}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setLotNumberNotApplicable(checked);
                      if (checked) {
                        // Clear lot number and remove from address, preserve unit if exists
                        setLotNumber('');
                        let addressWithoutLot = (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').trim();
                        if (address?.unitNumber) {
                          // Keep unit in address
                          let unitPrefix = '';
                          // For dual occupancy, always use "Units" (plural), otherwise "Unit" (singular)
                          if (decisionTree.dualOccupancy === 'Yes') {
                            unitPrefix = `Units ${address.unitNumber}`;
                          } else {
                            unitPrefix = `Unit ${address.unitNumber}`;
                          }
                          // Remove unit prefix to get base address
                          const baseAddress = addressWithoutLot.replace(/^(Units?)\s+[^,]+,\s*/i, '').trim();
                          addressWithoutLot = `${unitPrefix}, ${baseAddress}`;
                        }
                        updateAddress({ 
                          lotNumber: '',
                          lotNumberNotApplicable: true,
                          propertyAddress: addressWithoutLot || address?.propertyAddress || ''
                        });
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium text-gray-700">Not Applicable</span>
                </label>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {lotNumberNotApplicable 
                ? 'Lot number will not be added to the address.' 
                : 'Lot number will be prepended to the address (e.g., "Lot 17, 123 Main Street...")'}
            </p>
          </div>
        )}

        {/* Unit Number Section - For all property types except Project */}
        {hasPropertyType && !isProject && (
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Unit Number</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter unit number(s) if this property has units. Can be a single unit, range, or comma-separated list.
            </p>

            {/* Does this property have unit numbers? */}
            <div className="mb-4">
              <label className="label-field">Does this property have unit numbers? *</label>
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasUnitNumbers"
                    checked={hasUnitNumbers === true}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHasUnitNumbers(true);
                        updateAddress({ hasUnitNumbers: true });
                      }
                    }}
                    className="w-4 h-4"
                    required
                  />
                  <span className="text-sm font-medium text-gray-700">Yes</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="hasUnitNumbers"
                    checked={hasUnitNumbers === false}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setHasUnitNumbers(false);
                        setUnitNumber('');
                        // Remove unit prefix from address
                        const baseAddressParts: string[] = [];
                        if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
                        if (address?.streetName) baseAddressParts.push(address.streetName);
                        if (address?.suburbName) baseAddressParts.push(address.suburbName);
                        if (address?.state) baseAddressParts.push(address.state);
                        if (address?.postCode) baseAddressParts.push(address.postCode);
                        
                        let finalAddress = baseAddressParts.length > 0 
                          ? baseAddressParts.join(' ')
                          : (address?.propertyAddress || '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
                        
                        // Preserve lot number if it exists
                        if (address?.lotNumber && !address.lotNumberNotApplicable) {
                          const addressWithoutLot = finalAddress.replace(/^Lot\s+[\d\w]+,\s*/i, '').trim();
                          finalAddress = `Lot ${address.lotNumber}, ${addressWithoutLot}`;
                        }
                        
                        updateAddress({ 
                          hasUnitNumbers: false,
                          unitNumber: '',
                          propertyAddress: finalAddress || address?.propertyAddress || ''
                        });
                      }
                    }}
                    className="w-4 h-4"
                    required
                  />
                  <span className="text-sm font-medium text-gray-700">No</span>
                </label>
              </div>
              {hasUnitNumbers === undefined && (
                <p className="text-xs text-gray-500 mt-1">Please select Yes or No</p>
              )}
            </div>

            {/* Which unit(s) are we buying? */}
            {hasUnitNumbers && (
              <div>
                <label className="label-field">Which unit(s) are we buying? *</label>
                <input
                  type="text"
                  value={unitNumber}
                  onChange={(e) => {
                    const value = e.target.value.trim();
                    setUnitNumber(value);
                    
                    // Update address with unit number
                    if (value) {
                      // Build base address from individual fields to ensure we preserve everything
                      const baseAddressParts: string[] = [];
                      if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
                      if (address?.streetName) baseAddressParts.push(address.streetName);
                      if (address?.suburbName) baseAddressParts.push(address.suburbName);
                      if (address?.state) baseAddressParts.push(address.state);
                      if (address?.postCode) baseAddressParts.push(address.postCode);
                      
                      // If we don't have individual fields, fall back to propertyAddress but remove lot/unit prefixes
                      let baseAddress = baseAddressParts.length > 0 
                        ? baseAddressParts.join(' ')
                        : (address?.propertyAddress || '').replace(/^Lot\s+[\d\w]+,\s*/i, '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
                      
                      // Format unit number for address
                      let unitPrefix = '';
                      // For dual occupancy, always use "Units" (plural), otherwise "Unit" (singular)
                      if (decisionTree.dualOccupancy === 'Yes') {
                        unitPrefix = `Units ${value}`;
                      } else {
                        unitPrefix = `Unit ${value}`;
                      }
                      
                      // Build new address: Lot (if exists) + Unit + Street
                      let newAddress = '';
                      if (address?.lotNumber && !address.lotNumberNotApplicable) {
                        newAddress = baseAddress ? `Lot ${address.lotNumber}, ${unitPrefix}, ${baseAddress}` : `Lot ${address.lotNumber}, ${unitPrefix}`;
                      } else {
                        newAddress = baseAddress ? `${unitPrefix}, ${baseAddress}` : unitPrefix;
                      }
                      
                      updateAddress({ 
                        unitNumber: value,
                        propertyAddress: newAddress 
                      });
                    } else {
                      // Remove unit prefix from address
                      // Build base address from individual fields to ensure we preserve everything
                      const baseAddressParts: string[] = [];
                      if (address?.streetNumber) baseAddressParts.push(address.streetNumber);
                      if (address?.streetName) baseAddressParts.push(address.streetName);
                      if (address?.suburbName) baseAddressParts.push(address.suburbName);
                      if (address?.state) baseAddressParts.push(address.state);
                      if (address?.postCode) baseAddressParts.push(address.postCode);
                      
                      let finalAddress = '';
                      if (baseAddressParts.length > 0) {
                        // Use individual fields
                        const baseAddress = baseAddressParts.join(' ');
                        if (address?.lotNumber && !address.lotNumberNotApplicable) {
                          finalAddress = `Lot ${address.lotNumber}, ${baseAddress}`;
                        } else {
                          finalAddress = baseAddress;
                        }
                      } else {
                        // Fall back to propertyAddress, remove unit prefix
                        const addressWithoutUnit = (address?.propertyAddress || '').replace(/^(Units?)\s+[^,]+(?:,\s*[^,]+)*,\s*/i, '').trim();
                        // Preserve lot number if it exists
                        finalAddress = addressWithoutUnit;
                        if (address?.lotNumber && !address.lotNumberNotApplicable) {
                          const addressWithoutLot = addressWithoutUnit.replace(/^Lot\s+[\d\w]+,\s*/i, '').trim();
                          finalAddress = `Lot ${address.lotNumber}, ${addressWithoutLot}`;
                        }
                      }
                      updateAddress({ 
                        unitNumber: '',
                        propertyAddress: finalAddress || address?.propertyAddress || ''
                      });
                    }
                  }}
                  className="input-field"
                  placeholder="e.g., 2, 1-8, A,B,C, or A-C"
                  required={true}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter single unit (e.g., "2" or "A"), range (e.g., "1-8" or "A-C"), or comma-separated list (e.g., "1,2,3" or "A,B,C")
                </p>
              </div>
            )}
          </div>
        )}

        {/* Lots Section - Only for Projects */}
        {isProject && (
          <div className="pt-6 border-t">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Lots</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter details for each lot in this project. Each lot will become its own record in the customer object and Deal Sheet.
            </p>

            {/* How many lots? */}
            <div className="mb-6">
              <label className="label-field">How many lots? *</label>
              <input
                type="number"
                min="1"
                value={numberOfLots}
                onChange={(e) => {
                  const value = e.target.value;
                  setNumberOfLots(value);
                  if (value) {
                    const count = parseInt(value, 10);
                    if (count > 0 && count !== lots.length) {
                      const newLots: LotDetails[] = [];
                      for (let i = 0; i < count; i++) {
                        newLots.push({
                          lotNumber: lots[i]?.lotNumber || '',
                          singleOrDual: lots[i]?.singleOrDual || '',
                        });
                      }
                      setLots(newLots);
                      updateLots(newLots);
                    }
                  }
                }}
                className="input-field w-32"
                required
              />
            </div>

            {/* Lots List */}
            {lots.length > 0 && (
              <div className="space-y-4">
                {lots.map((lot, index) => (
                  <div key={index} className="p-4 border border-gray-300 rounded-lg bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-gray-900">Lot {index + 1}</h4>
                      {lots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeLot(index)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove Lot
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-field">Lot Number *</label>
                        <input
                          type="text"
                          value={lot.lotNumber}
                          onChange={(e) => {
                            const value = e.target.value;
                            const upperValue = value.toUpperCase();
                            
                            // Allow: empty, numbers only, or TBC (allow typing T, TB, TBC)
                            const isNumber = /^\d+$/.test(value);
                            const isTBC = value.toUpperCase() === 'T' || 
                                         value.toUpperCase() === 'TB' || 
                                         value.toUpperCase() === 'TBC';
                            
                            if (value === '' || isNumber || isTBC) {
                              // Convert TBC to uppercase, keep numbers as-is
                              updateLot(index, 'lotNumber', isTBC ? upperValue : value);
                            }
                          }}
                          className={`input-field ${isDuplicateLotNumber(lot.lotNumber, index) ? 'border-red-500 bg-red-50' : ''}`}
                          placeholder="e.g., 5, 12, or TBC"
                          required
                        />
                        {isDuplicateLotNumber(lot.lotNumber, index) && (
                          <p className="text-xs text-red-600 mt-1 font-medium">
                            ⚠️ Duplicate lot number detected
                          </p>
                        )}
                        {!isDuplicateLotNumber(lot.lotNumber, index) && (
                          <p className="text-xs text-gray-500 mt-1">
                            Enter number only (e.g., 5, 12) or TBC
                          </p>
                        )}
                      </div>
                      <div>
                        <label className="label-field">Single or Dual Occupancy? *</label>
                        <select
                          value={lot.singleOrDual}
                          onChange={(e) => updateLot(index, 'singleOrDual', e.target.value as DualOccupancy)}
                          className="input-field"
                          required
                        >
                          <option value="">Select...</option>
                          <option value="No">Single Occupancy</option>
                          <option value="Yes">Dual Occupancy</option>
                          <option value="TBC">TBC</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Add Another Lot Button */}
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={addLot}
                    className="btn-secondary"
                  >
                    + Add Another Lot
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}

function getSubjectLineFormat(tree: { propertyType: PropertyType | null; contractType: ContractType | null; lotType: LotType | null }): string {
  if (!tree.propertyType || !tree.contractType) {
    return 'Complete all fields to see subject line format';
  }

  // For Established, lotType is not needed
  if (tree.propertyType === 'Established' || tree.contractType === '05 Established') {
    return 'Established Property - [Suburb] - [Price]';
  }

  // For New, need lotType
  if (tree.propertyType === 'New' && tree.lotType) {
    if (tree.contractType === '01 H&L Comms' && tree.lotType === 'Multiple') {
      return 'New H&L Project - [Suburb] - [Lots Available]';
    } else if (tree.contractType === '01 H&L Comms' && tree.lotType === 'Individual') {
      return 'New H&L - [Suburb] - [Price]';
    } else if (tree.contractType === '02 Single Comms' || tree.contractType === '03 Internal with Comms' || tree.contractType === '04 Internal No-Comms') {
      return 'New Build - [Suburb] - [Price]';
    }
  }

  return 'Complete all fields to see subject line format';
}

