// Form state management with Zustand
// Persistence enabled with SSR-safe configuration

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { FormData, FormState, StashResponse, DecisionTree, AddressData, RiskOverlays, LotDetails, PropertyDescription, PurchasePrice, RentalAssessment, YesNo } from '@/types/form';

interface FormStore extends FormState {
  // User email for logging
  userEmail: string | null;
  setUserEmail: (email: string | null) => void;
  
  // Actions
  setCurrentStep: (step: number) => void;
  updateFormData: (data: Partial<FormData>) => void;
  updateDecisionTree: (tree: Partial<DecisionTree>) => void;
  updateAddress: (address: Partial<AddressData>) => void;
  updateRiskOverlays: (overlays: Partial<RiskOverlays>) => void;
  updateLots: (lots: LotDetails[]) => void;
  updateLotPropertyDescription: (lotIndex: number, description: Partial<PropertyDescription>) => void;
  updateLotPurchasePrice: (lotIndex: number, price: Partial<PurchasePrice>) => void;
  updateLotRentalAssessment: (lotIndex: number, assessment: Partial<RentalAssessment>) => void;
  replicateLotData: (sourceLotIndex: number, targetLotIndices: number[], sections: ('propertyDescription' | 'purchasePrice' | 'rentalAssessment' | 'all')[]) => void;
  updatePropertyDescription: (description: Partial<PropertyDescription>) => void;
  updatePurchasePrice: (price: Partial<PurchasePrice>) => void;
  updateRentalAssessment: (assessment: Partial<RentalAssessment>) => void;
  setStashData: (data: StashResponse | null) => void;
  setStashLoading: (loading: boolean) => void;
  setStashError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (field: string, error: string) => void;
  clearError: (field: string) => void;
  clearAllErrors: () => void;
  resetForm: () => void;
  clearStep2Data: () => void;
  step2ClearTimestamp: number;
}

const initialFormData: FormData = {
  decisionTree: {
    propertyType: null,
    contractType: null,
    contractTypeSimplified: null,
    lotType: null,
    dualOccupancy: null,
    status: null,
  },
  address: {
    propertyAddress: '',
  },
  riskOverlays: {
    flood: '' as YesNo,
    bushfire: '' as YesNo,
    mining: '' as YesNo,
    otherOverlay: '' as YesNo,
    specialInfrastructure: '' as YesNo,
    dueDiligenceAcceptance: '' as YesNo,
  },
  propertyDescription: {},
  purchasePrice: {},
  rentalAssessment: {},
  marketPerformance: {},
  contentSections: {},
  agentInfo: {},
  lots: [],
};

// SSR-safe storage - no-op during SSR, localStorage on client
const getStorage = (): Storage => {
  if (typeof window === 'undefined') {
    // Return a no-op storage object for SSR
    return {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {},
      get length() { return 0; },
      key: () => null,
    } as Storage;
  }
  return localStorage;
};

