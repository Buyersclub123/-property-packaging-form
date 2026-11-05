'use client';

import { useRouter } from 'next/navigation';

/** "‹ Back" to the menu the user came from (same-origin referrer), else the given fallback. */
export default function BackLink({ fallback = '/', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter();
  // Always navigate to an explicit route (never router.back()): the URL must match the page shown, so links and
  // per-URL permissions behave (JT 5/11 - /journey stayed in the address bar after Back).
  const go = (e: React.MouseEvent) => { e.preventDefault(); router.push(fallback); };
  return (
    <a
      href={fallback}
      onClick={go}
      className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-gray-500 no-underline hover:text-brand-charcoal"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
        <path d="M8.5 3L4.5 7l4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      {label}
    </a>
  );
}
