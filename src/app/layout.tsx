import '../styles/globals.css';

export const metadata = {
  title: 'Buyers Club Tools',
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
