import IORedis from "ioredis";

const globalForQueueRedis = globalThis as unknown as { queueRedis?: IORedis };

// BullMQ needs its own connection (it uses blocking commands and requires
// maxRetriesPerRequest: null) — separate from the general-purpose rate-limit
// client in lib/utilis/redis.ts.
export const queueConnection =
  globalForQueueRedis.queueRedis ??
  new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== "production") {
  globalForQueueRedis.queueRedis = queueConnection;
}
