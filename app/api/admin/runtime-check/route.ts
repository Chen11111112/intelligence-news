import { NextRequest, NextResponse } from 'next/server';
import { getRuntimeEnvPresence, readRuntimeEnv } from '@/lib/env/runtime';
import { pingMongo } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function probeChatApi(): Promise<{
  ok: boolean;
  status: number;
  keyLength: number;
  baseUrl: string;
  model: string;
}> {
  const apiKey = readRuntimeEnv('CHATAPI_API_KEY');
  const baseUrl = (
    readRuntimeEnv('CHATAPI_BASE_URL') ?? 'https://chatapi.ntubimdbirc.tw/v1'
  ).replace(/\/+$/, '');
  const model = readRuntimeEnv('CHATAPI_MODEL') ?? 'Gemma4-31B';
  if (!apiKey) {
    return { ok: false, status: 0, keyLength: 0, baseUrl, model };
  }

  try {
    const response = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(8_000),
    });
    return {
      ok: response.ok,
      status: response.status,
      keyLength: apiKey.length,
      baseUrl,
      model,
    };
  } catch {
    return { ok: false, status: -1, keyLength: apiKey.length, baseUrl, model };
  }
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

  return NextResponse.json({
    ok: env.CHATAPI_API_KEY && chatApi.ok && env.MONGODB_URI && mongoOk,
    vercel: !!process.env.VERCEL,
    vercelEnv: process.env.VERCEL_ENV ?? null,
    env,
    mongoPing: mongoOk,
    chatApi,
    localReferenceKeyLength: 25,
  });
}
