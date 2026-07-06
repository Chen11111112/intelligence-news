export type UILocale = 'zh-TW';

export const DEFAULT_UI_LOCALE: UILocale = 'zh-TW';

export function parseUILocale(_value?: string | null): UILocale {
  return 'zh-TW';
}

export function getLocaleAIName(): string {
  return 'Traditional Chinese';
}

export function getLocaleAIInstructions(): string {
  return 'Write all non-English learner fields in Traditional Chinese.';
}
