import { auth, signIn } from "@/app/auth"; // 確保此路徑指向你的 auth.ts
import { LogIn } from 'lucide-react';
import ProfileForm from '@/components/Profile/ProfileForm'; // 引入我們切出去的客戶端表單

export default async function ProfilePage() {
  // 1. 在 Server 端直接獲取登入狀態，效能極高
  const session = await auth();

  return (
    <main className="pt-24 pb-32 px-4 max-w-2xl mx-auto space-y-10 ui-page">
      {session ? (
        /* 狀況 A：使用者已登入，直接渲染 Client 表單，並把 session 丟下去 */
        <ProfileForm session={session} />
      ) : (
        /* 狀況 B：使用者未登入，原地展示精緻的 Google 登入邀請卡片 */
        <section className="ui-card p-8 max-w-md mx-auto text-center space-y-6 mt-12">
          <div className="space-y-2">
            <h3 className="text-2xl font-bold ui-heading">專屬你的 AI 學習檔案</h3>
            <p className="ui-muted text-sm leading-relaxed">
              登入後，AI 智慧導師將會精確記錄你的英文檢定目標，為你量身打造專屬的網頁摘要與字彙測驗！
            </p>
          </div>

          <form
            action={async () => {
              'use server';
              await signIn('google', { redirectTo: '/profile' });
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 hover:bg-slate-50 dark:hover:bg-gray-700 font-bold py-3.5 px-4 rounded-xl active:scale-[0.99] transition shadow-sm"
            >
              <LogIn size={18} className="text-blue-600" />
              <span>使用 Google 帳號快速登入</span>
            </button>
          </form>
        </section>
      )}
    </main>
  );
}