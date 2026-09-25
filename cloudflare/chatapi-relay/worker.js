/**
 * Cloudflare Worker：轉發 OpenAI 相容請求至 NTUB ChatAPI。
 *
 * Dashboard → Settings → Variables：
 *   CHATAPI_API_KEY  (Secret)  sk- 金鑰
 *   RELAY_SECRET     (Secret)  與 Vercel 的 CRAWL_API_SECRET / CHATAPI_API_KEY 相同
 *   CHATAPI_UPSTREAM (可選)    預設 https://chatapi.ntubimdbirc.tw/v1
 *
 * Vercel：
 *   CHATAPI_BASE_URL=https://<your-worker>.workers.dev/v1
 *   CHATAPI_API_KEY=<RELAY_SECRET>
 */
const DEFAULT_UPSTREAM = 'https://chatapi.ntubimdbirc.tw/v1';

export default {
  /** @param {Request} request @param {{ CHATAPI_API_KEY?: string; RELAY_SECRET?: string; CHATAPI_UPSTREAM?: string }} env */
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({
        ok: true,
        service: 'chatapi-relay',
        paths: ['/v1/models', '/v1/chat/completions'],
      });
    }

    if (!url.pathname.startsWith('/v1/')) {
      return new Response('Not found', { status: 404 });
    }

    const relaySecret = env.RELAY_SECRET;
    const apiKey = env.CHATAPI_API_KEY;
    if (!relaySecret || !apiKey) {
      return Response.json({ error: 'Worker 未設定 RELAY_SECRET 或 CHATAPI_API_KEY' }, { status: 500 });
    }

    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${relaySecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const upstream = (env.CHATAPI_UPSTREAM || DEFAULT_UPSTREAM).replace(/\/+$/, '');
    const suffix = url.pathname.slice('/v1'.length);
    const target = `${upstream}${suffix}${url.search}`;

    const headers = new Headers();
    headers.set('Authorization', `Bearer ${apiKey}`);
    const contentType = request.headers.get('Content-Type');
    if (contentType) headers.set('Content-Type', contentType);

    /** @type {RequestInit} */
    const init = {
      method: request.method,
      headers,
    };
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      init.body = request.body;
    }

    const upstreamRes = await fetch(target, init);
    const outHeaders = new Headers();
    const outCt = upstreamRes.headers.get('Content-Type');
    if (outCt) outHeaders.set('Content-Type', outCt);

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: outHeaders,
    });
  },
};
