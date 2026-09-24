import 'server-only';

import type { NewsArticle } from '@/lib/types/data';
import clientPromise from '@/lib/db';
import { hasMongoUri } from '@/lib/env/runtime';
import { saveNewsToDb as persistNews } from '@/lib/news/persist';

export { persistNews as saveNewsToDb };

const COLLECTION = 'news';

export async function getNewsFromDb(): Promise<NewsArticle[] | null> {
  if (!hasMongoUri()) return null;

  try {
    const client = await clientPromise;
    const docs = await client
      .db()
      .collection<NewsArticle>(COLLECTION)
      .find({})
      .sort({ publishedAt: -1 })
      .toArray();

    if (docs.length === 0) return null;

    return docs.map((doc) => {
      const { _id: _unused, ...article } = doc as NewsArticle & { _id?: unknown };
      void _unused;
      return article;
    });
  } catch {
    return null;
  }
}
