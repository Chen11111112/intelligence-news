import 'server-only';

import { TOPICS } from '@/lib/tags/topics';
import { getAllNews } from '@/lib/news/resolve';

export type NewsSnapshot = {
  ids: string[];
  count: number;
  byTag: Record<string, string[]>;
};

export async function getNewsSnapshot(): Promise<NewsSnapshot> {
  const articles = await getAllNews();
  const byTag: Record<string, string[]> = {};

  for (const article of articles) {
    byTag[article.id] = article.tagSlugs?.length
      ? [...new Set(article.tagSlugs)]
      : TOPICS.filter((t) => t.topic === article.topic).map((t) => t.slug);
  }

  return {
    ids: articles.map((a) => a.id),
    count: articles.length,
    byTag,
  };
}