export const useFormStore = create<FormStore>()(
  persist(
    (set) => ({
      // Initial state
      currentStep: 1,
      formData: initialFormData,
      isLoading: false,
      errors: {},
      stashData: null,
      stashLoading: false,
      stashError: null,
      step2ClearTimestamp: Date.now(),
      userEmail: null,

      // Actions
      setCurrentStep: (step) => set({ currentStep: step }),
      setUserEmail: (email) => set({ userEmail: email }),
      
      updateFormData: (data) =>
        set((state) => ({
          formData: { ...state.formData, ...data },
        })),
      
      updateDecisionTree: (tree) =>
        set((state) => ({
          formData: {
            ...state.formData,
            decisionTree: { ...state.formData.decisionTree, ...tree },
          },
        })),
      
      updateAddress: (address) =>
        set((state) => ({
          formData: {
            ...state.formData,
            address: { ...state.formData.address, ...address },
          },
        })),
      
      updateRiskOverlays: (overlays) =>
        set((state) => {
          // Create new riskOverlays object, explicitly removing properties set to undefined
          const newRiskOverlays: RiskOverlays = { ...state.formData.riskOverlays };
          Object.keys(overlays).forEach((key) => {
            const typedKey = key as keyof RiskOverlays;
            const value = overlays[typedKey];
            if (value === undefined) {
              // Explicitly delete the property if set to undefined
              delete newRiskOverlays[typedKey];
            } else {
              // Otherwise, update the property
              newRiskOverlays[typedKey] = value as any;
            }
          });
          return {
            formData: {
              ...state.formData,
              riskOverlays: newRiskOverlays,
            },
          };
        }),
      
      updateLots: (lots) =>
        set((state) => ({
          formData: {
            ...state.formData,
            lots: lots,
          },
        })),
      
      updateLotPropertyDescription: (lotIndex, description) =>
        set((state) => {
          const updatedLots = [...(state.formData.lots || [])];
          if (updatedLots[lotIndex]) {
            // Create new propertyDescription object, explicitly removing properties set to undefined
            const newPropertyDescription: PropertyDescription = { ...updatedLots[lotIndex].propertyDescription };
            Object.keys(description).forEach((key) => {
              const typedKey = key as keyof PropertyDescription;
              const value = description[typedKey];
              if (value === undefined) {
                // Explicitly delete the property if set to undefined
                delete newPropertyDescription[typedKey];
              } else {
                // Otherwise, update the property
                newPropertyDescription[typedKey] = value as any;
              }
            });
            updatedLots[lotIndex] = {
              ...updatedLots[lotIndex],
              propertyDescription: newPropertyDescription,
            };
          }
          return {
            formData: {
              ...state.formData,
              lots: updatedLots,
            },
          };
        }),
      
      updateLotPurchasePrice: (lotIndex, price) =>
        set((state) => {
          const updatedLots = [...(state.formData.lots || [])];
          if (updatedLots[lotIndex]) {
            updatedLots[lotIndex] = {
              ...updatedLots[lotIndex],
              purchasePrice: {
                ...updatedLots[lotIndex].purchasePrice,
                ...price,
              },
            };
          }
          return {
            formData: {
              ...state.formData,
              lots: updatedLots,
            },
          };
        }),
      
      updateLotRentalAssessment: (lotIndex, assessment) =>
        set((state) => {
          const updatedLots = [...(state.formData.lots || [])];
          if (updatedLots[lotIndex]) {
            updatedLots[lotIndex] = {
              ...updatedLots[lotIndex],
              rentalAssessment: {
                ...updatedLots[lotIndex].rentalAssessment,
                ...assessment,
              },
            };
          }
          return {
            formData: {
              ...state.formData,
              lots: updatedLots,
            },
          };
        }),
      
      replicateLotData: (sourceLotIndex, targetLotIndices, sections) =>
        set((state) => {
          if (!state.formData.lots || state.formData.lots.length === 0) return state;
          const sourceLot = state.formData.lots[sourceLotIndex];
          if (!sourceLot) return state;
          
          const updatedLots = [...state.formData.lots];
          
          targetLotIndices.forEach((targetIndex) => {
            if (updatedLots[targetIndex] && targetIndex !== sourceLotIndex) {
              const updatedLot = { ...updatedLots[targetIndex] };
              
              if (sections.includes('all') || sections.includes('propertyDescription')) {
                updatedLot.propertyDescription = { ...sourceLot.propertyDescription };
              }
              if (sections.includes('all') || sections.includes('purchasePrice')) {
                updatedLot.purchasePrice = { ...sourceLot.purchasePrice };
              }
              if (sections.includes('all') || sections.includes('rentalAssessment')) {
                updatedLot.rentalAssessment = { ...sourceLot.rentalAssessment };
              }
              
              updatedLots[targetIndex] = updatedLot;
            }
          });
          
          return {
            formData: {
              ...state.formData,
              lots: updatedLots,
            },
          };
        }),
      
      updatePropertyDescription: (description) =>
        set((state) => {
          // Create new propertyDescription object, explicitly removing properties set to undefined
          const newPropertyDescription: PropertyDescription = { ...state.formData.propertyDescription };
          Object.keys(description).forEach((key) => {
            const typedKey = key as keyof PropertyDescription;
            const value = description[typedKey];
            if (value === undefined) {
              // Explicitly delete the property if set to undefined
              delete newPropertyDescription[typedKey];
            } else {
              // Otherwise, update the property
              newPropertyDescription[typedKey] = value as any;
            }
          });
          return {
            formData: {
              ...state.formData,
              propertyDescription: newPropertyDescription,
            },
          };
        }),
      
      updatePurchasePrice: (price) =>
        set((state) => ({
          formData: {
            ...state.formData,
            purchasePrice: { ...state.formData.purchasePrice, ...price },
          },
        })),
      
      updateRentalAssessment: (assessment) =>
        set((state) => ({
          formData: {
            ...state.formData,
            rentalAssessment: { ...state.formData.rentalAssessment, ...assessment },
          },
        })),
      
      setStashData: (data) => set({ stashData: data }),
      
      setStashLoading: (loading) => set({ stashLoading: loading }),
      
      setStashError: (error) => set({ stashError: error }),
      
      setLoading: (loading) => set({ isLoading: loading }),
      
      setError: (field, error) =>
        set((state) => ({
          errors: { ...state.errors, [field]: error },
        })),
      
      clearError: (field) =>
        set((state) => {
          const newErrors = { ...state.errors };
          delete newErrors[field];
          return { errors: newErrors };
        }),
      
      clearAllErrors: () => set({ errors: {} }),
      
      clearStep2Data: () => {
        // Get current state BEFORE clearing localStorage
        const currentState = useFormStore.getState();
        
        // Remove localStorage completely FIRST - EXACTLY like resetForm does
        if (typeof window !== 'undefined') {
          localStorage.removeItem('property-form-storage');
        }
        
        // Create completely NEW empty objects (not reusing references)
        const emptyPropertyDescription: PropertyDescription = {};
        const emptyPurchasePrice: PurchasePrice = {};
        const emptyRentalAssessment: RentalAssessment = {};
        
        // Create new formData with empty Step 2 fields - EXACTLY like resetForm does
        const clearedFormData: FormData = {
          decisionTree: currentState.formData.decisionTree,
          address: currentState.formData.address,
          riskOverlays: currentState.formData.riskOverlays,
          propertyDescription: emptyPropertyDescription,
          purchasePrice: emptyPurchasePrice,
          rentalAssessment: emptyRentalAssessment,
          marketPerformance: currentState.formData.marketPerformance || {},
          contentSections: currentState.formData.contentSections || {},
          agentInfo: currentState.formData.agentInfo || {},
          lots: currentState.formData.lots,
        };
        
        // Update state - EXACTLY like resetForm does
        set({
          formData: clearedFormData,
          step2ClearTimestamp: Date.now(),
        });
      },
      
      resetForm: () => {
        // Clear localStorage FIRST to prevent rehydration
        if (typeof window !== 'undefined') {
          localStorage.removeItem('property-form-storage');
        }
        
        // Create completely fresh formData with explicitly empty Step 2 fields
        const resetFormData: FormData = {
          ...initialFormData,
          // Explicitly ensure Step 2 fields are empty objects (not undefined)
          propertyDescription: {},
          purchasePrice: {},
          rentalAssessment: {},
        };
        
        // Reset state - persist middleware will save this empty state
        set({
          currentStep: 1,
          formData: resetFormData,
          errors: {},
          stashData: null,
          stashError: null,
          step2ClearTimestamp: Date.now(),
        });
      },
    }),
    {
      name: 'property-form-storage',
      storage: createJSONStorage(getStorage),
      // Skip automatic hydration - we'll hydrate manually on client
      skipHydration: true,
      // Exclude Decision Tree and Step 2 fields from persistence - always start blank
      partialize: (state) => ({
        ...state,
        formData: {
          ...state.formData,
          decisionTree: {
            propertyType: null,
            contractType: null,
            contractTypeSimplified: null, // Include so field always exists in state
            lotType: null,
            dualOccupancy: null,
            status: null,
          },
          // Exclude Step 2 fields from persistence
          propertyDescription: {},
          purchasePrice: {},
          rentalAssessment: {},
        },
      }),
    }
  )
);
