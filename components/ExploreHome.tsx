'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { ExploreTopics } from '@/components/ExploreTopics';
import { NewsGrid } from '@/components/NewsGrid';
import { SelectedTagsChips } from '@/components/SelectedTagsChips';
import { t } from '@/lib/copy';
import { useUserSettings } from '@/hooks/useUserSettings';
import type { NewsArticle } from '@/lib/data';
import { buildExploreTagCards } from '@/lib/explore-tags';
import { articleMatchesTags } from '@/lib/user';
import { Settings } from 'lucide-react';

interface ExploreHomeProps {
  allArticles: NewsArticle[];
}

export function ExploreHome({ allArticles }: ExploreHomeProps) {
  const { settings, ready } = useUserSettings();

  const selectedTags = settings?.tagPreferences ?? [];

  const tagCards = useMemo(() => {
    if (!ready || selectedTags.length === 0) return [];
    return buildExploreTagCards(selectedTags);
  }, [ready, selectedTags]);

  const filteredNews = useMemo(() => {
    if (!ready || !settings || selectedTags.length === 0) return [];
    return allArticles.filter((a) => articleMatchesTags(a, selectedTags));
  }, [allArticles, ready, settings, selectedTags]);

  return (
    <main className="pt-24 pb-32 px-4 max-w-7xl mx-auto space-y-12 ui-page">
      <section>
        <h2 className="text-3xl font-bold mb-4">{t('explore.topicsTitle')}</h2>
        {/* <SelectedTagsChips
          tagSlugs={selectedTags}
          showEditLink
          className="mb-6 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm"
        /> */}
        {tagCards.length > 0 ? (
          <ExploreTopics tags={tagCards} />
        ) : (
          <div className="ui-empty p-10 text-center">
            <p className="text-slate-600 dark:text-gray-300 mb-4">{t('explore.noTags')}</p>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700"
            >
              <Settings size={16} />
              {t('explore.goProfile')}
            </Link>
          </div>
        )}
      </section>

      <section>
        <h2 className="text-3xl font-bold mb-6">{t('explore.latestTitle')}</h2>
        <NewsGrid articles={filteredNews.slice(0, 12)} emptyMessage={t('explore.emptyNews')} />
      </section>
    </main>
  );
}
