'use client';

/** "‹ Back" to the menu the user came from (same-origin referrer), else the given fallback. */
export default function BackLink({ fallback = '/', label = 'Back' }: { fallback?: string; label?: string }) {
  // Plain full navigation (no client router): the browser sets the address bar itself, so the URL always matches
  // the page shown. Soft navigation left /journey in the bar after Back -> New Initiatives -> Outcomes (JT 5/11, 9/11).
  return (
    <a
      href={fallback}
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gray-500 no-underline hover:text-brand-charcoal"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}
