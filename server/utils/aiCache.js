import { createHash } from "node:crypto";
import { getRedis, warnRedisUnavailable } from "../configs/redis.js";

const withTimeout = (promise, timeoutMs = 1200) => Promise.race([
  promise,
  new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error("Redis command timed out")), timeoutMs);
    timer.unref?.();
  }),
]);

export const normalizeAiInput = (input) => {
  if (typeof input === "string") return input.trim().replace(/\s+/g, " ");
  return input;
};

export const createAiCacheKey = ({ endpoint, userId, input }) => {
  const digest = createHash("sha256")
    .update(JSON.stringify({ endpoint, userId: String(userId), input: normalizeAiInput(input) }))
    .digest("hex");
  return `aicache:${digest}`;
};

export const getOrSetCached = async (key, ttlSeconds, computeFn) => {
  let redis;
  try {
    redis = getRedis();
  } catch (error) {
    warnRedisUnavailable("cache connection", error);
    return { value: await computeFn(), status: "BYPASS" };
  }

  if (!redis) return { value: await computeFn(), status: "BYPASS" };

  try {
    const cached = await withTimeout(redis.get(key));
    if (cached !== null) {
      return { value: JSON.parse(cached), status: "HIT" };
    }
  } catch (error) {
    warnRedisUnavailable("cache read", error);
    return { value: await computeFn(), status: "BYPASS" };
  }

  const value = await computeFn();
  try {
    const ttl = Number.parseInt(String(ttlSeconds), 10);
    await withTimeout(redis.set(key, JSON.stringify(value), "EX", Number.isFinite(ttl) && ttl > 0 ? ttl : 86400));
    return { value, status: "MISS" };
  } catch (error) {
    warnRedisUnavailable("cache write", error);
    return { value, status: "BYPASS" };
  }
};
