import type { NewsArticle } from '@/lib/types/data';
import { NEWS_DATA } from '@/lib/types/data';
import crawledNews from '@/data/news.json';

function buildStaticArticles(): NewsArticle[] {
  const byId = new Map<string, NewsArticle>();
  for (const article of NEWS_DATA) {
    byId.set(article.id, article);
  }
  for (const article of crawledNews as NewsArticle[]) {
    byId.set(article.id, article);
  }
  return Array.from(byId.values());
}

export const staticArticles = buildStaticArticles();

export function getNewsByIdSync(id: string): NewsArticle | undefined {
  return staticArticles.find((article) => article.id === id);
}
