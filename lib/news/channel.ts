import type { NewsArticle } from '@/lib/types/data';

export interface ChannelArticleItem {
  article: NewsArticle;
}

export interface ChannelChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OralCorrectionItem {
  original: string;
  suggestion: string;
  type: 'grammar' | 'pronunciation' | 'vocabulary' | 'fluency';
  explanation: string;
}

export interface ChannelOralResult {
  reply: string;
  correctedSentence: string;
  corrections: OralCorrectionItem[];
}

const ORAL_CORRECTION_TYPES = new Set<OralCorrectionItem['type']>([
  'grammar',
  'pronunciation',
  'vocabulary',
  'fluency',
]);

/** 過濾過度糾正：最多 2 項、忽略與原文相同的建議 */
export function filterOralCorrections(items: OralCorrectionItem[]): OralCorrectionItem[] {
  const seen = new Set<string>();
  return items
    .filter((item) => {
      if (!item?.original?.trim() || !item?.suggestion?.trim()) return false;
      const original = item.original.trim();
      const suggestion = item.suggestion.trim();
      if (original.toLowerCase() === suggestion.toLowerCase()) return false;
      const key = `${original.toLowerCase()}->${suggestion.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 2);
}

export function normalizeOralCorrectionItem(raw: unknown): OralCorrectionItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const original = String(r.original ?? r.wrong ?? '').trim();
  const suggestion = String(r.suggestion ?? r.correct ?? r.fix ?? '').trim();
  if (!original || !suggestion) return null;
  const typeRaw = String(r.type ?? 'grammar').toLowerCase();
  const type = ORAL_CORRECTION_TYPES.has(typeRaw as OralCorrectionItem['type'])
    ? (typeRaw as OralCorrectionItem['type'])
    : 'grammar';
  return {
    original,
    suggestion,
    type,
    explanation: String(r.explanation ?? r.note ?? '').trim(),
  };
}

export function filterBookmarkedArticles(
  articles: NewsArticle[],
  bookmarkIds: string[],
): ChannelArticleItem[] {
  const idSet = new Set(bookmarkIds);
  return articles
    .filter((a) => idSet.has(a.id))
    .sort((a, b) => bookmarkIds.indexOf(a.id) - bookmarkIds.indexOf(b.id))
    .map((article) => ({ article }));
}
