import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';
import { MongoClient } from 'mongodb';

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
const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const db = client.db();
const users = await db.collection('users').find({}).toArray();
const accounts = await db.collection('accounts').find({}).toArray();
console.log('users', users.length, 'accounts', accounts.length);
for (const u of users) {
  const linked = accounts.filter((a) => a.userId?.toString() === u._id.toString());
  console.log(
    JSON.stringify({
      id: u._id.toString(),
      email: u.email,
      linked: linked.map((a) => ({
        provider: a.provider,
        type: a.type,
        providerAccountId: a.providerAccountId,
        userId: a.userId?.toString(),
      })),
    }),
  );
}
console.log('sessions', await db.collection('sessions').countDocuments());
await client.close();
