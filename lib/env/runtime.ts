import 'server-only';

/** 部署後每次 request 讀取，並清理常見貼上錯誤（引號、CR） */
export function readRuntimeEnv(name: string): string | undefined {
  const raw = process.env[name];
  if (raw == null || raw === '') return undefined;

  let value = raw.replace(/\r/g, '').trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1).trim();
  }
  return value || undefined;
}

export function hasMongoUri(): boolean {
  return !!readRuntimeEnv('MONGODB_URI');
}

export const DEPLOY_ENV_KEYS = [
  'AUTH_URL',
  'AUTH_SECRET',
  'AUTH_GOOGLE_ID',
  'AUTH_GOOGLE_SECRET',
  'MONGODB_URI',
  'CHATAPI_API_KEY',
  'CHATAPI_BASE_URL',
  'CHATAPI_MODEL',
] as const;

export function getRuntimeEnvPresence(): Record<string, boolean> {
  const present: Record<string, boolean> = {};
  for (const key of DEPLOY_ENV_KEYS) {
    present[key] = !!readRuntimeEnv(key);
  }
  return present;
}

export function assertDeployEnvForAI(): void {
  if (!readRuntimeEnv('CHATAPI_API_KEY')) {
    throw new Error('CHATAPI_API_KEY_MISSING');
  }
  if (!readRuntimeEnv('MONGODB_URI')) {
    throw new Error('MONGODB_URI_MISSING');
  }
}
