import 'server-only';

import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { getNewsFromJson } from '@/lib/news/json';

const execFileAsync = promisify(execFile);

export type CrawlRunResult = {
  ok: boolean;
  articleCount: number;
  output: string;
};

export async function runCrawlScript(): Promise<CrawlRunResult> {
  const root = process.cwd();
  const script = path.join(root, 'scripts', 'crawl_news.py');
  const python = process.env.PYTHON_PATH?.trim() || 'python';

  const { stdout, stderr } = await execFileAsync(python, [script], {
    cwd: root,
    timeout: 5 * 60 * 1000,
    env: process.env,
    maxBuffer: 10 * 1024 * 1024,
  });

  const output = [stdout, stderr].filter(Boolean).join('\n').trim();
  const articles = await getNewsFromJson();

  return {
    ok: (articles?.length ?? 0) > 0,
    articleCount: articles?.length ?? 0,
    output,
  };
}
