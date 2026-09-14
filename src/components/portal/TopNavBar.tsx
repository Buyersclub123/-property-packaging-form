'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { teams } from '@/lib/portalConfig';

export default function TopNavBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const links = [
    { href: '/', label: 'Dashboard' },
    ...teams.map((team) => ({ href: `/team/${team.id}`, label: team.name })),
  ];

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname.startsWith(href);

  return (
    <header className="bg-brand-charcoal text-white">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-4 px-4 py-[22px]">
        <Link href="/" className="flex items-center gap-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow focus-visible:ring-offset-2 focus-visible:ring-offset-brand-charcoal rounded">
          <span className="flex items-baseline leading-none">
            <span className="text-[19px] font-extrabold tracking-[-0.02em] text-white">
              buyers
            </span>
            <span className="text-[19px] font-extrabold tracking-[-0.02em] text-brand-yellow">
              club
            </span>
          </span>
          <span aria-hidden="true" className="h-[26px] w-px flex-shrink-0 bg-white/20" />
          <span className="text-[17px] font-bold leading-none tracking-[-0.3px] text-white">
            Tools
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 lg:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={[
                'rounded-full px-3.5 py-2 text-[13px] font-medium transition-colors',
                'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow',
                isActive(link.href)
                  ? 'bg-brand-yellow text-brand-charcoal font-semibold'
                  : 'text-white/70 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Mobile toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="portal-mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
          className="rounded-lg p-2 text-white hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-yellow lg:hidden"
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
            {open ? (
              <path
                d="M5 5l12 12M17 5L5 17"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            ) : (
              <path
                d="M3 6h16M3 11h16M3 16h16"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav
          id="portal-mobile-nav"
          className="border-t border-white/10 px-4 pb-4 pt-2 lg:hidden"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(link.href) ? 'page' : undefined}
              className={[
                'block rounded-lg px-3 py-2.5 text-[14px] transition-colors',
                isActive(link.href)
                  ? 'bg-brand-yellow font-semibold text-brand-charcoal'
                  : 'text-white/75 hover:bg-white/10 hover:text-white',
              ].join(' ')}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
