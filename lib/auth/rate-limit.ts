import { redis } from "@/lib/utilis/redis";

interface RateLimitParams {
  /** Unique key for the thing being limited, e.g. `login:ip:1.2.3.4` or `login:email:a@b.com`. */
  key: string;
  limit: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/** Fixed-window counter backed by Redis. Cheap and good enough for auth endpoints. */
export async function checkRateLimit({
  key,
  limit,
  windowSeconds,
}: RateLimitParams): Promise<RateLimitResult> {
  const redisKey = `ratelimit:${key}`;

  const count = await redis.incr(redisKey);
  if (count === 1) {
    await redis.expire(redisKey, windowSeconds);
  }

  const ttl = await redis.ttl(redisKey);
  const retryAfterSeconds = ttl > 0 ? ttl : windowSeconds;

  return {
    allowed: count <= limit,
    remaining: Math.max(0, limit - count),
    retryAfterSeconds,
  };
}
