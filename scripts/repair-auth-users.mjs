/**
 * 合併 MongoDB 中同 email 的重複 users，並將 Google account 連到保留的使用者。
 * 用法：node scripts/repair-auth-users.mjs
 */
import { MongoClient } from 'mongodb';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvLocal() {
  const path = resolve(process.cwd(), '.env.local');
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
}

loadEnvLocal();

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error('缺少 MONGODB_URI');
  process.exit(1);
}

const client = new MongoClient(uri);

function normalizeId(value) {
  if (value == null) return null;
  return typeof value === 'object' && value.toString ? value.toString() : String(value);
}

async function main() {
  await client.connect();
  const db = client.db();
  const users = db.collection('users');
  const accounts = db.collection('accounts');
  const profiles = db.collection('user_profiles');

  const allUsers = await users.find({}).toArray();
  const byEmail = new Map();
  for (const u of allUsers) {
    const email = u.email?.toLowerCase?.();
    if (!email) continue;
    if (!byEmail.has(email)) byEmail.set(email, []);
    byEmail.get(email).push(u);
  }

  let merged = 0;
  for (const [email, group] of byEmail) {
    if (group.length < 2) continue;

    const withAccounts = [];
    for (const u of group) {
      const count = await accounts.countDocuments({ userId: u._id });
      if (count > 0) withAccounts.push(u);
    }

    const keep =
      withAccounts[0] ??
      group.sort((a, b) => (a._id.toString() > b._id.toString() ? 1 : -1))[0];
    const drop = group.filter((u) => u._id.toString() !== keep._id.toString());

    for (const dupe of drop) {
      await accounts.updateMany({ userId: dupe._id }, { $set: { userId: keep._id } });
      const keepUserId = normalizeId(keep._id);
      const dupeUserId = normalizeId(dupe._id);
      if (keepUserId && dupeUserId) {
        await profiles.updateMany({ userId: dupeUserId }, { $set: { userId: keepUserId } });
      }
      await users.deleteOne({ _id: dupe._id });
      merged += 1;
      console.info('[repair] merged duplicate', email, '→', keep._id.toString());
    }
  }

  const accountRows = await accounts.find({ provider: 'google' }).toArray();
  for (const acc of accountRows) {
    const pid = acc.providerAccountId;
    if (pid == null) continue;
    const asString = String(pid);
    if (pid !== asString) {
      await accounts.updateOne({ _id: acc._id }, { $set: { providerAccountId: asString } });
      console.info('[repair] normalized providerAccountId', asString);
    }
  }

  console.info('[repair] done, removed duplicate users:', merged);
  await client.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
