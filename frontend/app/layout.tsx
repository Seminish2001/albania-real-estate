import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Immo Albania - Digital Real Estate Platform',
  description: 'Find your perfect property in Albania. Browse thousands of verified listings for sale and rent.',
  keywords: 'real estate, Albania, property, rent, buy, apartments, houses, commercial',
  authors: [{ name: 'Immo Albania' }],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-gray-50 font-sans">
        <Providers>
          <div className="min-h-full flex flex-col">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
