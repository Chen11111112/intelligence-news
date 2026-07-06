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
