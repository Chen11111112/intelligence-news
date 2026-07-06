'use server';

import type { NewsArticle } from '@/lib/types/data';
import { getNewsByIds as getNewsByIdsCore } from '@/lib/news/resolve';
import { getNewsSnapshot as getNewsSnapshotCore, type NewsSnapshot } from '@/lib/news/snapshot';

export async function getNewsSnapshot(): Promise<NewsSnapshot> {
  return getNewsSnapshotCore();
}

export async function getNewsByIds(ids: string[]): Promise<NewsArticle[]> {
  return getNewsByIdsCore(ids);
}
