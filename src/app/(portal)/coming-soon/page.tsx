import Link from 'next/link';

export default function ComingSoonPage() {
  return (
    <div className="min-h-full bg-brand-cream flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-brand-yellow/15 rounded-full flex items-center justify-center mx-auto mb-8">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 6v6l4 2" stroke="#FFD60A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="12" r="10" stroke="#FFD60A" strokeWidth="2" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-brand-charcoal mb-3">Coming Soon</h1>
        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
          This tool is currently under development.<br />
          Check back soon for updates.
        </p>
        <Link
          href="/"
          className="inline-block bg-brand-charcoal text-white px-6 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-charcoal/90 transition-colors shadow-sm"
        >
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
