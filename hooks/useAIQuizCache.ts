'use client';

import { useCallback, useEffect, useState } from 'react';
import { loadAIQuizzesFromDb, persistAIQuizToDb } from '@/app/actions/user';
import {
  getCachedAIQuiz,
  mergeAIQuizzesFromCloud,
  saveAIQuizToCache,
  type AIQuizCacheEntry,
} from '@/lib/ai/quizzes';
import type { ExamTarget, QuizQuestion } from '@/lib/data';

export function useAIQuizCache(articleId: string, isLoggedIn: boolean) {
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
    loadAIQuizzesFromDb()
      .then((cloud) => {
        if (cancelled) return;
        if (Object.keys(cloud).length > 0) {
          mergeAIQuizzesFromCloud(cloud);
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
    window.addEventListener('ai-quizzes-updated', onUpdate);
    return () => window.removeEventListener('ai-quizzes-updated', onUpdate);
  }, [refresh]);

  const getCached = useCallback(() => getCachedAIQuiz(articleId), [articleId]);

  const saveQuiz = useCallback(
    async (
      questions: QuizQuestion[],
      examTarget: ExamTarget,
      examScore: string,
      articleTitleEn: string,
    ) => {
      const entry: AIQuizCacheEntry = {
        questions,
        examTarget,
        examScore,
        articleTitleEn,
        updatedAt: new Date().toISOString(),
      };
      saveAIQuizToCache(articleId, entry);
      await persistAIQuizToDb(articleId, entry);
      return entry;
    },
    [articleId],
  );

  return { loaded, getCached, saveQuiz };
}
