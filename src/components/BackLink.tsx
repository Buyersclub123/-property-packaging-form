'use client';

import { useRouter } from 'next/navigation';

/** "‹ Back" to the menu the user came from (same-origin referrer), else the given fallback. */
export default function BackLink({ fallback = '/', label = 'Back' }: { fallback?: string; label?: string }) {
  const router = useRouter();
  const go = (e: React.MouseEvent) => {
    e.preventDefault();
    const ref = typeof document !== 'undefined' ? document.referrer : '';
    if (ref && typeof window !== 'undefined' && ref.startsWith(window.location.origin) && ref !== window.location.href) {
      router.back();
    } else {
      router.push(fallback);
    }
  };
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
