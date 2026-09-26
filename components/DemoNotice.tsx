'use client';

import { useEffect, useId, useState } from 'react';
import { X } from 'lucide-react';
import { t } from '@/lib/copy';

const CONTACT_URL = 'https://hyc.eshachem.com/';
const SCREENSHOTS_URL = 'https://drive.google.com/drive/folders/1BCysrZ6tyHPh1IoUAIAR1A-cwqQQrRle?usp=sharing';

export function DemoNotice() {
  const titleId = useId();
  const [open, setOpen] = useState(true);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 ui-overlay" role="presentation" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="ui-modal w-full max-w-md relative z-10 p-6 space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-bold ui-heading leading-snug">
            {t('demo.title')}
          </h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t('common.close')}
            className="p-1 rounded-lg text-slate-400 dark:text-gray-500 hover:bg-slate-50 dark:hover:bg-gray-700 hover:text-slate-600 dark:hover:text-gray-300 transition shrink-0"
          >
            <X size={20} />
          </button>
        </div>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-gray-300">{t('demo.body')}</p>
        <p className="text-sm leading-relaxed text-slate-600 dark:text-gray-300">{t('demo.contact')}</p>
        <div className="flex flex-col gap-2 pt-1">
          <a
            href={SCREENSHOTS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center font-semibold py-3 px-4 rounded-xl ui-btn-secondary transition"
          >
            {t('demo.screenshots')}
          </a>
          <a
            href={CONTACT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full text-center bg-slate-900 text-white font-bold py-3 px-4 rounded-xl hover:bg-slate-800 transition"
          >
            {t('demo.contactAction')}
          </a>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="w-full font-semibold py-3 px-4 rounded-xl ui-btn-secondary transition"
          >
            {t('demo.dismiss')}
          </button>
        </div>
      </div>
    </div>
  );
}
