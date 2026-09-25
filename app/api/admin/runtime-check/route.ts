import { NextRequest, NextResponse } from 'next/server';
import {
  getChatApiBaseUrl,
  getChatApiKey,
  getChatApiKeyFingerprint,
  getChatApiModel,
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
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
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

  const base: Omit<ProbeResult, 'ok' | 'status' | 'bodyPreview'> = {
    keyLength,
    keyFingerprint,
    baseUrl,
    model,
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

  return NextResponse.json({
    ok: aiOk,
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    env,
    mongoPing: mongoOk,
    chatApi,
    hint:
      chatApi.chatCompletions.status === 401
        ? '401：請確認 CHATAPI_API_KEY'
        : chatApi.chatCompletions.status === 403
          ? 'ChatAPI 回傳 403'
          : null,
  });
}
