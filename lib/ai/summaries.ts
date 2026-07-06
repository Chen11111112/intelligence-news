import type { AISummary, ExamTarget } from '@/lib/types/data';
import { normalizeAISummary } from '@/lib/types/data';

export const AI_SUMMARIES_STORAGE_KEY = 'user_ai_summaries';

export interface AISummaryCacheEntry {
  summary: AISummary;
  examTarget: ExamTarget;
  articleTitleEn: string;
  articleTitleZh: string;
  updatedAt: string;
}

export type AISummariesCache = Record<string, AISummaryCacheEntry>;

function isValidEntry(value: unknown): value is AISummaryCacheEntry {
  if (!value || typeof value !== 'object') return false;
  const v = value as AISummaryCacheEntry;
  const summary = v.summary as AISummary;
  return (
    typeof summary?.summary_en === 'string' &&
    (typeof summary?.summary_local === 'string' || typeof summary?.summary_zh === 'string') &&
    typeof v.examTarget === 'string' &&
    typeof v.articleTitleEn === 'string' &&
    typeof v.updatedAt === 'string'
  );
}

export function loadAISummariesCache(): AISummariesCache {
  if (typeof window === 'undefined') return {};
  const raw = localStorage.getItem(AI_SUMMARIES_STORAGE_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const result: AISummariesCache = {};
    for (const [id, entry] of Object.entries(parsed)) {
      if (isValidEntry(entry)) {
        result[id] = { ...entry, summary: normalizeAISummary(entry.summary) };
      }
    }
    return result;
  } catch {
    return {};
  }
}

export function getCachedAISummary(articleId: string): AISummaryCacheEntry | null {
  return loadAISummariesCache()[articleId] ?? null;
}

export function saveAISummaryToCache(articleId: string, entry: AISummaryCacheEntry): AISummariesCache {
  const cache = loadAISummariesCache();
  cache[articleId] = entry;
  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_SUMMARIES_STORAGE_KEY, JSON.stringify(cache));
    window.dispatchEvent(new Event('ai-summaries-updated'));
  }
  return cache;
}

export function mergeAISummariesFromCloud(cloud: AISummariesCache): AISummariesCache {
  const local = loadAISummariesCache();
  const merged = { ...local };

  for (const [id, entry] of Object.entries(cloud)) {
    if (!isValidEntry(entry)) continue;
    const existing = merged[id];
    if (!existing || new Date(entry.updatedAt) > new Date(existing.updatedAt)) {
      merged[id] = entry;
    }
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(AI_SUMMARIES_STORAGE_KEY, JSON.stringify(merged));
    window.dispatchEvent(new Event('ai-summaries-updated'));
  }

  return merged;
}
