// app/login/page.tsx

'use client';



import { signIn } from 'next-auth/react';

import { LogIn } from 'lucide-react';

import { useSearchParams } from 'next/navigation';

import { Suspense } from 'react';



function LoginContent() {

  const searchParams = useSearchParams();

  const error = searchParams.get('error');



  return (

    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-background">

      <div className="ui-card p-8 shadow-md max-w-sm w-full text-center space-y-6">

        <h2 className="text-2xl font-bold ui-heading">歡迎回到 News App</h2>

        <p className="ui-muted text-sm">請選擇一種方式登入以儲存你的 AI 學習進度</p>



        {error && (

          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 border border-red-100 dark:border-red-900 rounded-lg p-3">

            {error === 'OAuthAccountNotLinked'
              ? '此 Google 信箱曾以其他方式建立過帳號，系統已調整連結設定；請再試一次登入。若仍失敗請聯絡管理員。'
              : `登入失敗（${error}）。請確認 Google OAuth 與 MongoDB 環境變數已正確設定。`}

          </p>

        )}



        <button

          onClick={() => signIn("google", { redirectTo: "/profile" })}

          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-gray-200 font-semibold py-3 px-4 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-700 active:scale-[0.99] transition shadow-sm"

        >

          <LogIn size={18} />

          <span>使用 Google 帳號登入</span>

        </button>

      </div>

    </main>

  );

}



export default function LoginPage() {

  return (

    <Suspense fallback={<main className="min-h-screen bg-background" />}>

      <LoginContent />

    </Suspense>

  );

}

