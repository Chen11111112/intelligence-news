import type { Topic } from '@/lib/types/data';
import { CONVERSATION_TAGS, getConversationTag } from '@/lib/tags/conversation';

export interface TopicMeta {
  slug: string;
  topic: Topic;
  label: string;
  zh: string;
}

/** The Conversation 各專欄（與爬蟲標籤一致） */
export const TOPICS: TopicMeta[] = CONVERSATION_TAGS.map((tag) => ({
  slug: tag.slug,
  topic: tag.topic,
  label: tag.label,
  zh: tag.zh,
}));

export function getTopicBySlug(slug: string): TopicMeta | undefined {
  const tag = getConversationTag(slug);
  if (!tag) return undefined;
  return { slug: tag.slug, topic: tag.topic, label: tag.label, zh: tag.zh };
}

export function getTopicSlug(topic: Topic): string {
  return TOPICS.find((t) => t.topic === topic)?.slug ?? topic.toLowerCase().replace(/\s+/g, '-');
}
