'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { TopicAccessGuard } from '@/components/TopicAccessGuard';
import { NewsGrid } from '@/components/NewsGrid';
import { t, tagLabel } from '@/lib/copy';
import type { NewsArticle } from '@/lib/data';
import type { ExploreTagCard } from '@/lib/explore-tags';

interface TopicExploreClientProps {
  meta: ExploreTagCard;
  articles: NewsArticle[];
}

export function TopicExploreClient({ meta, articles }: TopicExploreClientProps) {
  const label = tagLabel(meta.slug);

  return (
    <TopicAccessGuard meta={meta}>
      <main className="pt-24 pb-32 px-4 max-w-7xl mx-auto space-y-8 ui-page">
        <Link
          href="/"
          className="inline-flex items-center gap-2 ui-btn-ghost"
        >
          <ChevronLeft size={20} />
          <span className="font-semibold">{t('explore.backHome')}</span>
        </Link>

        <header>
          <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">{meta.labelEn}</p>
          <h1 className="text-4xl font-bold mb-2">{label}</h1>
          <p className="ui-muted">
            {t('explore.articleCount', { count: articles.length })} · {t('explore.crawlNote')}
          </p>
        </header>

        <NewsGrid
          articles={articles}
          emptyMessage={t('explore.topicEmpty', { tag: label })}
        />
      </main>
    </TopicAccessGuard>
  );
}
