export const NOTIFICATIONS_STORAGE_KEY = 'user_notifications';
export const KNOWN_ARTICLE_IDS_KEY = 'known_article_ids';

export interface AppNotification {
  id: string;
  type: 'crawl_update';
  title: string;
  body: string;
  articleIds: string[];
  createdAt: string;
  read: boolean;
}

export function loadNotifications(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (n): n is AppNotification =>
        !!n &&
        typeof n === 'object' &&
        typeof (n as AppNotification).id === 'string' &&
        typeof (n as AppNotification).title === 'string',
    );
  } catch {
    return [];
  }
}

export function saveNotifications(list: AppNotification[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(list.slice(0, 50)));
  window.dispatchEvent(new Event('notifications-updated'));
}

export function loadKnownArticleIds(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(KNOWN_ARTICLE_IDS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : []);
  } catch {
    return new Set();
  }
}

export function saveKnownArticleIds(ids: Iterable<string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KNOWN_ARTICLE_IDS_KEY, JSON.stringify([...ids]));
}

export function addCrawlNotifications(
  newArticleIds: string[],
  title: string,
  body: string,
): AppNotification[] {
  if (newArticleIds.length === 0) return loadNotifications();
  const list = loadNotifications();
  const notification: AppNotification = {
    id: `crawl-${Date.now()}`,
    type: 'crawl_update',
    title,
    body,
    articleIds: newArticleIds,
    createdAt: new Date().toISOString(),
    read: false,
  };
  const next = [notification, ...list];
  saveNotifications(next);
  return next;
}

export function markNotificationRead(id: string): void {
  const next = loadNotifications().map((n) => (n.id === id ? { ...n, read: true } : n));
  saveNotifications(next);
}

export function markAllNotificationsRead(): void {
  saveNotifications(loadNotifications().map((n) => ({ ...n, read: true })));
}

export function unreadCount(): number {
  return loadNotifications().filter((n) => !n.read).length;
}
