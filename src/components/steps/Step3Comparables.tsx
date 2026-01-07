'use client';

export function Step3Comparables() {
  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Comparables Check</h2>
      <p className="text-gray-600 mb-6">
        Please check comparables at CoreLogic RPP. This step cannot be automated.
      </p>
      <div className="p-6 bg-blue-50 rounded-lg">
        <p className="mb-4">
          <strong>Instructions:</strong>
        </p>
        <ol className="list-decimal list-inside space-y-2 mb-4">
          <li>Go to <a href="https://rpp.corelogic.com.au/account" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">CoreLogic RPP</a></li>
          <li>Search for comparable sales and rentals</li>
          <li>Review the data</li>
          <li>Click "Next" when done</li>
        </ol>
        <a
          href="https://rpp.corelogic.com.au/account"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary inline-block"
        >
          Open CoreLogic RPP
        </a>
      </div>
    </div>
  );
}







