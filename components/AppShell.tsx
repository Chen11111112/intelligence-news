'use client';

import { useNewsNotifications } from '@/hooks/useNewsNotifications';
import { DemoNotice } from '@/components/DemoNotice';
import { UserBookmarksSync } from '@/components/UserBookmarksSync';

export function AppShell({ children }: { children: React.ReactNode }) {
  useNewsNotifications();
  return (
    <>
      <DemoNotice />
      <UserBookmarksSync />
      {children}
    </>
  );
}
