import feeds from '@/data/conversation-feeds.json';
import type { Topic } from '@/lib/types/data';

export interface ConversationTag {
  slug: string;
  label: string;
  zh: string;
  topic: Topic;
  feedUrl: string;
  image: string;
}

export const CONVERSATION_TAGS: ConversationTag[] = feeds.tags as ConversationTag[];

export const CONVERSATION_TAG_BY_SLUG = new Map(
  CONVERSATION_TAGS.map((tag) => [tag.slug, tag]),
);

export const DEFAULT_CRAWL_SLUGS: string[] = feeds.defaultSlugs;

export function getConversationTag(slug: string): ConversationTag | undefined {
  return CONVERSATION_TAG_BY_SLUG.get(slug);
}

export function isConversationTagSlug(slug: string): boolean {
  return CONVERSATION_TAG_BY_SLUG.has(slug);
}
