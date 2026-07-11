'use client';

import { useEffect, useState } from 'react';
import { ArticleImage } from '@/components/ArticleImage';
import Link from 'next/link';
import { MessageSquare, Bookmark, Loader2 } from 'lucide-react';
import { getNewsByIds } from '@/app/actions/news';
import { ArticleChatPanel } from '@/components/channel/ArticleChatPanel';
import { t } from '@/lib/copy';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { NewsArticle } from '@/lib/data';
import { getNewsByIdSync } from '@/lib/news-static';
import { cn } from '@/lib/utils';

export function ChannelClient() {
  const { settings, ready } = useUserSettings();
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<NewsArticle | null>(null);

  const bookmarkIds = settings?.bookmarks ?? [];
  const examType = settings?.examType ?? 'IELTS';
  const examScore = settings?.examScores[examType] ?? '7.5';

  useEffect(() => {
    if (!ready) return;

    if (bookmarkIds.length === 0) {
      setArticles([]);
      setSelected(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fromStatic = bookmarkIds
      .map((id) => getNewsByIdSync(id))
      .filter((article): article is NewsArticle => Boolean(article));

    if (fromStatic.length === bookmarkIds.length) {
      setArticles(fromStatic);
      setSelected((prev) => (prev && bookmarkIds.includes(prev.id) ? prev : null));
      setLoading(false);
      return;
    }

    getNewsByIds(bookmarkIds)
      .then((fetched) => {
        const list = fetched.length ? fetched : fromStatic;
        setArticles(list);
        setSelected((prev) => (prev && bookmarkIds.includes(prev.id) ? prev : null));
      })
      .catch(() => {
        setArticles(fromStatic);
        setSelected((prev) => (prev && bookmarkIds.includes(prev.id) ? prev : null));
      })
      .finally(() => setLoading(false));
  }, [ready, bookmarkIds.join(',')]);

  if (!ready) {
    return <div className="text-center ui-muted pt-24">{t('common.loading')}</div>;
  }

  const fallbackImage =
    'https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=400';

  return (
    <main className="pt-24 pb-32 px-4 max-w-7xl mx-auto ui-page">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('channel.title')}</h1>
        <p className="ui-muted text-sm max-w-2xl">{t('channel.subtitle')}</p>
      </header>

      {loading ? (
        <div className="flex justify-center py-16 text-slate-400 dark:text-gray-500">
          <Loader2 className="animate-spin" size={32} />
        </div>
      ) : articles.length === 0 ? (
        <div className="ui-empty p-12 text-center space-y-4">
          <Bookmark className="mx-auto text-slate-300 dark:text-gray-600" size={40} />
          <p className="text-slate-600 dark:text-gray-300">{t('channel.empty')}</p>
          <Link href="/" className="inline-block text-blue-600 dark:text-blue-400 font-semibold text-sm hover:underline">
            {t('channel.goExplore')}
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <section className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold text-slate-500 dark:text-gray-400 uppercase tracking-wide mb-2">
              {t('channel.pickArticle', { count: articles.length })}
            </p>
            {articles.map((article) => {
              const active = selected?.id === article.id;
              return (
                <button
                  key={article.id}
                  type="button"
                  onClick={() => setSelected(article)}
                  className={cn(
                    'w-full text-left flex gap-3 p-3 rounded-2xl border transition-all',
                    active
                      ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 shadow-sm'
                      : 'border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-200 dark:hover:border-blue-800',
                  )}
                >
                  <div className="relative w-20 h-20 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-gray-700">
                    <ArticleImage
                      src={article.imageUrl || fallbackImage}
                      alt={article.titleEn}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                      {t('channel.bookmarked')}
                    </span>
                    <h3 className="font-semibold text-sm ui-heading line-clamp-2 mt-0.5">
                      {article.titleEn}
                    </h3>
                    <p className="text-xs ui-muted mt-1 flex items-center gap-1">
                      <MessageSquare size={12} />
                      {t('channel.discuss')}
                    </p>
                  </div>
                </button>
              );
            })}
          </section>

          <section className="lg:col-span-7 lg:sticky lg:top-24 lg:self-start h-[min(70vh,640px)] max-h-[calc(100dvh-7rem)]">
            {selected ? (
              <ArticleChatPanel
                key={selected.id}
                article={selected}
                examType={examType}
                examScore={examScore}
                onClose={() => setSelected(null)}
              />
            ) : (
              <div className="ui-empty bg-white dark:bg-gray-800 p-12 text-center h-full flex items-center justify-center">
                {t('channel.selectPrompt')}
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
