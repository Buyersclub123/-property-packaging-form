import '../styles/globals.css';

import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'BC Tools', template: '%s' },
  description: 'Internal tools portal',
  icons: {
    icon: '/logo.jpg',
  },
  robots: 'noindex, nofollow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
