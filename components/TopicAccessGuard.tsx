'use client';

import Link from 'next/link';
import { ChevronLeft, Lock } from 'lucide-react';
import { t, tagLabel } from '@/lib/copy';
import { useUserSettings } from '@/hooks/useUserSettings';
import { getMaxTags } from '@/lib/user';
import type { ExploreTagCard } from '@/lib/explore-tags';

interface TopicAccessGuardProps {
  meta: ExploreTagCard;
  children: React.ReactNode;
}

export function TopicAccessGuard({ meta, children }: TopicAccessGuardProps) {
  const { settings, ready } = useUserSettings();

  if (!ready) {
    return <main className="pt-24 pb-32 px-4 text-center ui-muted">{t('common.loading')}</main>;
  }

  const allowed =
    settings?.tagPreferences.includes(meta.slug) ||
    (meta.topic ? settings?.topicPreferences.includes(meta.topic) : false);

  if (!allowed) {
    return (
      <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto text-center space-y-6">
        <Link href="/" className="inline-flex items-center gap-2 ui-btn-ghost">
          <ChevronLeft size={20} />
          {t('explore.backHome')}
        </Link>
        <LockedTopicCard tagName={tagLabel(meta.slug)} />
      </main>
    );
  }

  return <>{children}</>;
}

function LockedTopicCard({ tagName }: { tagName: string }) {
  const maxTags = getMaxTags();

  return (
    <div className="ui-card p-10">
      <Lock className="w-12 h-12 text-slate-300 dark:text-gray-600 mx-auto mb-4" />
      <h1 className="text-2xl font-bold ui-heading mb-2">
        {t('topic.locked', { tag: tagName })}
      </h1>
      <p className="ui-muted mb-6">
        {t('topic.lockedDesc', { tag: tagName, max: maxTags })}
      </p>
      <Link
        href="/profile"
        className="inline-block px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700"
      >
        {t('topic.manageTags')}
      </Link>
    </div>
  );
}
