# ChatAPI Worker 中繼（給 Vercel 用）

## 症狀

- 本機：`curl` 打 `https://chatapi-relay.hychen.space/v1/models` → **JSON 200**
- Vercel：`runtime-check` → **403**，`bodyPreview` 含 **Just a moment…**
- `relayClient: true`、`keyLength: 9` → **金鑰與 BASE_URL 已對**，是 **Cloudflare 擋 Vercel 出口**，不是 sk- 問題

WAF **Skip** + Configuration rule 仍可能無效（Free 方案常見）。請依序做 **C** 或 **D**。

---

## 1. Worker 程式與 Secret

- 程式：`worker.js`
- Worker Secret：`CHATAPI_API_KEY`（sk-）、`RELAY_SECRET`（與 Vercel `CHATAPI_API_KEY` / `CRAWL_API_SECRET` 相同）

## 2. 自訂網域

Workers & Pages → Worker → **Domains & Routes** → `chatapi-relay.hychen.space`

## 3. WAF Skip（建議保留）

Security → WAF → Custom rules：Hostname = `chatapi-relay.hychen.space` → **Skip**（Bot 相關全勾）

---

## C. Page Rule（Free 常比 Configuration 有效）

1. **Rules** → **Page Rules** → **Create Page Rule**
2. URL：`chatapi-relay.hychen.space/*`
3. 新增設定：
   - **Security Level** → **Essentially Off**
   - **Browser Integrity Check** → **Off**（若有）
4. **Save and Deploy**（Page Rule 放最上面優先）

再 Redeploy Vercel，測 runtime-check。

---

## D. Zero Trust Service Token（WAF / Page Rule 仍 403 時，建議）

讓 **Vercel 用 Service Token 通過 Cloudflare Access**，略過瀏覽器/機器人挑戰。

### D1. 建立 Service Token

1. 開啟 [Cloudflare Zero Trust](https://one.dash.cloudflare.com/)
2. **Access** → **Service auth** → **Service Tokens** → **Create Service Token**
3. 取名例如 `vercel-chatapi-relay`，建立後複製 **Client ID**、**Client Secret**（只顯示一次）

### D2. 保護子網域

1. **Access** → **Applications** → **Add an application** → **Self-hosted**
2. **Application domain**：`chatapi-relay.hychen.space`（Subdomain 整站）
3. **Policies** → Add policy：
   - **Action**：Allow
   - **Include**：**Service Token** → 選剛建立的 token
   - （不要加「Everyone」，避免公開）
4. Save

### D3. Vercel 環境變數

| 變數 | 值 |
|------|-----|
| `CHATAPI_BASE_URL` | `https://chatapi-relay.hychen.space/v1` |
| `CHATAPI_API_KEY` | `<RELAY_SECRET>` |
| `CHATAPI_CF_ACCESS_CLIENT_ID` | Service Token Client ID |
| `CHATAPI_CF_ACCESS_CLIENT_SECRET` | Service Token Client Secret |

Redeploy 後 `runtime-check` 應出現 `cfAccessServiceToken: true`。

### D4. 本機 curl 自測（需三個 header）

```powershell
curl.exe -s -H "Authorization: Bearer <RELAY_SECRET>" -H "CF-Access-Client-Id: <ID>" -H "CF-Access-Client-Secret: <SECRET>" "https://chatapi-relay.hychen.space/v1/models"
```

---

## 5. 成功條件

`runtime-check`：`ok: true`，`chatCompletions.ok: true`，無 HTML「Just a moment…」。
