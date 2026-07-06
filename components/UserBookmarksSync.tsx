'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { loadBookmarksFromDb, saveBookmarksToDb } from '@/app/actions/user';
import { loadUserSettings, saveUserSettings } from '@/lib/user';

function mergeBookmarkIds(db: string[], local: string[]): string[] {
  const seen = new Set<string>();
  const merged: string[] = [];
  for (const id of [...db, ...local]) {
    if (seen.has(id)) continue;
    seen.add(id);
    merged.push(id);
  }
  return merged;
}

export function UserBookmarksSync() {
  const { status } = useSession();
  const syncedRef = useRef(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      syncedRef.current = false;
    }
  }, [status]);

  useEffect(() => {
    if (status !== 'authenticated' || syncedRef.current) return;
    syncedRef.current = true;

    void (async () => {
      const dbBookmarks = await loadBookmarksFromDb();
      if (dbBookmarks === null) return;

      const localBookmarks = loadUserSettings().bookmarks;
      const merged = mergeBookmarkIds(dbBookmarks, localBookmarks);

      saveUserSettings({ bookmarks: merged });

      const dbSet = new Set(dbBookmarks);
      const needsDbUpdate =
        merged.length !== dbBookmarks.length || merged.some((id) => !dbSet.has(id));

      if (needsDbUpdate) {
        await saveBookmarksToDb(merged);
      }
    })();
  }, [status]);

  return null;
}
