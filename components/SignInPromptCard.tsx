import { signIn } from '@/app/auth';
import { LogIn } from 'lucide-react';

type SignInPromptCardProps = {
  title: string;
  description: string;
  redirectTo: string;
  buttonLabel?: string;
};

export function SignInPromptCard({
  title,
  description,
  redirectTo,
  buttonLabel = '使用 Google 帳號登入',
}: SignInPromptCardProps) {
  return (
    <section className="ui-card w-full max-w-md mx-auto box-border overflow-hidden p-5 sm:p-8 text-center space-y-5 sm:space-y-6 mt-8 sm:mt-12">
      <div className="space-y-2 min-w-0">
        <h3 className="text-xl sm:text-2xl font-bold ui-heading text-balance">{title}</h3>
        <p className="ui-muted text-sm leading-relaxed text-pretty">{description}</p>
      </div>

      <form
        className="w-full min-w-0"
        action={async () => {
          'use server';
          await signIn('google', { redirectTo });
        }}
      >
        <button
          type="submit"
          className="w-full max-w-full box-border flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 font-bold py-3 sm:py-3.5 px-3 sm:px-4 rounded-xl active:scale-[0.99] transition shadow-sm text-sm sm:text-base leading-snug"
        >
          <LogIn size={18} className="shrink-0 text-blue-600" aria-hidden />
          <span className="min-w-0 break-words">{buttonLabel}</span>
        </button>
      </form>
    </section>
  );
}
