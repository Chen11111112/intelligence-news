'use client';

import Link from 'next/link';
import { Tag } from 'lucide-react';
import { t, tagLabel } from '@/lib/copy';
import { getSelectableTag } from '@/lib/tags';
import { cn } from '@/lib/utils';

interface SelectedTagsChipsProps {
  tagSlugs: string[];
  className?: string;
  showEditLink?: boolean;
  emptyMessage?: string;
}

export function SelectedTagsChips({
  tagSlugs,
  className,
  showEditLink = false,
  emptyMessage,
}: SelectedTagsChipsProps) {
  const empty = emptyMessage ?? t('explore.noTags');

  if (tagSlugs.length === 0) {
    return <p className={cn('text-sm ui-muted', className)}>{empty}</p>;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-gray-400 uppercase tracking-wide">
        <Tag size={14} className="text-blue-500 dark:text-blue-400" />
        <span>{t('explore.selectedTags')}</span>
        {showEditLink && (
          <Link href="/profile" className="ml-auto normal-case text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold">
            {t('explore.adjust')}
          </Link>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tagSlugs.map((slug) => {
          const meta = getSelectableTag(slug);
          if (!meta) return null;
          return (
            <span
              key={slug}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border',
                meta.isCore
                  ? 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950/50 dark:border-blue-800 dark:text-blue-300'
                  : 'bg-violet-50 border-violet-200 text-violet-800 dark:bg-violet-950/50 dark:border-violet-800 dark:text-violet-300',
              )}
            >
              <span className="opacity-70">{meta.en}</span>
              <span>{tagLabel(slug)}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
