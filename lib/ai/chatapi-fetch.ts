import 'server-only';
import { getChatApiKey } from '@/lib/ai/chatapi-config';

/** Cloudflare 常擋 Node/undici 預設 UA；本機 curl 可過時可改為類 curl 的 UA */
export function getChatApiRequestHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const apiKey = getChatApiKey();
  return {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'User-Agent': 'curl/8.7.1 (news-app-server)',
    ...extra,
  };
}
