import { getRedis, warnRedisUnavailable } from "../configs/redis.js";

const positiveInteger = (value, fallback) => {
  const parsed = Number.parseInt(value || "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const withTimeout = (promise, timeoutMs = 1200) => Promise.race([
  promise,
  new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis command timed out")), timeoutMs);
    timer.unref?.();
  }),
]);

const aiRateLimit = async (req, res, next) => {
  const limit = positiveInteger(process.env.AI_RATE_LIMIT_MAX, 20);
  const windowSeconds = positiveInteger(process.env.AI_RATE_LIMIT_WINDOW_SECONDS, 3600);
  const key = `rl:ai:${req.userId}`;

  res.set("X-RateLimit-Limit", String(limit));
  res.set("X-RateLimit-Remaining", String(limit));

  let redis;
  try {
    redis = getRedis();
    if (!redis) return next();

    const count = await withTimeout(redis.incr(key));
    if (count === 1) await withTimeout(redis.expire(key, windowSeconds));

    const remaining = Math.max(0, limit - count);
    res.set("X-RateLimit-Remaining", String(remaining));

    if (count > limit) {
      const ttl = await withTimeout(redis.ttl(key));
      const retryAfter = ttl > 0 ? ttl : windowSeconds;
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({ message: "AI request rate limit exceeded. Try again later." });
    }

    return next();
  } catch (error) {
    warnRedisUnavailable("rate limit", error);
    return next();
  }
};

export default aiRateLimit;
