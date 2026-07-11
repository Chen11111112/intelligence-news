import type { ExamTarget, QuizQuestion } from '@/lib/types/data';
import { normalizeQuizQuestion } from '@/lib/types/data';

export const AI_QUIZZES_STORAGE_KEY = 'user_ai_quizzes';

export interface AIQuizCacheEntry {
  questions: QuizQuestion[];
  examTarget: ExamTarget;
  examScore: string;
  articleTitleEn: string;
  updatedAt: string;
}

export type AIQuizzesCache = Record<string, AIQuizCacheEntry>;

function isValidEntry(value: unknown): value is AIQuizCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as AIQuizCacheEntry;
  return (
    Array.isArray(v.questions) &&
    v.questions.length > 0 &&
    typeof v.examTarget === 'string' &&
    typeof v.examScore === 'string' &&
    typeof v.articleTitleEn === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

export function loadAIQuizzesCache(): AIQuizzesCache {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(AI_QUIZZES_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: AIQuizzesCache = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (isValidEntry(entry)) {
        result[id] = {
          ...entry,
          questions: entry.questions.map((q) => normalizeQuizQuestion(q)),
        };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function getCachedAIQuiz(articleId: string): AIQuizCacheEntry | null {
  return loadAIQuizzesCache()[articleId] ?? null;
}

export function saveAIQuizToCache(articleId: string, entry: AIQuizCacheEntry): AIQuizzesCache {
  const cache = loadAIQuizzesCache();
  cache[articleId] = entry;
  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_QUIZZES_STORAGE_KEY, JSON.stringify(cache));
    window.dispatchEvent(new Event('ai-quizzes-updated'));
  }
  return cache;
}

export function mergeAIQuizzesFromCloud(cloud: AIQuizzesCache): AIQuizzesCache {
  const local = loadAIQuizzesCache();
  const merged = { ...local };

  for (const [id, entry] of Object.entries(cloud)) {
    if (!isValidEntry(entry)) continue;
    const existing = merged[id];
    if (!existing || new Date(entry.updatedAt) > new Date(existing.updatedAt)) {
      merged[id] = {
        ...entry,
        questions: entry.questions.map((q) => normalizeQuizQuestion(q)),
      };
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_QUIZZES_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('ai-quizzes-updated'));
  }

  return merged;
}
