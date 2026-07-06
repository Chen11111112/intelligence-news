'use client';

import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { UserBookmarksSync } from '@/components/UserBookmarksSync';

export function AppShell({ children }: { children: React.ReactNode }) {
  useNewsNotifications();
  return (
    <>
      <UserBookmarksSync />
      {children}
    </>
  );
}
