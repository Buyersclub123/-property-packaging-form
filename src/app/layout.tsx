import '../styles/globals.css';

export const metadata = {
  title: 'Property Packaging Form',
  description: 'Multi-step property packaging form with intelligent workflow',
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


