import { NextRequest, NextResponse } from 'next/server';
import {
  CHATAPI_UPSTREAM_DEFAULT,
  getChatApiKey,
} from '@/lib/ai/chatapi-config';
import { readRuntimeEnv } from '@/lib/env/runtime';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

function relayAuthorized(request: NextRequest): boolean {
  const expected = readRuntimeEnv('CRAWL_API_SECRET');
  if (!expected) return false;
  const auth = request.headers.get('authorization');
  return auth === `Bearer ${expected}`;
}

async function forwardToChatApi(
  request: NextRequest,
  pathSegments: string[],
): Promise<Response> {
  if (!relayAuthorized(request)) {
    return NextResponse.json({ error: '未授權' }, { status: 401 });
  }

  const apiKey = getChatApiKey();
  if (!apiKey) {
    return NextResponse.json({ error: 'CHATAPI_API_KEY_MISSING' }, { status: 500 });
  }

  const upstream = (
    readRuntimeEnv('CHATAPI_UPSTREAM_URL') ?? CHATAPI_UPSTREAM_DEFAULT
  ).replace(/\/+$/, '');
  const path = pathSegments.join('/');
  const url = path ? `${upstream}/${path}` : upstream;
  const target = `${url}${request.nextUrl.search}`;

  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };
  const contentType = request.headers.get('content-type');
  if (contentType) headers['Content-Type'] = contentType;

  const init: RequestInit = {
    method: request.method,
    headers,
    signal: AbortSignal.timeout(115_000),
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = await request.text();
  }

  const upstreamRes = await fetch(target, init);
  return new Response(upstreamRes.body, {
    status: upstreamRes.status,
    headers: {
      'Content-Type': upstreamRes.headers.get('content-type') ?? 'application/json',
    },
  });
}

type RouteCtx = { params: Promise<{ path?: string[] }> };

async function handle(request: NextRequest, ctx: RouteCtx) {
  const { path = [] } = await ctx.params;
  return forwardToChatApi(request, path);
}

export async function GET(request: NextRequest, ctx: RouteCtx) {
  return handle(request, ctx);
}

export async function POST(request: NextRequest, ctx: RouteCtx) {
  return handle(request, ctx);
}
