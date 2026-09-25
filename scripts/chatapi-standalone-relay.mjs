/**
 * 本機中繼（避開 Vercel → Cloudflare 子網域 403）
 *
 * .env.local 或環境變數：
 *   CHATAPI_API_KEY=sk-...
 *   CRAWL_API_SECRET=...   （Vercel 的 CHATAPI_API_KEY 用同一值）
 *   CHATAPI_UPSTREAM=https://chatapi.ntubimdbirc.tw/v1  （可省略）
 *   RELAY_PORT=8787  （可省略）
 *
 * 啟動：node scripts/chatapi-standalone-relay.mjs
 * 對外：ngrok http 8787  → Vercel CHATAPI_BASE_URL=https://<ngrok>/v1
 */
import { createServer } from 'node:http';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    let val = t.slice(i + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] == null || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env.production');

const PORT = Number(process.env.RELAY_PORT || 8787);
const RELAY_SECRET = process.env.CRAWL_API_SECRET || process.env.RELAY_SECRET;
const API_KEY = process.env.CHATAPI_API_KEY;
const UPSTREAM = (process.env.CHATAPI_UPSTREAM || 'https://chatapi.ntubimdbirc.tw/v1').replace(
  /\/+$/,
  '',
);

if (!RELAY_SECRET || !API_KEY) {
  console.error('需要 CHATAPI_API_KEY 與 CRAWL_API_SECRET（或 RELAY_SECRET）');
  process.exit(1);
}

function readBody(req) {
  return new Promise((resolveBody, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolveBody(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url || '/', `http://127.0.0.1:${PORT}`);

    if (url.pathname === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, service: 'chatapi-standalone-relay' }));
      return;
    }

    if (!url.pathname.startsWith('/v1/')) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    const auth = req.headers.authorization;
    if (auth !== `Bearer ${RELAY_SECRET}`) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }

    const suffix = url.pathname.slice('/v1'.length);
    const target = `${UPSTREAM}${suffix}${url.search}`;

    const headers = { Authorization: `Bearer ${API_KEY}` };
    const ct = req.headers['content-type'];
    if (ct) headers['Content-Type'] = ct;

    const init = { method: req.method, headers };
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      init.body = await readBody(req);
    }

    const upstream = await fetch(target, init);
    const body = Buffer.from(await upstream.arrayBuffer());
    const outCt = upstream.headers.get('content-type');
    res.writeHead(upstream.status, outCt ? { 'Content-Type': outCt } : {});
    res.end(body);
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: String(err) }));
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Relay listening http://127.0.0.1:${PORT}`);
  console.log('Test: curl -H "Authorization: Bearer <CRAWL_API_SECRET>" http://127.0.0.1:' + PORT + '/v1/models');
  console.log('Then expose with ngrok: ngrok http ' + PORT);
});
