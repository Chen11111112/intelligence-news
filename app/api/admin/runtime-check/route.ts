import { NextRequest, NextResponse } from 'next/server';
import { describeChatApiBlock } from '@/lib/ai/chatapi-block';
import {
  getChatApiRequestHeaders,
  hasCloudflareAccessServiceToken,
} from '@/lib/ai/chatapi-fetch';
import {
  getChatApiBaseUrl,
  getChatApiKey,
  getChatApiKeyFingerprint,
  getChatApiModel,
  isChatApiRelayClient,
} from '@/lib/ai/chatapi-config';
import { getRuntimeEnvPresence } from '@/lib/env/runtime';
import { pingMongo } from '@/lib/db';
import { readRuntimeEnv } from '@/lib/env/runtime';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type ProbeResult = {
  ok: boolean;
  status: number;
  keyLength: number;
  keyFingerprint: string | null;
  baseUrl: string;
  model: string;
  relayClient: boolean;
  bodyPreview?: string;
};

async function probePath(
  method: 'GET' | 'POST',
  path: string,
  postBody?: Record<string, unknown>,
): Promise<Pick<ProbeResult, 'ok' | 'status' | 'bodyPreview'>> {
  const apiKey = getChatApiKey();
  const baseUrl = getChatApiBaseUrl();
  if (!apiKey) {
    return { ok: false, status: 0 };
  }

  try {
    const init: RequestInit = {
      method,
      headers: getChatApiRequestHeaders(
        method === 'POST' ? { 'Content-Type': 'application/json' } : {},
      ),
      signal: AbortSignal.timeout(12_000),
    };
    if (postBody) init.body = JSON.stringify(postBody);

    const response = await fetch(`${baseUrl}/${path}`, init);
    const text = await response.text().catch(() => '');
    return {
      ok: response.ok,
      status: response.status,
      bodyPreview: text.slice(0, 280),
    };
  } catch {
    return { ok: false, status: -1 };
  }
}

async function probeChatApi(): Promise<{
  models: ProbeResult;
  chatCompletions: ProbeResult;
}> {
  const apiKey = getChatApiKey();
  const baseUrl = getChatApiBaseUrl();
  const model = getChatApiModel();
  const keyLength = apiKey.length;
  const keyFingerprint = getChatApiKeyFingerprint();
  const relayClient = isChatApiRelayClient();

  const base: Omit<ProbeResult, 'ok' | 'status' | 'bodyPreview'> = {
    keyLength,
    keyFingerprint,
    baseUrl,
    model,
    relayClient,
  };

  if (!apiKey) {
    const empty = { ...base, ok: false, status: 0 };
    return { models: empty, chatCompletions: empty };
  }

  const modelsProbe = await probePath('GET', 'models');
  const chatProbe = await probePath('POST', 'chat/completions', {
    model,
    messages: [{ role: 'user', content: 'ping' }],
    max_tokens: 3,
  });

  return {
    models: { ...base, ...modelsProbe },
    chatCompletions: { ...base, ...chatProbe },
  };
}

function authorized(request: NextRequest): boolean {
  const expected = readRuntimeEnv('CRAWL_API_SECRET');
  if (!expected) return false;
  const header = request.headers.get('authorization');
  const token = header?.startsWith('Bearer ')
    ? header.slice('Bearer '.length).trim()
    : request.nextUrl.searchParams.get('secret')?.trim();
  return token === expected;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ ok: false, error: '未授權' }, { status: 401 });
  }

  const env = getRuntimeEnvPresence();
  const mongoOk = env.MONGODB_URI ? await pingMongo() : false;
  const chatApi = await probeChatApi();
  const aiOk =
    env.CHATAPI_API_KEY &&
    chatApi.chatCompletions.ok &&
    env.MONGODB_URI &&
    mongoOk;

  const cfAccess = hasCloudflareAccessServiceToken();
  const cloudflareBlocked =
    describeChatApiBlock(
      chatApi.chatCompletions.status,
      chatApi.chatCompletions.bodyPreview ?? '',
      chatApi.chatCompletions.baseUrl,
    )?.includes('Cloudflare') ?? false;

  const nextSteps: string[] | null =
    cloudflareBlocked && process.env.VERCEL
      ? cfAccess
        ? [
            '已設定 CF Access 仍 403：確認 Zero Trust Application 網域為 chatapi-relay.hychen.space、Policy 只 Allow 該 Service Token',
            'Security → Bots 暫時關 Bot Fight 測試是否為唯一原因',
          ]
        : [
            'Zero Trust → Service auth → 建立 Service Token',
            'Access → Applications → Self-hosted → chatapi-relay.hychen.space → Policy Allow 該 Token',
            'Vercel 新增 CHATAPI_CF_ACCESS_CLIENT_ID、CHATAPI_CF_ACCESS_CLIENT_SECRET 後 Redeploy',
          ]
      : null;

  return NextResponse.json({
    ok: aiOk,
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    cfAccessServiceToken: cfAccess,
    nextSteps,
    env,
    mongoPing: mongoOk,
    chatApi,
    hint:
      describeChatApiBlock(
        chatApi.chatCompletions.status,
        chatApi.chatCompletions.bodyPreview ?? '',
        chatApi.chatCompletions.baseUrl,
      ) ??
      (chatApi.chatCompletions.status === 401
        ? '401 且 keyLength 正確時，常為 Vercel 上的 key 與本機 fingerprint 不同'
        : null),
    cloudflareBlocked,
  });
}
