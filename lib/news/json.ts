import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';
import type { NewsArticle } from '@/lib/types/data';

const NEWS_JSON = path.join(process.cwd(), 'data', 'news.json');

export async function getNewsFromJson(): Promise<NewsArticle[] | null> {
  try {
    const raw = await fs.readFile(NEWS_JSON, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed as NewsArticle[];
  } catch {
    return null;
  }
}
