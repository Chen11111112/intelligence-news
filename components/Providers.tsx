'use client';

import { SessionProvider } from 'next-auth/react';
import { AppShell } from '@/components/AppShell';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider basePath="/api/auth">
      <AppShell>{children}</AppShell>
    </SessionProvider>
  );
}
