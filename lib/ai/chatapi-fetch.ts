import 'server-only';
import { getChatApiKey } from '@/lib/ai/chatapi-config';
import { readRuntimeEnv } from '@/lib/env/runtime';

export function hasCloudflareAccessServiceToken(): boolean {
  return (
    !!readRuntimeEnv('CHATAPI_CF_ACCESS_CLIENT_ID') &&
    !!readRuntimeEnv('CHATAPI_CF_ACCESS_CLIENT_SECRET')
  );
}

/** Cloudflare 常擋 Node/undici 預設 UA；Vercel 打 CF 子網域常需 Access Service Token */
export function getChatApiRequestHeaders(
  extra?: Record<string, string>,
): Record<string, string> {
  const apiKey = getChatApiKey();
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    Accept: 'application/json',
    'User-Agent': 'curl/8.7.1 (news-app-server)',
    ...extra,
  };

  const cfId = readRuntimeEnv('CHATAPI_CF_ACCESS_CLIENT_ID');
  const cfSecret = readRuntimeEnv('CHATAPI_CF_ACCESS_CLIENT_SECRET');
  if (cfId && cfSecret) {
    headers['CF-Access-Client-Id'] = cfId;
    headers['CF-Access-Client-Secret'] = cfSecret;
  }

  return headers;
}
