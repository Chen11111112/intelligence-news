import type { NewsArticle } from '@/lib/types/data';

export function getSourceLabel(article: Pick<NewsArticle, 'sourceName' | 'sourceUrl'>): string {
  if (article.sourceName) return article.sourceName;
  const url = article.sourceUrl ?? '';
  if (url.includes('theconversation.com')) return 'The Conversation';
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'External Source';
  }
}

export function getArticleText(article: NewsArticle, bodyOverride?: string): string {
  const text = bodyOverride?.trim() || article.fullContentEn?.trim() || article.descriptionEn;
  return text;
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function formatPublishedAt(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date(iso));
  } catch {
    return null;
  }
}
