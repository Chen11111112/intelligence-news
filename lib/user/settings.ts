import type { ExamTarget, Topic } from '@/lib/types/data';
import { DEFAULT_UI_LOCALE } from '@/lib/i18n/locale';
import { normalizeTopic } from '@/lib/tags/normalize';
import { TOPICS } from '@/lib/tags/topics';
import {
  getDefaultTagPreferences,
  parseTagPreferences,
  STORAGE_KEYS,
  tagSlugsToTopics,
  todayKey,
  type AIUsageRecord,
  type ExamScores,
  type UserSettings,
} from '@/lib/user/types';

const DEFAULT_EXAM_SCORES: ExamScores = {
  TOEIC: '850',
  IELTS: '7.5',
  TOEFL: '100',
};

export function parseTopicPreferences(raw: string | null): Topic[] {
  const tags = parseTagPreferences(
    typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEYS.tagPreferences) : null,
  );
  if (tags.length > 0) return tagSlugsToTopics(tags);

  if (!raw) return tagSlugsToTopics(getDefaultTagPreferences());
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return tagSlugsToTopics(getDefaultTagPreferences());
    const valid = new Set(TOPICS.map((t) => t.topic));
    return parsed
      .map((t) => (typeof t === 'string' ? normalizeTopic(t) : undefined))
      .filter((t): t is Topic => typeof t === 'string' && valid.has(t as Topic));
  } catch {
    return tagSlugsToTopics(getDefaultTagPreferences());
  }
}

export function parseBookmarks(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function parseAIUsage(raw: string | null): AIUsageRecord {
  const today = todayKey();
  if (!raw) return { date: today, articleIds: [] };
  try {
    const parsed = JSON.parse(raw) as AIUsageRecord;
    if (parsed.date !== today) return { date: today, articleIds: [] };
    return {
      date: today,
      articleIds: Array.isArray(parsed.articleIds) ? parsed.articleIds : [],
    };
  } catch {
    return { date: today, articleIds: [] };
  }
}

export function loadUserSettings(): UserSettings {
  if (typeof window === 'undefined') {
    const defaultTags = getDefaultTagPreferences();
    return {
      examType: 'IELTS',
      examScores: DEFAULT_EXAM_SCORES,
      topicPreferences: tagSlugsToTopics(defaultTags),
      tagPreferences: defaultTags,
      bookmarks: [],
      aiUsage: { date: todayKey(), articleIds: [] },
      uiLocale: DEFAULT_UI_LOCALE,
    };
  }

  const examType = (localStorage.getItem(STORAGE_KEYS.examType) as ExamTarget) || 'IELTS';
  let examScores = DEFAULT_EXAM_SCORES;
  const savedScores = localStorage.getItem(STORAGE_KEYS.examScores);
  if (savedScores) {
    try {
      examScores = { ...DEFAULT_EXAM_SCORES, ...JSON.parse(savedScores) };
    } catch {
      /* keep defaults */
    }
  }

  const tagRaw = localStorage.getItem(STORAGE_KEYS.tagPreferences);
  const tagPreferences = tagRaw
    ? parseTagPreferences(tagRaw)
    : (() => {
        const legacy = parseTopicPreferences(localStorage.getItem(STORAGE_KEYS.topicPreferences));
        return legacy.map((t) => TOPICS.find((x) => x.topic === t)?.slug).filter((s): s is string => !!s);
      })();

  return {
    examType: ['IELTS', 'TOEFL', 'TOEIC'].includes(examType) ? examType : 'IELTS',
    examScores,
    uiLocale: DEFAULT_UI_LOCALE,
    tagPreferences,
    topicPreferences: tagSlugsToTopics(tagPreferences),
    bookmarks: parseBookmarks(localStorage.getItem(STORAGE_KEYS.bookmarks)),
    aiUsage: parseAIUsage(localStorage.getItem(STORAGE_KEYS.aiUsage)),
  };
}

export function saveUserSettings(partial: Partial<UserSettings>): UserSettings {
  const current = loadUserSettings();
  const next = { ...current, ...partial, uiLocale: DEFAULT_UI_LOCALE };

  if (partial.tagPreferences) {
    next.tagPreferences = partial.tagPreferences;
    next.topicPreferences = tagSlugsToTopics(partial.tagPreferences);
  } else if (partial.topicPreferences) {
    next.topicPreferences = partial.topicPreferences;
    next.tagPreferences = partial.topicPreferences
      .map((t) => TOPICS.find((x) => x.topic === t)?.slug)
      .filter((s): s is string => !!s);
  }

  localStorage.setItem(STORAGE_KEYS.examType, next.examType);
  localStorage.setItem(STORAGE_KEYS.examScores, JSON.stringify(next.examScores));
  localStorage.setItem(STORAGE_KEYS.tagPreferences, JSON.stringify(next.tagPreferences));
  localStorage.setItem(STORAGE_KEYS.topicPreferences, JSON.stringify(next.topicPreferences));
  localStorage.setItem(STORAGE_KEYS.bookmarks, JSON.stringify(next.bookmarks));
  localStorage.setItem(STORAGE_KEYS.aiUsage, JSON.stringify(next.aiUsage));
  localStorage.setItem(STORAGE_KEYS.uiLocale, next.uiLocale);

  window.dispatchEvent(new Event('user-settings-updated'));
  return next;
}

export function recordAIUsage(articleId: string): AIUsageRecord {
  const usage = parseAIUsage(localStorage.getItem(STORAGE_KEYS.aiUsage));

  if (!usage.articleIds.includes(articleId)) {
    usage.articleIds.push(articleId);
  }

  saveUserSettings({ aiUsage: usage });
  return usage;
}

export function toggleBookmark(articleId: string): string[] {
  const settings = loadUserSettings();
  const bookmarks = settings.bookmarks.includes(articleId)
    ? settings.bookmarks.filter((id) => id !== articleId)
    : [...settings.bookmarks, articleId];
  saveUserSettings({ bookmarks });
  return bookmarks;
}

export function isBookmarked(articleId: string): boolean {
  return loadUserSettings().bookmarks.includes(articleId);
}
