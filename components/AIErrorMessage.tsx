'use client';

import Link from 'next/link';
import { t } from '@/lib/copy';

interface AIErrorMessageProps {
  message: string;
  needsLogin?: boolean;
  className?: string;
}

export function AIErrorMessage({ message, needsLogin, className }: AIErrorMessageProps) {
  return (
    <div className={className ?? 'text-xs text-red-500 text-center space-y-2'}>
      <p>{message}</p>
      {needsLogin && (
        <Link href="/login" className="inline-block text-blue-600 dark:text-blue-400 font-semibold hover:underline">
          {t('ai.loginAction')} →
        </Link>
      )}
    </div>
  );
}
