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
    if (
      baseUrl?.includes('workers.dev') ||
      baseUrl?.includes('chatapi-relay.')
    ) {
      return '本機 curl 正常但 Vercel 仍 403：Cloudflare 擋資料中心流量。請做 Page Rule（Security Essentially Off）或 Zero Trust Service Token，並在 Vercel 設 CHATAPI_CF_ACCESS_CLIENT_*。見 cloudflare/chatapi-relay/SETUP.md';
    }
    return 'Cloudflare 機器人驗證（Just a moment…）擋住 Vercel 直連 ChatAPI；請用中繼或自訂 Worker 網域';
  }
  if (status === 403) {
    return 'ChatAPI 回傳 403，可能為來源限制或 WAF';
  }
  return null;
}
