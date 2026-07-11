import 'server-only';

import { loadAIUsageFromDb, recordAIUsageInDb } from '@/lib/user/profile-db';
import { canUseAI, todayKey, type AIUsageRecord } from '@/lib/user/types';

export async function requireAIQuota(userId: string, articleId: string): Promise<AIUsageRecord> {
  const usage =
    (await loadAIUsageFromDb(userId)) ?? { date: todayKey(), articleIds: [] };
  const check = canUseAI(articleId, usage);
  if (!check.allowed) {
    throw new Error(check.reason ?? '今日 AI 額度已用完，請明日再試。');
  }
  return usage;
}

export async function recordAIQuotaUsage(
  userId: string,
  articleId: string,
): Promise<AIUsageRecord | null> {
  return recordAIUsageInDb(userId, articleId);
}
