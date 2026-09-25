# Vercel 連 ChatAPI：不用 Cloudflare Zero Trust 的做法

若 `chatapi-relay.hychen.space` 在本機 curl 正常、Vercel 永遠 403「Just a moment…」，代表 **Cloudflare 在子網域入口擋 Vercel**，再改 WAF / Access 常很折騰。

**改走：本機小中繼 + ngrok（或灰雲 DNS 指到家裡）**，Vercel 只打 ngrok / 直連 IP，不經 `chatapi-relay.hychen.space` 的 CF 代理。

## 步驟

### 1. 本機啟動中繼

專案根目錄（已有所需 `.env.local` / `.env.production`）：

```powershell
node scripts/chatapi-standalone-relay.mjs
```

自測：

```powershell
curl.exe -s -H "Authorization: Bearer <CRAWL_API_SECRET>" "http://127.0.0.1:8787/v1/models"
```

### 2. 用 ngrok 暴露（需 [ngrok](https://ngrok.com/) 帳號）

另開終端：

```powershell
ngrok http 8787
```

記下 **HTTPS** 網址，例如 `https://abcd-123.ngrok-free.app`（不要結尾斜線）。

### 3. Vercel Production

| 變數 | 值 |
|------|-----|
| `CHATAPI_BASE_URL` | `https://abcd-123.ngrok-free.app/v1` |
| `CHATAPI_API_KEY` | `<CRAWL_API_SECRET>` |

**刪除或留空**（若曾設）：`CHATAPI_CF_ACCESS_CLIENT_ID`、`CHATAPI_CF_ACCESS_CLIENT_SECRET`（ngrok 不需要）。

Redeploy → 再測 `runtime-check` 與生成摘要。

### 4. 注意

- 電腦關機或 ngrok 重啟後，免費 ngrok 網址可能變，要更新 Vercel 並 Redeploy。
- 長期可改：固定網域的 VPS、或 DNS **僅 DNS（灰雲）** A 記錄指到家裡 + 路由器 port forward 8787（不經 Cloudflare 橘雲）。

Worker `chatapi-relay.hychen.space` 可保留給本機開發；**Vercel 改用 ngrok / 灰雲 URL 即可**。
