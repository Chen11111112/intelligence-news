import type { ExamTarget, Topic } from '@/lib/types/data';
import clientPromise from '@/lib/db';
import type { AISummariesCache, AISummaryCacheEntry } from '@/lib/ai/summaries';
import type { AIQuizzesCache, AIQuizCacheEntry } from '@/lib/ai/quizzes';
import { DEFAULT_UI_LOCALE, type UILocale } from '@/lib/i18n/locale';
import type { AIUsageRecord, ExamScores } from '@/lib/user/types';
import { getDefaultTagPreferences, tagSlugsToTopics, todayKey, clampTagPreferences } from '@/lib/user/types';

export interface UserProfileDocument {
  userId: string;
  email?: string | null;
  examType: ExamTarget;
  examScores: ExamScores;
  uiLocale: UILocale;
  topicPreferences: Topic[];
  tagPreferences: string[];
  bookmarks: string[];
  aiUsage: AIUsageRecord;
  aiSummaries?: AISummariesCache;
  aiQuizzes?: AIQuizzesCache;
  updatedAt: Date;
}

const COLLECTION = 'user_profiles';

const DEFAULT_PROFILE = (userId: string, email?: string | null): UserProfileDocument => ({
  userId,
  email,
  examType: 'IELTS',
  examScores: { TOEIC: '850', IELTS: '7.5', TOEFL: '100' },
  uiLocale: DEFAULT_UI_LOCALE,
  tagPreferences: getDefaultTagPreferences(),
  topicPreferences: tagSlugsToTopics(getDefaultTagPreferences()),
  bookmarks: [],
  aiUsage: { date: todayKey(), articleIds: [] },
  updatedAt: new Date(),
});

export async function getUserProfileFromDb(
  userId: string,
  email?: string | null,
): Promise<UserProfileDocument> {
  if (!process.env.MONGODB_URI) {
    return DEFAULT_PROFILE(userId, email);
  }

  let client;
  try {
    client = await clientPromise;
  } catch {
    return DEFAULT_PROFILE(userId, email);
  }

  const db = client.db();
  const existing = await db.collection<UserProfileDocument>(COLLECTION).findOne({ userId });

  if (existing) {
    const usage =
      existing.aiUsage?.date === todayKey()
        ? existing.aiUsage
        : { date: todayKey(), articleIds: [] };

    const tagPreferences = clampTagPreferences(
      existing.tagPreferences?.length
        ? existing.tagPreferences
        : existing.topicPreferences?.length
          ? existing.topicPreferences
              .map((t) =>
                ({
                  'Arts + Culture': 'arts',
                  'Business & Economy': 'business',
                  Economy: 'business',
                  Education: 'education',
                  'Environment & Energy': 'environment',
                  'Ethics & Religion': 'ethics',
                  Health: 'health',
                  'Politics & Society': 'politics',
                  'Science & Tech': 'technology',
                  World: 'world',
                  Tech: 'technology',
                  Business: 'business',
                  Environment: 'environment',
                  Fashion: 'arts',
                } as Record<string, string | undefined>)[t],
              )
              .filter((s): s is string => !!s)
          : getDefaultTagPreferences(),
    );

    const { plan: _plan, ...rest } = existing as UserProfileDocument & { plan?: string };

    return {
      ...DEFAULT_PROFILE(userId, email),
      ...rest,
      tagPreferences,
      topicPreferences: tagSlugsToTopics(tagPreferences),
      uiLocale: DEFAULT_UI_LOCALE,
      aiUsage: usage,
    };
  }

  const created = DEFAULT_PROFILE(userId, email);
  await db.collection(COLLECTION).insertOne(created);
  return created;
}

export async function saveUserProfileToDb(
  userId: string,
  data: Omit<UserProfileDocument, 'userId' | 'updatedAt' | 'email'>,
  email?: string | null,
): Promise<UserProfileDocument> {
  const doc: UserProfileDocument = {
    userId,
    email,
    ...data,
    updatedAt: new Date(),
  };

  if (!process.env.MONGODB_URI) {
    return doc;
  }

  let client;
  try {
    client = await clientPromise;
  } catch {
    return doc;
  }

  const db = client.db();
  await db.collection(COLLECTION).updateOne(
    { userId },
    { $set: doc, $unset: { plan: '' } },
    { upsert: true },
  );

  return doc;
}

export async function loadBookmarksFromDb(userId: string): Promise<string[] | null> {
  if (!process.env.MONGODB_URI) return [];

  try {
    const client = await clientPromise;
    const doc = await client.db().collection(COLLECTION).findOne(
      { userId },
      { projection: { bookmarks: 1 } },
    );
    return Array.isArray(doc?.bookmarks)
      ? doc.bookmarks.filter((id): id is string => typeof id === 'string')
      : [];
  } catch (error) {
    console.error('[loadBookmarksFromDb]', error);
    return null;
  }
}

