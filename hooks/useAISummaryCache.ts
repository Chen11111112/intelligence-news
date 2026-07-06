'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadAISummariesFromDb, persistAISummaryToDb } from '@/app/actions/user';
import {
  getCachedAISummary,
  mergeAISummariesFromCloud,
  saveAISummaryToCache,
  type AISummaryCacheEntry,
} from '@/lib/ai-summaries';
import type { AISummary, ExamTarget } from '@/lib/data';

export function useAISummaryCache(articleId: string, isLoggedIn: boolean) {
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn) {
      setLoaded(true);
      return;
    }

    let cancelled = false;
    loadAISummariesFromDb()
      .then((cloud) => {
        if (cancelled) return;
        if (Object.keys(cloud).length > 0) {
          mergeAISummariesFromCloud(cloud);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn]);

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener('ai-summaries-updated', onUpdate);
    return () => window.removeEventListener('ai-summaries-updated', onUpdate);
  }, [refresh]);

  const getCached = useCallback(() => getCachedAISummary(articleId), [articleId]);

  const saveSummary = useCallback(
    async (
      summary: AISummary,
      examTarget: ExamTarget,
      articleTitleEn: string,
      articleTitleZh: string,
    ) => {
      const entry: AISummaryCacheEntry = {
        summary,
        examTarget,
        articleTitleEn,
        articleTitleZh,
        updatedAt: new Date().toISOString(),
      };
      saveAISummaryToCache(articleId, entry);
      await persistAISummaryToDb(articleId, entry);
      return entry;
    },
    [articleId],
  );

  return { loaded, getCached, saveSummary };
}
