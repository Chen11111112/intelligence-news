'use client';

import Link from 'next/link';
import { LogIn } from 'lucide-react';
import { t } from '@/lib/copy';

interface AILoginPromptProps {
  message?: string;
  className?: string;
}

export function AILoginPrompt({ message, className }: AILoginPromptProps) {
  return (
    <div className={className ?? 'rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50/80 dark:bg-amber-950/30 p-4 text-center space-y-3'}>
      <p className="text-sm text-amber-900 dark:text-amber-200">{message ?? t('ai.loginRequired')}</p>
      <Link
        href="/login"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-semibold hover:bg-slate-800 transition"
      >
        <LogIn size={16} />
        {t('ai.loginAction')}
      </Link>
    </div>
  );
}
