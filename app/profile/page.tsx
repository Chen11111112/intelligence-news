import { auth } from '@/app/auth';
import ProfileForm from '@/components/Profile/ProfileForm';
import {
  getUserProfileFromDb,
  toUserProfileClient,
  type UserProfileClient,
} from '@/lib/user/profile-db';
import { SignInPromptCard } from '@/components/SignInPromptCard';

export default async function ProfilePage() {
  const session = await auth();
  let initialProfile: UserProfileClient | null = null;
  let profileLoadError: string | null = null;

  if (session?.user?.id) {
    try {
      initialProfile = toUserProfileClient(
        await getUserProfileFromDb(session.user.id, session.user.email),
      );
    } catch (error) {
      console.error('[profile/page]', error);
      profileLoadError = '無法從資料庫載入個人設定，請確認 MONGODB_URI 與網路連線。';
    }
  }

  return (
    <div className="pt-below-app-header pb-28 sm:pb-32 px-4 w-full min-w-0 max-w-2xl mx-auto space-y-10 ui-page box-border">
      {session ? (
        <ProfileForm
          session={session}
          initialProfile={initialProfile}
          profileLoadError={profileLoadError}
        />
      ) : (
        <SignInPromptCard
          title="專屬你的 AI 學習檔案"
          description="登入後，AI 智慧導師將會精確記錄你的英文檢定目標，為你量身打造專屬的網頁摘要與字彙測驗！"
          redirectTo="/profile"
          buttonLabel="使用 Google 帳號快速登入"
        />
      )}
    </div>
  );
}
