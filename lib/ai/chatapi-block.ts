/** ChatAPI 前端的 Cloudflare 會擋無瀏覽器特徵的 server-side fetch（如 Vercel） */
export function isCloudflareChallengeBody(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('just a moment') ||
    lower.includes('cf-browser-verification') ||
    lower.includes('challenge-platform') ||
    lower.includes('/cdn-cgi/challenge-platform')
  );
}

export function describeChatApiBlock(
  status: number,
  bodyPreview: string,
  baseUrl?: string,
): string | null {
  if (status === 403 && isCloudflareChallengeBody(bodyPreview)) {
    if (baseUrl?.includes('workers.dev')) {
      return 'Vercel 無法通過 Cloudflare 對 *.workers.dev 的機器人驗證（本機 curl 仍可能成功）。請替 Worker 綁自訂網域（例如 chatapi-relay.hychen.space），Vercel 的 CHATAPI_BASE_URL 改為 https://該網域/v1，並在 Cloudflare 對該 hostname 略過 Bot Fight。見 cloudflare/chatapi-relay/SETUP.md';
    }
    return 'Cloudflare 機器人驗證（Just a moment…）擋住 Vercel 直連 ChatAPI；請用中繼或自訂 Worker 網域';
  }
  if (status === 403) {
    return 'ChatAPI 回傳 403，可能為來源限制或 WAF';
  }
  return null;
}
