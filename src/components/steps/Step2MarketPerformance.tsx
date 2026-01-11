'use client';

import { useFormStore } from '@/store/formStore';

export function Step3MarketPerformance() {
  const { formData } = useFormStore();
  const { address } = formData;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Market Performance</h2>
      <p className="text-gray-600 mb-6">
        Market performance data will be checked and collected here. If data is missing or outdated, you'll be prompted to collect it.
      </p>

      {/* Google Sheet Info */}
      <div className="p-4 bg-blue-50 rounded-lg mb-6">
        <p className="text-sm font-semibold text-blue-900 mb-2">Google Sheet:</p>
        <p className="text-blue-700 text-sm">
          <strong>Name:</strong> Property Review Static Data - Market Performance
        </p>
        <p className="text-blue-700 text-sm">
          <strong>Tab:</strong> Market Performance
        </p>
        <p className="text-blue-700 text-sm">
          <strong>Lookup:</strong> By Suburb ({address.suburbName || 'TBD'}) and State ({address.state || 'TBD'})
        </p>
      </div>

      {/* Market Performance Fields */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label-field">Median price change - 3 months</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Median price change - 1 year</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Median price change - 3 year</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Median price change - 5 year</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Median yield</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Median rent change - 1 year</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Rental Population</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
          <div>
            <label className="label-field">Vacancy Rate</label>
            <input
              type="text"
              className="input-field"
              placeholder="% (2 decimal places)"
            />
          </div>
        </div>

        {/* Data Collection Notice */}
        <div className="p-4 bg-yellow-50 rounded-lg mt-6">
          <p className="text-sm text-yellow-900">
            <strong>Note:</strong> If data is missing or outdated, data collection forms will appear here.
          </p>
        </div>
      </div>

      {/* CMI Reports Notice (from Comparables) */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-700">
          <strong>📁 CMI Reports:</strong> Please save CMI reports in the property folder created when you clicked "Continue with Packaging".
        </p>
      </div>
    </div>
  );
}

