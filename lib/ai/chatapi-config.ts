import 'server-only';
import { createHash } from 'crypto';
import { readRuntimeEnv } from '@/lib/env/runtime';

/** NTUB LiteLLM（OpenAI 相容） */
export const CHATAPI_UPSTREAM_DEFAULT = 'https://chatapi.ntubimdbirc.tw/v1';
export const CHATAPI_MODEL_DEFAULT = 'Gemma4-31B';

export function getChatApiKey(): string {
  return (
    readRuntimeEnv('CHATAPI_API_KEY') ||
    readRuntimeEnv('AI_API_KEY') ||
    readRuntimeEnv('NVIDIA_API_KEY') ||
    readRuntimeEnv('NIM_API_KEY') ||
    ''
  );
}

export function getChatApiKeyFingerprint(): string | null {
  const key = getChatApiKey();
  if (!key) return null;
  return createHash('sha256').update(key, 'utf8').digest('hex').slice(0, 12);
}

export function getChatApiBaseUrl(): string {
  return (
    readRuntimeEnv('CHATAPI_BASE_URL') ||
    readRuntimeEnv('NVIDIA_NIM_BASE_URL') ||
    CHATAPI_UPSTREAM_DEFAULT
  ).replace(/\/+$/, '');
}

export function getChatApiModel(): string {
  return (
    readRuntimeEnv('CHATAPI_MODEL') ||
    readRuntimeEnv('NVIDIA_NIM_MODEL') ||
    CHATAPI_MODEL_DEFAULT
  );
}

/** 是否經中繼（非直連 NTUB ChatAPI） */
export function isChatApiRelayClient(): boolean {
  const base = getChatApiBaseUrl().replace(/\/+$/, '');
  const direct = CHATAPI_UPSTREAM_DEFAULT.replace(/\/+$/, '');
  return base !== direct;
}

export function assertChatApiKey(): void {
  if (!getChatApiKey()) {
    throw new Error('CHATAPI_API_KEY_MISSING');
  }
}
