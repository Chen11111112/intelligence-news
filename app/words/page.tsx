'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { NewsGrid } from '@/components/NewsGrid';
import { t } from '@/lib/copy';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getNewsByIds } from '@/app/actions/news';
import { getNewsByIdSync } from '@/lib/news-static';
import type { NewsArticle } from '@/lib/data';

export default function WordsPage() {
  const { settings, ready } = useUserSettings();
  const [bookmarkedArticles, setBookmarkedArticles] = useState<NewsArticle[]>([]);

  useEffect(() => {
    if (!ready || !settings?.bookmarks.length) {
      setBookmarkedArticles([]);
      return;
    }

    const ids = settings.bookmarks;
    const fromStatic = ids
      .map((id) => getNewsByIdSync(id))
      .filter((article): article is NewsArticle => Boolean(article));

    if (fromStatic.length === ids.length) {
      setBookmarkedArticles(fromStatic);
      return;
    }

    getNewsByIds(ids)
      .then((articles) => setBookmarkedArticles(articles.length ? articles : fromStatic))
      .catch(() => setBookmarkedArticles(fromStatic));
  }, [ready, settings?.bookmarks]);

  return (
    <main className="pt-24 pb-32 px-4 max-w-7xl mx-auto space-y-8 ui-page">
      <header>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">{t('words.title')}</h1>
        </div>
        <p className="ui-muted text-sm">
          {t('words.subtitle', { count: bookmarkedArticles.length })}
        </p>
      </header>

      <NewsGrid articles={bookmarkedArticles} emptyMessage={t('words.empty')} />

      {bookmarkedArticles.length === 0 && (
        <div className="text-center">
          <Link href="/" className="text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline">
            {t('words.goExplore')}
          </Link>
        </div>
      )}
    </main>
  );
}
