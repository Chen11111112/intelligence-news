const CJK = /[\u4e00-\u9fff\u3400-\u4dbf\uf900-\ufaff]/;

function extractMessage(error: unknown): string {
  if (error instanceof Error) {
    const parts = [error.message];
    if (error.cause instanceof Error) parts.push(error.cause.message);
    return parts.filter(Boolean).join(' ');
  }
  return String(error);
}

/** 將 AI / ChatAPI 相關錯誤轉為使用者可讀的繁體中文 */
export function getAIErrorMessage(error: unknown, fallback: string): string {
  const message = extractMessage(error);

  if (
    message === 'CHATAPI_API_KEY_MISSING' ||
    message === 'NVIDIA_API_KEY_MISSING'
  ) {
    return '請在環境變數中設定 CHATAPI_API_KEY';
  }

  if (message === 'MONGODB_URI_MISSING') {
    return '伺服器未設定 MONGODB_URI，無法使用 AI 功能';
  }

  if (CJK.test(message)) {
    return message;
  }

  const lower = message.toLowerCase();

  if (
    lower.includes('429') ||
    lower.includes('resource_exhausted') ||
    lower.includes('quota') ||
    lower.includes('rate limit')
  ) {
    return 'API 配額已用盡，請稍後再試或升級方案';
  }

  if (
    lower.includes('api key') ||
    lower.includes('api_key') ||
    lower.includes('invalid api key') ||
    (lower.includes('invalid') && lower.includes('key'))
  ) {
    return 'AI API 金鑰無效或未設定，請聯繫管理員';
  }

  if (lower.includes('chatapi 403') || (lower.includes('chatapi') && lower.includes('403'))) {
    return 'ChatAPI 拒絕此伺服器來源（403）。Vercel 常無法直連 NTUB ChatAPI，請改設 CHATAPI_BASE_URL 為可直連的中繼網址（見 .env.example），中繼上保留真正的 sk- 金鑰。';
  }

  if (lower.includes('chatapi 401')) {
    return 'ChatAPI 401：若使用中繼，Vercel 的 CHATAPI_API_KEY 應為 CRAWL_API_SECRET；直連時須與本機 sk- 金鑰一致。請用 runtime-check 比對 keyFingerprint。';
  }

  if (
    lower.includes('unauthenticated') ||
    lower.includes('permission_denied')
  ) {
    return 'AI 服務驗證失敗，請稍後再試';
  }

  if (
    lower.includes('chatapi') ||
    lower.includes('nvidia nim') ||
    lower.includes('nvapi') ||
    lower.includes('integrate.api.nvidia.com') ||
    lower.includes('chatapi.ntubimdbirc.tw')
  ) {
    return 'AI 服務暫時無法使用，請稍後再試';
  }

  if (lower.includes('403') || lower.includes('forbidden')) {
    return '無權使用 AI 服務，請確認 API 或中繼設定';
  }

  if (lower.includes('404') || lower.includes('not found') || lower.includes('model')) {
    return 'AI 模型無法使用，請稍後再試';
  }

  if (
    lower.includes('timeout') ||
    lower.includes('deadline') ||
    lower.includes('timed out') ||
    lower.includes('504') ||
    lower.includes('gateway timeout')
  ) {
    return 'AI 回應逾時。請稍後再試，並確認 Nginx proxy_read_timeout 至少 300 秒。';
  }

  if (
    lower.includes('network') ||
    lower.includes('fetch failed') ||
    lower.includes('econnreset') ||
    lower.includes('enotfound') ||
    lower.includes('socket')
  ) {
    return '網路連線異常，請檢查連線後再試';
  }

  if (
    lower.includes('json') ||
    lower.includes('unexpected token') ||
    lower.includes('syntaxerror') ||
    lower.includes('parse')
  ) {
    return 'AI 回傳格式異常，請再試一次';
  }

  if (
    lower.includes('500') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('504') ||
    lower.includes('internal') ||
    lower.includes('unavailable') ||
    lower.includes('service unavailable')
  ) {
    return 'AI 服務暫時無法使用，請稍後再試';
  }

  if (lower.includes('text is required') || lower.includes('content is required')) {
    return '請提供文章內容';
  }

  if (lower.includes('safety') || lower.includes('blocked')) {
    return '內容無法處理，請換一篇文章再試';
  }

  return fallback;
}

export function toUserFacingAIError(error: unknown, fallback: string): Error {
  return new Error(getAIErrorMessage(error, fallback));
}
