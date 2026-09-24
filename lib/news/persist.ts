import type { NewsArticle } from '@/lib/types/data';
import { hasMongoUri } from '@/lib/env/runtime';

const COLLECTION = 'news';

export async function saveNewsToDb(articles: NewsArticle[]): Promise<void> {
  if (!hasMongoUri()) return;

  const { default: clientPromise } = await import('@/lib/db');
  const client = await clientPromise;
  const col = client.db().collection<NewsArticle>(COLLECTION);

  await col.deleteMany({});
  if (articles.length > 0) {
    await col.insertMany(articles);
  }
}
