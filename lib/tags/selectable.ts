import { CONVERSATION_TAGS } from '@/lib/tags/conversation';

export interface SelectableTag {
  slug: string;
  en: string;
  zh: string;
  isCore: boolean;
}

export const ALL_SELECTABLE_TAGS: SelectableTag[] = CONVERSATION_TAGS.map((tag) => ({
  slug: tag.slug,
  en: tag.label,
  zh: tag.zh,
  isCore: true,
}));

export function getSelectableTag(slug: string): SelectableTag | undefined {
  return ALL_SELECTABLE_TAGS.find((t) => t.slug === slug);
}

export function isValidTagSlug(slug: string): boolean {
  return ALL_SELECTABLE_TAGS.some((t) => t.slug === slug);
}
