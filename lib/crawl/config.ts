import 'server-only';

import { promises as fs } from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'crawl-config.json');

export async function persistCrawlTags(tags: string[]): Promise<void> {
  const payload = {
    tags,
    updatedAt: new Date().toISOString(),
  };

  await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
  await fs.writeFile(CONFIG_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8');
}
