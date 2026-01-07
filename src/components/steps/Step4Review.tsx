'use client';

import { useFormStore } from '@/store/formStore';

export function Step4Review() {
  const { formData } = useFormStore();

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Review & Submit</h2>
      <p className="text-gray-600 mb-6">
        Review your information before submitting.
      </p>
      <div className="bg-gray-50 p-6 rounded-lg">
        <pre className="text-xs overflow-auto">
          {JSON.stringify(formData, null, 2)}
        </pre>
      </div>
      <p className="text-gray-500 italic mt-4">
        Submit functionality will be implemented with GHL API integration.
      </p>
    </div>
  );
}







