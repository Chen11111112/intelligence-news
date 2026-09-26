'use server';

import { auth } from '@/app/auth';
import type { ExamTarget, Topic } from '@/lib/types/data';
import { persistCrawlTags } from '@/lib/crawl/config';
import { isValidTagSlug } from '@/lib/tags/selectable';
import type { AISummaryCacheEntry, AISummariesCache } from '@/lib/ai/summaries';
import type { AIQuizCacheEntry, AIQuizzesCache } from '@/lib/ai/quizzes';
import type { AIUsageRecord, ExamScores } from '@/lib/user/types';
import { clampTagPreferences, tagSlugsToTopics } from '@/lib/user/types';
import {
  getUserProfileFromDb,
  saveUserProfileToDb,
  loadBookmarksFromDb as loadBookmarksFromDbCore,
  saveBookmarksToDb as saveBookmarksToDbCore,
  toggleBookmarkInDb as toggleBookmarkInDbCore,
  recordAIUsageInDb as recordAIUsageInDbCore,
  loadAIUsageFromDb as loadAIUsageFromDbCore,
  loadAISummariesFromDb as loadAISummariesFromDbCore,
  persistAISummaryToDb as persistAISummaryToDbCore,
  loadAIQuizzesFromDb as loadAIQuizzesFromDbCore,
  persistAIQuizToDb as persistAIQuizToDbCore,
  type UserProfileDocument,
} from '@/lib/user/profile-db';

export type ProfilePayload = {
  examType: ExamTarget;
  examScores: ExamScores;
  topicPreferences: Topic[];
  tagPreferences: string[];
  bookmarks: string[];
  aiUsage: AIUsageRecord;
};

export async function syncCrawlPreferences(tags: string[]): Promise<{ ok: boolean; tags: string[] }> {
  const filtered = tags.filter((t) => isValidTagSlug(t));
  if (filtered.length === 0) {
    return { ok: false, tags: [] };
  }

  await persistCrawlTags(filtered);

  return { ok: true, tags: filtered };
}

export async function loadUserProfile(): Promise<UserProfileDocument | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  try {
    return await getUserProfileFromDb(session.user.id, session.user.email);
  } catch (error) {
    console.error('[loadUserProfile]', error);
    throw new Error('無法從資料庫載入個人設定，請確認 MONGODB_URI 與網路連線。');
  }
}

export async function persistUserProfile(
  payload: ProfilePayload,
): Promise<{ ok: true; profile: UserProfileDocument } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: '請先登入後再儲存設定。' };
  }

  const tagPreferences = clampTagPreferences(payload.tagPreferences);
  const topics = tagSlugsToTopics(tagPreferences);
  if (tagPreferences.length === 0) {
    return { ok: false, error: '請至少選擇一個新聞標籤。' };
  }

  try {
    const profile = await saveUserProfileToDb(
      session.user.id,
      {
        examType: payload.examType,
        examScores: payload.examScores,
        tagPreferences,
        topicPreferences: topics,
        bookmarks: payload.bookmarks,
        aiUsage: payload.aiUsage,
      },
      session.user.email,
    );
    return { ok: true, profile };
  } catch (error) {
    console.error('[persistUserProfile]', error);
    return { ok: false, error: '無法寫入 MongoDB，請稍後再試。' };
  }
}

export async function loadBookmarksFromDb(): Promise<string[] | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return loadBookmarksFromDbCore(session.user.id);
}

export async function saveBookmarksToDb(
  bookmarks: string[],
): Promise<{ ok: true; bookmarks: string[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: '請先登入' };
  }
  return saveBookmarksToDbCore(session.user.id, bookmarks);
}

export async function toggleBookmarkInDb(
  articleId: string,
): Promise<{ ok: true; bookmarks: string[] } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, error: '請先登入' };
  }
  return toggleBookmarkInDbCore(session.user.id, articleId);
}

export async function recordAIUsageInDb(articleId: string): Promise<AIUsageRecord | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return recordAIUsageInDbCore(session.user.id, articleId);
}

export async function loadAIUsageFromDb(): Promise<AIUsageRecord | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return loadAIUsageFromDbCore(session.user.id);
}

export async function loadAISummariesFromDb(): Promise<AISummariesCache> {
  const session = await auth();
  if (!session?.user?.id) return {};
  return loadAISummariesFromDbCore(session.user.id);
}

export async function persistAISummaryToDb(
  articleId: string,
  entry: AISummaryCacheEntry,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: true };
  }
  return persistAISummaryToDbCore(session.user.id, articleId, entry);
}

export async function loadAIQuizzesFromDb(): Promise<AIQuizzesCache> {
  const session = await auth();
  if (!session?.user?.id) return {};
  return loadAIQuizzesFromDbCore(session.user.id);
}

export async function persistAIQuizToDb(
  articleId: string,
  entry: AIQuizCacheEntry,
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: true };
  }
  return persistAIQuizToDbCore(session.user.id, articleId, entry);
}
