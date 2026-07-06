'use client';

import Link from 'next/link';
import { Bell, ChevronLeft } from 'lucide-react';
import { t } from '@/lib/copy';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationsPage() {
  const { items, unread, markRead, markAllRead } = useNotifications();

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-6 ui-page">
      <Link href="/" className="inline-flex items-center gap-2 ui-btn-ghost">
        <ChevronLeft size={20} />
        {t('common.back')}
      </Link>

      <header className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-50 dark:bg-blue-950/50 rounded-xl">
            <Bell className="text-blue-600 dark:text-blue-400" size={24} />
          </div>
          <div>
            <h1 className="text-3xl font-bold">{t('notifications.title')}</h1>
            {unread > 0 && <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">{unread}</p>}
          </div>
        </div>
        {unread > 0 && (
          <button
            type="button"
            onClick={markAllRead}
            className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
          >
            {t('notifications.markAllRead')}
          </button>
        )}
      </header>

      {items.length === 0 ? (
        <p className="text-center ui-empty py-16">
          {t('notifications.empty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => (
            <li
              key={n.id}
              className={`ui-card p-4 ${
                n.read ? 'opacity-75' : 'border-blue-100 dark:border-blue-900'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-bold ui-heading">{n.title}</p>
                  <p className="text-sm text-slate-600 dark:text-gray-300 mt-1">{n.body}</p>
                  <p className="text-xs ui-subtle mt-2">
                    {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                {!n.read && (
                  <button
                    type="button"
                    onClick={() => markRead(n.id)}
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 shrink-0"
                  >
                    ✓
                  </button>
                )}
              </div>
              {n.articleIds[0] && (
                <Link
                  href={`/article/${n.articleIds[0]}`}
                  onClick={() => markRead(n.id)}
                  className="inline-block mt-3 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {t('notifications.view')} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
