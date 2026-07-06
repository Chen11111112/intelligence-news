import type { ExamTarget, Topic } from '@/lib/types/data';
import { getConversationTag } from '@/lib/tags/conversation';
import { articleMatchesSelectedTags } from '@/lib/tags/normalize';
import { TOPICS } from '@/lib/tags/topics';
import { isValidTagSlug } from '@/lib/tags/selectable';
import type { UILocale } from '@/lib/i18n/locale';

export const STORAGE_KEYS = {
  examType: 'user_exam_type',
  examScores: 'user_exam_scores',
  topicPreferences: 'user_topic_preferences',
  tagPreferences: 'user_tag_preferences',
  bookmarks: 'user_bookmarks',
  aiUsage: 'user_ai_usage',
  uiLocale: 'user_ui_locale',
} as const;

export const DAILY_AI_ARTICLES = 3;
export const MAX_TAGS = 4;

/** @deprecated 使用 MAX_TAGS */
export const FREE_MAX_TOPICS = MAX_TAGS;
/** @deprecated 使用 MAX_TAGS */
export const PRO_MAX_TOPICS = MAX_TAGS;

export interface ExamScores {
  TOEIC: string;
  IELTS: string;
  TOEFL: string;
}

export interface AIUsageRecord {
  date: string;
  articleIds: string[];
}

export interface UserSettings {
  examType: ExamTarget;
  examScores: ExamScores;
  uiLocale: UILocale;
  /** @deprecated 由 tagPreferences 衍生，保留相容 */
  topicPreferences: Topic[];
  tagPreferences: string[];
  bookmarks: string[];
  aiUsage: AIUsageRecord;
}

const DEFAULT_TAG_SLUGS = ['arts', 'business'];

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getMaxTags(): number {
  return MAX_TAGS;
}

/** @deprecated 使用 getMaxTags */
export function getMaxTopics(): number {
  return getMaxTags();
}

export function getDailyAILimit(): number {
  return DAILY_AI_ARTICLES;
}

export function getDefaultTagPreferences(): string[] {
  return [...DEFAULT_TAG_SLUGS];
}

/** @deprecated 使用 getDefaultTagPreferences */
export function getDefaultTopicPreferences(): Topic[] {
  return tagSlugsToTopics(getDefaultTagPreferences());
}

export function parseTagPreferences(raw: string | null): string[] {
  if (!raw) return getDefaultTagPreferences();
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return getDefaultTagPreferences();
    return parsed.filter((s): s is string => typeof s === 'string' && isValidTagSlug(s));
  } catch {
    return getDefaultTagPreferences();
  }
}

export function tagSlugsToTopics(slugs: string[]): Topic[] {
  return slugs
    .map((s) => getConversationTag(s)?.topic)
    .filter((t): t is Topic => t !== undefined);
}

export function canUseAI(articleId: string, usage: AIUsageRecord): {
  allowed: boolean;
  reason?: string;
  used: number;
  limit: number;
} {
  const limit = getDailyAILimit();
  const alreadyUsed = usage.articleIds.includes(articleId);

  if (alreadyUsed) {
    return { allowed: true, used: usage.articleIds.length, limit };
  }

  if (usage.articleIds.length >= limit) {
    return {
      allowed: false,
      reason: `每日僅能對 ${limit} 篇文章使用 AI（摘要與測驗合計）。請明日再試。`,
      used: usage.articleIds.length,
      limit,
    };
  }

  return { allowed: true, used: usage.articleIds.length, limit };
}

export function clampTagPreferences(tags: string[]): string[] {
  const max = getMaxTags();
  const filtered = tags.filter((t) => isValidTagSlug(t));
  return filtered.slice(0, max);
}

/** @deprecated 使用 clampTagPreferences */
export function clampTopicPreferences(topics: Topic[]): Topic[] {
  const slugs = topics
    .map((t) => TOPICS.find((x) => x.topic === t)?.slug)
    .filter((s): s is string => !!s);
  return tagSlugsToTopics(clampTagPreferences(slugs));
}

export function articleMatchesTags(
  article: { topic: Topic; tagSlugs?: string[] },
  selectedTags: string[],
): boolean {
  return articleMatchesSelectedTags(article, selectedTags);
}
