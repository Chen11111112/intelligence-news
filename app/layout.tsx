// app/layout.tsx
import React from 'react';
import { SiteFooter } from '@/components/Footer';
import { TopAppBar, BottomNavBar } from '@/components/Navigation';
import { Providers } from '@/components/Providers';
import './globals.css';

export const metadata = {
  title: 'Intelligence News',
  description: '透過時事學習英文!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body suppressHydrationWarning className="min-h-screen bg-background text-foreground flex flex-col antialiased">
        <Providers>
          <TopAppBar />
          <main className="flex-grow">{children}</main>
          <SiteFooter />
          <BottomNavBar />
        </Providers>
      </body>
    </html>
  );
}