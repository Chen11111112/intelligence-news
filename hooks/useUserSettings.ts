'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadAIUsageFromDb } from '@/app/actions/user';
import {
  loadUserSettings,
  saveUserSettings,
  type UserSettings,
} from '@/lib/user';
import { useSession } from 'next-auth/react';

export function useUserSettings() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<UserSettings | null>(null);

  const refresh = useCallback(() => {
    setSettings(loadUserSettings());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('user-settings-updated', onUpdate);
    window.addEventListener('storage', onUpdate);
    return () => {
      window.removeEventListener('user-settings-updated', onUpdate);
      window.removeEventListener('storage', onUpdate);
    };
  }, [refresh]);

  useEffect(() => {
    if (!session?.user?.id) return;
    void loadAIUsageFromDb().then((usage) => {
      if (usage) {
        saveUserSettings({ aiUsage: usage });
        refresh();
      }
    });
  }, [session?.user?.id, refresh]);

  const update = useCallback((partial: Partial<UserSettings>) => {
    const next = saveUserSettings(partial);
    setSettings(next);
    return next;
  }, []);

  return { settings, update, refresh, ready: settings !== null };
}
