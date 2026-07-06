import { LogIn } from 'lucide-react';
import { auth, signIn } from '@/app/auth';
import { ChannelClient } from '@/components/channel/ChannelClient';

export default async function ChannelPage() {
  const session = await auth();

  if (!session) {
    return (
      <main className="pt-24 pb-32 px-4 max-w-md mx-auto">
        <section className="ui-card p-8 text-center space-y-6 mt-12">
          <h3 className="text-2xl font-bold ui-heading">Channel 學習頻道</h3>
          <p className="ui-muted text-sm leading-relaxed">
            登入後可從收藏文章中選擇一篇，用麥克風與 AI 練習口說、討論新聞內容。
          </p>
          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/channel' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 font-bold py-3.5 px-4 rounded-xl transition shadow-sm"
            >
              <LogIn size={18} className="text-blue-600" />
              <span>使用 Google 帳號登入</span>
            </button>
          </form>
        </section>
      </main>
    );
  }
  

  return <ChannelClient />;
}
