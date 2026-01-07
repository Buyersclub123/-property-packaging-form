'use client';

import { useFormStore } from '@/store/formStore';
import { PropertyType, ContractType, LotType } from '@/types/form';

export function Step0DecisionTree() {
  const { formData, updateDecisionTree } = useFormStore();
  const { decisionTree } = formData;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Decision Tree</h2>
      <p className="text-gray-600 mb-6">
        Answer these questions to determine the form structure and email subject line format.
      </p>

      <div className="space-y-6">
        {/* Property Type */}
        <div>
          <label className="label-field">Property Type *</label>
          <select
            value={decisionTree.propertyType || ''}
            onChange={(e) =>
              updateDecisionTree({ propertyType: e.target.value as PropertyType })
            }
            className="input-field"
            required
          >
            <option value="">Select...</option>
            <option value="New">New</option>
            <option value="Established">Established</option>
          </select>
        </div>

        {/* Contract Type */}
        <div>
          <label className="label-field">Contract Type *</label>
          <select
            value={decisionTree.contractType || ''}
            onChange={(e) =>
              updateDecisionTree({ contractType: e.target.value as ContractType })
            }
            className="input-field"
            required
          >
            <option value="">Select...</option>
            <option value="H&L">H&L</option>
            <option value="Single">Single</option>
            <option value="Internal">Internal</option>
            <option value="N/A">N/A</option>
          </select>
        </div>

        {/* Lot Type */}
        <div>
          <label className="label-field">Individual or Multiple Lots? *</label>
          <select
            value={decisionTree.lotType || ''}
            onChange={(e) =>
              updateDecisionTree({ lotType: e.target.value as LotType })
            }
            className="input-field"
            required
          >
            <option value="">Select...</option>
            <option value="Individual">Individual</option>
            <option value="Multiple">Multiple</option>
          </select>
        </div>
      </div>

      {/* Subject Line Preview */}
      {decisionTree.propertyType && decisionTree.contractType && decisionTree.lotType && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm font-semibold text-blue-900 mb-2">Email Subject Line Format:</p>
          <p className="text-blue-700">
            {getSubjectLineFormat(decisionTree)}
          </p>
        </div>
      )}
    </div>
  );
}

function getSubjectLineFormat(tree: { propertyType: PropertyType | null; contractType: ContractType | null; lotType: LotType | null }): string {
  if (!tree.propertyType || !tree.contractType || !tree.lotType) {
    return 'Complete all fields to see subject line format';
  }

  // Subject line format logic based on requirements
  // Note: ContractType values are '01 H&L Comms', '02 Single Comms', etc.
  const contractTypeStr = tree.contractType.toLowerCase();
  if (tree.propertyType === 'New' && contractTypeStr.includes('h&l') && tree.lotType === 'Multiple') {
    return 'New H&L Project - [Suburb] - [Lots Available]';
  } else if (tree.propertyType === 'New' && contractTypeStr.includes('h&l') && tree.lotType === 'Individual') {
    return 'New H&L - [Suburb] - [Price]';
  } else if (tree.propertyType === 'New' && contractTypeStr.includes('single')) {
    return 'New Build - [Suburb] - [Price]';
  } else if (tree.propertyType === 'Established') {
    return 'Established Property - [Suburb] - [Price]';
  }

  return 'Subject line format will be determined';
}


