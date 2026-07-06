'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadUserSettings,
  saveUserSettings,
  type UserSettings,
} from '@/lib/user';

export function useUserSettings() {
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

  const update = useCallback((partial: Partial<UserSettings>) => {
    const next = saveUserSettings(partial);
    setSettings(next);
    return next;
  }, []);

  return { settings, update, refresh, ready: settings !== null };
}
