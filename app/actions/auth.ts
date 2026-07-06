'use server';

import { signOut } from '@/app/auth';

export async function logoutAction() {
  await signOut({ redirectTo: '/' });
}
