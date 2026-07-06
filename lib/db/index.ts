import { MongoClient, ServerApiVersion } from 'mongodb';

const uri = process.env.MONGODB_URI;

function createClient(): MongoClient {
  if (!uri) {
    throw new Error(
      '請在 .env.local（本機）或 Vercel 環境變數中設定 MONGODB_URI。範例見專案根目錄 .env.example',
    );
  }

  return new MongoClient(uri, {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
  });
}

declare global {
  // eslint-disable-next-line no-var
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function connectMongo(): Promise<MongoClient> {
  if (process.env.NODE_ENV === 'development') {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = createClient().connect();
    }
    return global._mongoClientPromise;
  }
  return createClient().connect();
}

let clientPromise: Promise<MongoClient> | undefined;

/** 延遲連線，避免 build / 靜態分析階段觸發 MongoDB */
function getClientPromise(): Promise<MongoClient> {
  if (!clientPromise) {
    clientPromise = connectMongo();
  }
  return clientPromise;
}

const lazyClientPromise: Promise<MongoClient> = {
  then(onFulfilled, onRejected) {
    return getClientPromise().then(onFulfilled, onRejected);
  },
  catch(onRejected) {
    return getClientPromise().catch(onRejected);
  },
  finally(onFinally) {
    return getClientPromise().finally(onFinally);
  },
} as Promise<MongoClient>;

export default lazyClientPromise;

export async function pingMongo(): Promise<boolean> {
  if (!uri) return false;
  try {
    const client = await lazyClientPromise;
    await client.db().command({ ping: 1 });
    return true;
  } catch {
    return false;
  }
}
