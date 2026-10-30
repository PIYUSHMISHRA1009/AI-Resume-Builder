import Redis from "ioredis";

let redisClient = null;
let connectionWarningLogged = false;

export const warnRedisUnavailable = (operation, error) => {
  console.warn(`Redis ${operation} failed; continuing without Redis.`, {
    name: error?.name || "Error",
    code: error?.code,
  });
};

export const getRedis = () => {
  if (!process.env.REDIS_URL) return null;
  if (redisClient) return redisClient;

  redisClient = new Redis(process.env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    connectTimeout: 1000,
    commandTimeout: 1000,
    retryStrategy: () => null,
  });

  redisClient.on("error", (error) => {
    if (connectionWarningLogged) return;
    connectionWarningLogged = true;
    warnRedisUnavailable("connection", error);
  });

  return redisClient;
};
