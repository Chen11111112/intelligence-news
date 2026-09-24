import { auth } from '@/app/auth';
import { SignInPromptCard } from '@/components/SignInPromptCard';
import { ChannelClient } from '@/components/channel/ChannelClient';

export default async function ChannelPage() {
  const session = await auth();

  if (!session) {
    return (
      <main className="pt-20 sm:pt-24 pb-28 sm:pb-32 px-4 w-full min-w-0 max-w-md mx-auto box-border">
        <SignInPromptCard
          title="Channel 學習頻道"
          description="登入後可從收藏文章中選擇一篇，用麥克風與 AI 練習口說、討論新聞內容。"
          redirectTo="/channel"
        />
      </main>
    );
  }
  

  return <ChannelClient />;
}
