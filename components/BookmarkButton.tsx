'use client';

import { Bookmark } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toggleBookmark, isBookmarked, saveUserSettings } from '@/lib/user';
import { toggleBookmarkInDb } from '@/app/actions/user';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface BookmarkButtonProps {
  articleId: string;
  className?: string;
  size?: number;
}

export function BookmarkButton({ articleId, className, size = 20 }: BookmarkButtonProps) {
  const { status } = useSession();
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setSaved(isBookmarked(articleId));
    const onUpdate = () => setSaved(isBookmarked(articleId));
    window.addEventListener('user-settings-updated', onUpdate);
    return () => window.removeEventListener('user-settings-updated', onUpdate);
  }, [articleId]);

  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (pending) return;

    if (status === 'authenticated') {
      setPending(true);
      const result = await toggleBookmarkInDb(articleId);
      setPending(false);
      if (result.ok) {
        saveUserSettings({ bookmarks: result.bookmarks });
        setSaved(result.bookmarks.includes(articleId));
      }
      return;
    }

    toggleBookmark(articleId);
    setSaved(isBookmarked(articleId));
  };

  return (
    <button
      type="button"
      aria-label={saved ? '取消收藏' : '收藏文章'}
      disabled={pending}
      onClick={(e) => void handleClick(e)}
      className={cn(
        'p-2 rounded-xl transition-colors active:scale-95',
        saved
          ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-950/70'
          : 'text-slate-400 dark:text-gray-500 hover:text-amber-500 hover:bg-slate-50 dark:hover:bg-gray-700',
        pending && 'opacity-60',
        className,
      )}
    >
      <Bookmark size={size} className={saved ? 'fill-current' : ''} />
    </button>
  );
}
