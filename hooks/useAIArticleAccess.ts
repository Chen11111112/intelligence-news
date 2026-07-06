'use client';

import { recordAIUsageInDb } from '@/app/actions/user';
import { useUserSettings } from '@/hooks/useUserSettings';
import { canUseAI, getDailyAILimit, recordAIUsage, saveUserSettings } from '@/lib/user';

export function useAIArticleAccess(articleId: string) {
  const { settings, ready, refresh } = useUserSettings();

  const checkAccess = () => {
    if (!ready || !settings) {
      return { allowed: false as const, reason: '載入使用者設定中…' };
    }
    return canUseAI(articleId, settings.aiUsage);
  };

  const recordUsage = () => {
    const usage = recordAIUsage(articleId);
    refresh();
    void recordAIUsageInDb(articleId).then((dbUsage) => {
      if (dbUsage) {
        saveUserSettings({ aiUsage: dbUsage });
        refresh();
      }
    });
    return usage;
  };

  const limit = getDailyAILimit();
  const used = settings?.aiUsage.articleIds.length ?? 0;

  return {
    ready,
    checkAccess,
    recordUsage,
    usageLabel: `今日 AI ${used}/${limit} 篇`,
  };
}
