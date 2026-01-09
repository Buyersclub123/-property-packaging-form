/**
 * Mock Data Utility for Testing/Demonstrations
 * 
 * Safe to use - only populates form, never auto-submits
 * Call from browser console: window.loadMockData('project') or window.loadMockData('single')
 */

import { useFormStore } from '@/store/formStore';
import { FormData } from '@/types/form';

export const mockDataProject = (): Partial<FormData> => ({
  decisionTree: {
    propertyType: 'New',
    contractType: '01',
    lotType: 'Multiple',
    dualOccupancy: 'No',
    status: '01',
  },
  address: {
    propertyAddress: '123 Test Street Maroochydore QLD 4558',
    projectAddress: '123 Test Street Maroochydore QLD 4558',
    streetNumber: '123',
    streetName: 'Test Street',
    suburbName: 'Maroochydore',
    state: 'QLD',
    postCode: '4558',
    lga: 'Sunshine Coast Regional',
    googleMap: 'https://maps.google.com/?q=123+Test+Street+Maroochydore+QLD+4558',
  },
  riskOverlays: {
    flood: 'No',
    bushfire: 'No',
    mining: 'No',
    otherOverlay: 'No',
    specialInfrastructure: 'No',
    dueDiligenceAcceptance: 'Yes',
    zoning: 'R1 General Residential',
  },
  lots: [
    {
      lotNumber: '101',
      singleOrDual: 'No',
      propertyDescription: {
        bedsPrimary: '4',
        bathPrimary: '2',
        garagePrimary: '2',
        landSize: '600',
        buildSize: '245',
        landRegistration: 'January 2026 approx.',
        title: 'Individual',
      },
      purchasePrice: {
        landPrice: '450000',
        buildPrice: '520000',
        cashbackRebateValue: '20000',
        cashbackRebateType: 'Cashback',
        comparableSales: 'Strong market demand in area',
      },
      rentalAssessment: {
        occupancy: 'Vacant',
        rentAppraisalPrimaryFrom: '870',
        rentAppraisalPrimaryTo: '920',
      },
    },
    {
      lotNumber: '102',
      singleOrDual: 'Yes',
      propertyDescription: {
        bedsPrimary: '4',
        bedsSecondary: '3',
        bathPrimary: '2',
        bathSecondary: '2',
        garagePrimary: '2',
        garageSecondary: '1',
        landSize: '456',
        buildSize: '256',
        landRegistration: 'Registered',
        title: 'Individual',
      },
      purchasePrice: {
        landPrice: '390000',
        buildPrice: '430000',
        cashbackRebateValue: '20000',
        cashbackRebateType: 'Cashback',
        comparableSales: 'Dual occupancy increasing in popularity',
      },
      rentalAssessment: {
        occupancy: 'Vacant',
        rentAppraisalPrimaryFrom: '600',
        rentAppraisalPrimaryTo: '620',
        rentAppraisalSecondaryFrom: '520',
        rentAppraisalSecondaryTo: '550',
      },
    },
  ],
  marketPerformance: {
    medianPriceChange3Months: '2.5',
    medianPriceChange1Year: '8.3',
    medianPriceChange3Year: '25.1',
    medianYield: '4.2',
  },
  contentSections: {
    whyThisProperty: 'Strong growth area with excellent infrastructure',
    proximity: 'Close to schools, shops, and transport',
    investmentHighlights: 'High rental yield potential',
  },
  packager: 'john.doe',
  sourcer: 'Real Estate Agent A',
  sellingAgentName: 'Jane Smith',
  sellingAgentEmail: 'jane@example.com',
  sellingAgentMobile: '0412345678',
});

export const mockDataSingleContract = (): Partial<FormData> => ({
  decisionTree: {
    propertyType: 'New',
    contractType: '02', // Single Contract
    lotType: 'Individual',
    dualOccupancy: 'No',
    status: '01',
  },
  address: {
    propertyAddress: '456 Single Contract Ave Sunshine Coast QLD 4558',
    streetNumber: '456',
    streetName: 'Single Contract Ave',
    suburbName: 'Sunshine Coast',
    state: 'QLD',
    postCode: '4558',
    lga: 'Sunshine Coast Regional',
    googleMap: 'https://maps.google.com/?q=456+Single+Contract+Ave+Sunshine+Coast+QLD+4558',
  },
  riskOverlays: {
    flood: 'No',
    bushfire: 'No',
    mining: 'No',
    otherOverlay: 'No',
    specialInfrastructure: 'No',
    dueDiligenceAcceptance: 'Yes',
    zoning: 'R1 General Residential',
  },
  propertyDescription: {
    bedsPrimary: '4',
    bathPrimary: '2',
    garagePrimary: '2',
    landSize: '650',
    buildSize: '280',
    landRegistration: 'March 2026 approx.',
    title: 'Individual',
  },
  purchasePrice: {
    totalPrice: '950000', // Single Contract uses totalPrice
    cashbackRebateValue: '25000',
    cashbackRebateType: 'Cashback',
    comparableSales: 'Excellent value for single contract',
  },
  rentalAssessment: {
    occupancy: 'Vacant',
    rentAppraisalPrimaryFrom: '950',
    rentAppraisalPrimaryTo: '1000',
  },
  marketPerformance: {
    medianPriceChange3Months: '2.5',
    medianPriceChange1Year: '8.3',
    medianPriceChange3Year: '25.1',
    medianYield: '4.2',
  },
  contentSections: {
    whyThisProperty: 'Single contract simplifies purchase',
    proximity: 'Close to amenities',
    investmentHighlights: 'Good rental yield',
  },
  packager: 'john.doe',
  sourcer: 'Real Estate Agent B',
  sellingAgentName: 'Bob Johnson',
  sellingAgentEmail: 'bob@example.com',
  sellingAgentMobile: '0498765432',
});

/**
 * Load mock data into form store
 * @param type - 'project' or 'single'
 */
export const loadMockData = (type: 'project' | 'single' = 'project') => {
  const store = useFormStore.getState();
  const mockData = type === 'project' ? mockDataProject() : mockDataSingleContract();
  
  // Reset form first
  store.resetForm();
  
  // Populate with mock data
  store.updateFormData(mockData);
  
  // Set current step to 1 (so user can click through)
  store.setCurrentStep(1);
  
  console.log(`✅ Mock data loaded: ${type === 'project' ? 'Project (4 lots)' : 'Single Contract H&L'}`);
  console.log('📝 You can now click through the form steps to see the data');
  console.log('⚠️  This will NOT auto-submit - you still need to go through all steps');
};

// Make available in browser console (development only)
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).loadMockData = loadMockData;
}
