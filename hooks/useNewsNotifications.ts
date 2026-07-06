'use client';

import { useEffect, useRef } from 'react';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getNewsSnapshot } from '@/app/actions/news';
import { t } from '@/lib/copy';
import {
  addCrawlNotifications,
  loadKnownArticleIds,
  saveKnownArticleIds,
} from '@/lib/notifications';

export function useNewsNotifications() {
  const { settings, ready } = useUserSettings();
  const initialized = useRef(false);

  useEffect(() => {
    if (!ready) return;

    let cancelled = false;

    async function check() {
      try {
        const data = await getNewsSnapshot();
        if (cancelled) return;
        const known = loadKnownArticleIds();
        const currentIds = data.ids ?? [];

        if (!initialized.current) {
          initialized.current = true;
          if (known.size === 0) {
            saveKnownArticleIds(currentIds);
            return;
          }
        }

        const selectedTags = settings?.tagPreferences ?? [];
        const newIds = currentIds.filter((id) => !known.has(id));
        if (newIds.length > 0 && known.size > 0) {
          const relevant = selectedTags.length
            ? newIds.filter((id) => {
                const tags = data.byTag[id];
                if (!tags?.length) return true;
                return tags.some((tag) => selectedTags.includes(tag));
              })
            : newIds;

          if (relevant.length > 0) {
            addCrawlNotifications(
              relevant,
              t('notifications.newArticle'),
              t('notifications.newArticles', { count: relevant.length }),
            );
          }
        }

        saveKnownArticleIds(currentIds);
      } catch {
        /* ignore */
      }
    }

    check();
    const interval = setInterval(check, 5 * 60 * 1000);
    const onFocus = () => check();
    window.addEventListener('focus', onFocus);

    return () => {
      cancelled = true;
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [ready, settings?.tagPreferences]);
}