export async function saveBookmarksToDb(
  userId: string,
  bookmarks: string[],
): Promise<{ ok: true; bookmarks: string[] } | { ok: false; error: string }> {
  if (!process.env.MONGODB_URI) {
    return { ok: false, error: '資料庫未設定' };
  }

  try {
    const client = await clientPromise;
    await client.db().collection(COLLECTION).updateOne(
      { userId },
      { $set: { bookmarks, updatedAt: new Date() } },
      { upsert: true },
    );
    return { ok: true, bookmarks };
  } catch (error) {
    console.error('[saveBookmarksToDb]', error);
    return { ok: false, error: '無法儲存收藏' };
  }
}

export async function toggleBookmarkInDb(
  userId: string,
  articleId: string,
): Promise<{ ok: true; bookmarks: string[] } | { ok: false; error: string }> {
  if (!process.env.MONGODB_URI) {
    return { ok: false, error: '資料庫未設定' };
  }

  try {
    const client = await clientPromise;
    const col = client.db().collection(COLLECTION);
    const doc = await col.findOne({ userId }, { projection: { bookmarks: 1 } });
    const current = Array.isArray(doc?.bookmarks)
      ? doc.bookmarks.filter((id): id is string => typeof id === 'string')
      : [];

    const bookmarks = current.includes(articleId)
      ? current.filter((id) => id !== articleId)
      : [...current, articleId];

    await col.updateOne(
      { userId },
      { $set: { bookmarks, updatedAt: new Date() } },
      { upsert: true },
    );

    return { ok: true, bookmarks };
  } catch (error) {
    console.error('[toggleBookmarkInDb]', error);
    return { ok: false, error: '無法儲存收藏' };
  }
}

export async function recordAIUsageInDb(
  userId: string,
  articleId: string,
): Promise<AIUsageRecord | null> {
  const today = todayKey();
  const client = await clientPromise;
  const db = client.db();
  const col = db.collection(COLLECTION);

  const doc = await col.findOne({ userId }, { projection: { aiUsage: 1 } });
  const current: AIUsageRecord =
    doc?.aiUsage?.date === today
      ? { date: today, articleIds: Array.isArray(doc.aiUsage.articleIds) ? [...doc.aiUsage.articleIds] : [] }
      : { date: today, articleIds: [] };

  if (!current.articleIds.includes(articleId)) {
    current.articleIds.push(articleId);
  }

  await col.updateOne(
    { userId },
    { $set: { aiUsage: current, updatedAt: new Date() } },
    { upsert: true },
  );

  return current;
}

export async function loadAIUsageFromDb(userId: string): Promise<AIUsageRecord | null> {
  const today = todayKey();
  const client = await clientPromise;
  const db = client.db();
  const doc = await db.collection(COLLECTION).findOne(
    { userId },
    { projection: { aiUsage: 1 } },
  );

  if (!doc?.aiUsage) return { date: today, articleIds: [] };
  if (doc.aiUsage.date !== today) return { date: today, articleIds: [] };
  return {
    date: today,
    articleIds: Array.isArray(doc.aiUsage.articleIds) ? doc.aiUsage.articleIds : [],
  };
}

export async function loadAISummariesFromDb(userId: string): Promise<AISummariesCache> {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection(COLLECTION).findOne(
      { userId },
      { projection: { aiSummaries: 1 } },
    );
    const raw = doc?.aiSummaries;
    if (!raw || typeof raw !== 'object') return {};
    return raw as AISummariesCache;
  } catch (error) {
    console.error('[loadAISummariesFromDb]', error);
    return {};
  }
}

export async function persistAISummaryToDb(
  userId: string,
  articleId: string,
  entry: AISummaryCacheEntry,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.collection(COLLECTION).updateOne(
      { userId },
      {
        $set: {
          [`aiSummaries.${articleId}`]: entry,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return { ok: true };
  } catch (error) {
    console.error('[persistAISummaryToDb]', error);
    return { ok: false, error: '無法同步 AI 摘要至雲端' };
  }
}

export async function loadAIQuizzesFromDb(userId: string): Promise<AIQuizzesCache> {
  try {
    const client = await clientPromise;
    const db = client.db();
    const doc = await db.collection(COLLECTION).findOne(
      { userId },
      { projection: { aiQuizzes: 1 } },
    );
    const raw = doc?.aiQuizzes;
    if (!raw || typeof raw !== 'object') return {};
    return raw as AIQuizzesCache;
  } catch (error) {
    console.error('[loadAIQuizzesFromDb]', error);
    return {};
  }
}

export async function persistAIQuizToDb(
  userId: string,
  articleId: string,
  entry: AIQuizCacheEntry,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const client = await clientPromise;
    const db = client.db();
    await db.collection(COLLECTION).updateOne(
      { userId },
      {
        $set: {
          [`aiQuizzes.${articleId}`]: entry,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
    return { ok: true };
  } catch (error) {
    console.error('[persistAIQuizToDb]', error);
    return { ok: false, error: '無法同步 AI 測驗至雲端' };
  }
}
