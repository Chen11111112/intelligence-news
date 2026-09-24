import { MongoDBAdapter } from '@auth/mongodb-adapter';
import type { Adapter } from '@auth/core/adapters';
import clientPromise from '@/lib/db';

/** Google `sub` 超過 2^53-1 時不可當 number 比對，一律以字串查詢／寫入。 */
function normalizeProviderAccountId(id: string | number | undefined): string {
  return id == null ? '' : String(id);
}

export function createAuthAdapter(): Adapter {
  const base = MongoDBAdapter(clientPromise);

  return {
    ...base,
    getUserByAccount(providerAccount) {
      if (!base.getUserByAccount) return null;
      return base.getUserByAccount({
        ...providerAccount,
        providerAccountId: normalizeProviderAccountId(providerAccount.providerAccountId),
      });
    },
    linkAccount(account) {
      if (!base.linkAccount) return;
      return base.linkAccount({
        ...account,
        providerAccountId: normalizeProviderAccountId(account.providerAccountId),
      });
    },
  };
}
