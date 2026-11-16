import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
  memoryServer?: any;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

let cached: MongooseCache = global.mongooseCache || { conn: null, promise: null };

if (!global.mongooseCache) {
  global.mongooseCache = cached;
}

export async function connectToDatabase(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = (async () => {
      let uri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/sidheshwar_jewellers";

      try {
        const m = await mongoose.connect(uri, opts);
        return m;
      } catch (err: any) {
        console.warn(`Initial MongoDB connection to ${uri} failed: ${err.message}.`);

        // If local dev or test, attempt in-memory server fallback so the app works seamlessly
        if (process.env.NODE_ENV !== "production") {
          try {
            console.info("Starting local fallback in-memory MongoDB instance for development/testing...");
            const { MongoMemoryServer } = await import("mongodb-memory-server");
            const mongod = await MongoMemoryServer.create();
            uri = mongod.getUri();
            cached.memoryServer = mongod;
            const m = await mongoose.connect(uri, opts);
            console.info(`Connected to in-memory MongoDB at ${uri}`);
            return m;
          } catch (memErr: any) {
            console.error("Failed to start in-memory MongoDB fallback:", memErr.message);
            throw err;
          }
        }
        throw err;
      }
    })();
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default connectToDatabase;
