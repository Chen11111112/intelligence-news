const PRODUCTION_AUTH_URL = 'https://intelligence-news.ntubimdbirc.tw';

function normalizeAuthUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return undefined;
  try {
    const parsed = new URL(trimmed);
    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function getAuthUrl(): string | undefined {
  const raw =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.NODE_ENV === 'production' ? PRODUCTION_AUTH_URL : 'http://localhost:3002');

  return normalizeAuthUrl(raw);
}

export function getGoogleRedirectUri(): string | undefined {
  const authUrl = getAuthUrl();
  return authUrl ? `${authUrl}/api/auth/callback/google` : undefined;
}

export function ensureAuthEnv(): void {
  const authUrl = getAuthUrl();
  if (!authUrl) return;

  process.env.AUTH_URL = authUrl;
  process.env.NEXTAUTH_URL = authUrl;
}
