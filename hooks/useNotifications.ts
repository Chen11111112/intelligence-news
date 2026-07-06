'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  unreadCount,
  type AppNotification,
} from '@/lib/notifications';

export function useNotifications() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    setItems(loadNotifications());
    setUnread(unreadCount());
  }, []);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('notifications-updated', onUpdate);
    return () => window.removeEventListener('notifications-updated', onUpdate);
  }, [refresh]);

  const markRead = (id: string) => {
    markNotificationRead(id);
    refresh();
  };

  const markAllRead = () => {
    markAllNotificationsRead();
    refresh();
  };

  return { items, unread, markRead, markAllRead, refresh };
}
