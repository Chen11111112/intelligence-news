import type { Topic } from '@/lib/types/data';
import { getTopicBySlug } from '@/lib/tags/topics';

export const TOPICS_LIST = [
  'Arts + Culture',
  'Business & Economy',
  'Education',
  'Environment & Energy',
  'Ethics & Religion',
  'Health',
  'Politics & Society',
  'Science & Tech',
  'World',
] as const satisfies readonly Topic[];

const LEGACY_TOPIC_ALIASES: Record<string, Topic> = {
  Economy: 'Business & Economy',
  Business: 'Business & Economy',
  Tech: 'Science & Tech',
  Environment: 'Environment & Energy',
  Fashion: 'Arts + Culture',
};

export function normalizeTopic(value: string | undefined | null): Topic | undefined {
  if (!value) return undefined;
  if (TOPICS_LIST.includes(value as Topic)) return value as Topic;
  return LEGACY_TOPIC_ALIASES[value];
}

export function articleBelongsToTagSlug(
  article: { topic: string; tagSlugs?: string[] },
  slug: string,
): boolean {
  const meta = getTopicBySlug(slug);
  const topic = normalizeTopic(article.topic);
  // 分類頁以主 topic 為準，避免跨 RSS 合併的次要 tagSlugs 造成誤分類
  if (meta && topic) return topic === meta.topic;
  return article.tagSlugs?.includes(slug) ?? false;
}

export function articleMatchesSelectedTags(
  article: { topic: string; tagSlugs?: string[] },
  selectedTags: string[],
): boolean {
  if (selectedTags.length === 0) return false;
  return selectedTags.some((slug) => articleBelongsToTagSlug(article, slug));
}
