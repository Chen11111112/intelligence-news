import 'server-only';

import { auth } from '@/app/auth';
import { AI_LOGIN_REQUIRED_MESSAGE } from '@/lib/ai/nim';

export async function requireAIAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error(AI_LOGIN_REQUIRED_MESSAGE);
  }
  return session;
}
