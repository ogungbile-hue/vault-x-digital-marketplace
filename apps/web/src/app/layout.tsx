import React from 'react';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { QueryProvider } from '@/providers/query-provider';
import { ThemeProvider } from '@/providers/theme-provider';
import { Navbar } from '@/components/navbar';
import { CheckoutModal } from '@/components/checkout-modal';
import { RevealModal } from '@/components/reveal-modal';
import { TopupModal } from '@/components/topup-modal';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'VAULT-X | High-Concurrency Digital Goods Marketplace',
  description: 'Instant fulfillment digital goods marketplace with double-entry ledger and encrypted inventory vault',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-background text-foreground`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <QueryProvider>
            <Navbar />
            <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
            <CheckoutModal />
            <RevealModal />
            <TopupModal />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
