import { revalidatePath } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { runCrawlScript } from '@/lib/crawl/run';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

function readSecret(request: NextRequest): string | null {
  const header = request.headers.get('authorization');
  if (header?.startsWith('Bearer ')) {
    return header.slice('Bearer '.length).trim();
  }
  return request.nextUrl.searchParams.get('secret')?.trim() ?? null;
}

async function handleCrawl(request: NextRequest) {
  const expected = process.env.CRAWL_API_SECRET?.trim();
  if (!expected) {
    return NextResponse.json(
      { ok: false, error: 'CRAWL_API_SECRET 未設定' },
      { status: 503 },
    );
  }

  const provided = readSecret(request);
  if (!provided || provided !== expected) {
    return NextResponse.json({ ok: false, error: '未授權，請提供正確的 CRAWL_API_SECRET' }, { status: 401 });
  }

  try {
    const result = await runCrawlScript();

    revalidatePath('/');
    revalidatePath('/explore', 'layout');

    return NextResponse.json({
      ok: result.ok,
      articleCount: result.articleCount,
      crawledAt: new Date().toISOString(),
      output: result.output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : '爬蟲執行失敗';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  return handleCrawl(request);
}

export async function GET(request: NextRequest) {
  return handleCrawl(request);
}
