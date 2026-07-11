'use client';

import { recordAIUsageInDb } from '@/app/actions/user';
import { useUserSettings } from '@/hooks/useUserSettings';
import { t } from '@/lib/copy';
import { canUseAI, getDailyAILimit, recordAIUsage, saveUserSettings } from '@/lib/user';
import { useSession } from 'next-auth/react';

export type AIAccessResult = {
  allowed: boolean;
  reason?: string;
  needsLogin?: boolean;
};

export function useAIArticleAccess(articleId: string) {
  const { data: session, status } = useSession();
  const { settings, ready, refresh } = useUserSettings();

  const checkAccess = (): AIAccessResult => {
    if (status === 'loading') {
      return { allowed: false, reason: t('common.loading') };
    }
    if (!session?.user) {
      return { allowed: false, reason: t('ai.loginRequired'), needsLogin: true };
    }
    if (!ready || !settings) {
      return { allowed: false, reason: t('common.loading') };
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
  const isLoggedIn = Boolean(session?.user);

  return {
    ready: ready && status !== 'loading',
    isLoggedIn,
    checkAccess,
    recordUsage,
    usageLabel: isLoggedIn ? `今日 AI ${used}/${limit} 篇` : t('ai.loginRequired'),
  };
}
