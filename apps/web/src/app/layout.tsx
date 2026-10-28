import React from 'react';
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { LanguageProvider } from '@/lib/language-context';

export const metadata: Metadata = {
  title: 'የሰንበት ትምህርት ቤት አንድነት የመማሪያ መድረክ',
  description: 'Lean offline-first learning platform for Sunday School students',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#0C2340',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="am">
      <head>
        <link rel="icon" href="/favicon.ico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="bg-stone-50 text-stone-900 min-h-screen flex flex-col">
        <LanguageProvider>
          <Navbar />
          <main className="flex-1 w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 max-w-7xl has-[[data-admin-shell]]:p-0 has-[[data-admin-shell]]:max-w-none">
            {children}
          </main>
          <Footer />
        </LanguageProvider>
      </body>
    </html>
  );
}
