import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import { createAuthAdapter } from '@/lib/auth/mongodb-adapter';
import { ensureAuthEnv, getAuthUrl, getGoogleRedirectUri } from '@/lib/auth-url';

ensureAuthEnv();

const authUrl = getAuthUrl();
const googleClientId = process.env.AUTH_GOOGLE_ID?.trim();
const googleClientSecret = process.env.AUTH_GOOGLE_SECRET?.trim();
const useSecureCookies = authUrl?.startsWith('https://') ?? process.env.NODE_ENV === 'production';

if (process.env.NODE_ENV !== 'production') {
  console.info('[auth] AUTH_URL =', authUrl);
  console.info('[auth] Google redirect =', getGoogleRedirectUri());
}

if (process.env.NODE_ENV === 'production') {
  if (!authUrl) {
    console.error('[auth] 缺少 AUTH_URL / NEXTAUTH_URL');
  } else {
    console.info('[auth] AUTH_URL =', authUrl);
    console.info('[auth] Google redirect =', getGoogleRedirectUri());
  }
  if (!googleClientId || !googleClientSecret) {
    console.error('[auth] 缺少 AUTH_GOOGLE_ID 或 AUTH_GOOGLE_SECRET');
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: createAuthAdapter(),
  providers: [
    Google({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
      allowDangerousEmailAccountLinking: true,
    }),
  ],
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  basePath: '/api/auth',
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'database',
  },
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider === 'google') {
        const sub = profile && 'sub' in profile ? profile.sub : undefined;
        if (typeof sub === 'string') {
          account.providerAccountId = sub;
        } else if (account.providerAccountId != null) {
          account.providerAccountId = String(account.providerAccountId);
        }
      }
      return true;
    },
    async session({ session, user }) {
      if (session.user && user.id) {
        session.user.id = user.id;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      if (url.startsWith('/')) return `${baseUrl}${url}`;
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  cookies: {
    sessionToken: {
      name: useSecureCookies ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: useSecureCookies ? '__Secure-authjs.callback-url' : 'authjs.callback-url',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: useSecureCookies ? '__Host-authjs.csrf-token' : 'authjs.csrf-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  events: {
    async createUser({ user }) {
      console.info('[auth] MongoDB user created:', user.id, user.email);
    },
    async linkAccount({ user }) {
      console.info('[auth] Account linked for user:', user.id);
    },
  },
});
