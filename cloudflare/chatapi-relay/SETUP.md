# ChatAPI Worker 中繼（給 Vercel 用）

## 為什麼不能用 `*.workers.dev` 給 Vercel？

本機 `curl` 打 `https://xxx.workers.dev/v1/models` 常是 **200**，但 **Vercel 伺服器**打同一網址會拿到 **403 + HTML「Just a moment…」**——那是 Cloudflare 對資料中心 IP 的機器人驗證，不是金鑰錯誤。

`runtime-check` 若 `keyLength: 9`、`baseUrl` 已是 Worker，仍 403 HTML → 請改 **自訂網域**。

## 步驟

### 1. Worker 程式與 Secret

- 程式：`worker.js`
- Secret：`CHATAPI_API_KEY`（sk-）、`RELAY_SECRET`（與 Vercel `CRAWL_API_SECRET` / `CHATAPI_API_KEY` 相同）

### 2. 綁自訂網域（同一 Cloudflare 帳號、已有 zone 例如 `hychen.space`）

1. **Workers & Pages** → 你的 Worker → **Settings** → **Domains & Routes**
2. **Add** → **Custom Domain**，例如：`chatapi-relay.hychen.space`
3. 依畫面完成 DNS（通常自動加 CNAME）

### 3. 略過 Bot Fight（重要，常需兩條規則）

**A. WAF Custom rule**（Security → WAF → Custom rules）

- **If**：`(http.host eq "chatapi-relay.hychen.space")`
- **Then**：**Skip** → 把所有可勾的 Bot / Browser Integrity 項目全勾

若 Vercel 仍 403、本機 curl 正常，再加 **B**：

**B. Configuration rule**（Rules → Configuration rules → Create）

- **If**：Hostname equals `chatapi-relay.hychen.space`
- **Then**：
  - **Security Level** → **Essentially Off**
  - **Browser Integrity Check** → **Off**（若有）

部署 Next.js 後會帶 `User-Agent: curl/...` 打中繼（與本機 curl 較一致）。

### 4. 自測

```powershell
curl.exe -s "https://chatapi-relay.hychen.space/health"
curl.exe -s -H "Authorization: Bearer <RELAY_SECRET>" "https://chatapi-relay.hychen.space/v1/models"
```

### 5. Vercel Production

| 變數 | 值 |
|------|-----|
| `CHATAPI_BASE_URL` | `https://chatapi-relay.hychen.space/v1` |
| `CHATAPI_API_KEY` | `<RELAY_SECRET>` |

Redeploy 後再開 `runtime-check`，預期 `relayClient: true`、`chatCompletions.ok: true`。
