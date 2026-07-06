import type { NewsArticle } from '@/lib/types/data';

const COLLECTION = 'news';

export async function saveNewsToDb(articles: NewsArticle[]): Promise<void> {
  if (!process.env.MONGODB_URI) return;

  const { default: clientPromise } = await import('@/lib/db');
  const client = await clientPromise;
  const col = client.db().collection<NewsArticle>(COLLECTION);

  await col.deleteMany({});
  if (articles.length > 0) {
    await col.insertMany(articles);
  }
}
