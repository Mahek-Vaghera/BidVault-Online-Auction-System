import Redis from "ioredis";

const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const isUsingUpstash = Boolean(upstashUrl && upstashToken);

const createIORedisOptions = () => {
  const redisUrl = process.env.REDIS_URL;
  if (redisUrl) {
    return {
      url: redisUrl,
      tls: redisUrl.startsWith("rediss://") ? { rejectUnauthorized: false } : undefined,
    };
  }

  return {
    host: process.env.REDIS_HOST || "localhost",
    port: Number(process.env.REDIS_PORT || 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  };
};

let ioRedisClient = null;

const getIORedisClient = () => {
  if (!ioRedisClient) {
    const options = createIORedisOptions();
    ioRedisClient = new Redis(options.url || options);
  }
  return ioRedisClient;
};

const encodeCommandPart = (value) => encodeURIComponent(String(value));

const sendUpstashCommand = async (commandParts) => {
  const commandPath = commandParts.map(encodeCommandPart).join("/");
  const response = await fetch(`${upstashUrl}/${commandPath}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${upstashToken}`,
    },
  });

  const data = await response.json();
  if (!response.ok || data.error) {
    throw new Error(data.error || "Upstash command failed");
  }

  return data.result;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export { isUsingUpstash };

export const redisGet = async (key) => {
  if (isUsingUpstash) {
    return sendUpstashCommand(["GET", key]);
  }

  const client = getIORedisClient();
  return client.get(key);
};

export const redisSetEx = async (key, value, ttlSeconds) => {
  if (isUsingUpstash) {
    return sendUpstashCommand(["SET", key, value, "EX", ttlSeconds]);
  }

  const client = getIORedisClient();
  return client.set(key, value, "EX", ttlSeconds);
};

export const redisSetNxPx = async (key, value, ttlMs) => {
  if (isUsingUpstash) {
    return sendUpstashCommand(["SET", key, value, "NX", "PX", ttlMs]);
  }

  const client = getIORedisClient();
  return client.set(key, value, "NX", "PX", ttlMs);
};

export const redisDel = async (...keys) => {
  if (!keys.length) return 0;

  if (isUsingUpstash) {
    return sendUpstashCommand(["DEL", ...keys]);
  }

  const client = getIORedisClient();
  return client.del(...keys);
};

export const redisEval = async (script, keys = [], args = []) => {
  if (isUsingUpstash) {
    return sendUpstashCommand(["EVAL", script, keys.length, ...keys, ...args]);
  }

  const client = getIORedisClient();
  return client.eval(script, keys.length, ...keys, ...args);
};

export const redisScan = async (cursor, match, count = 100) => {
  if (isUsingUpstash) {
    const result = await sendUpstashCommand(["SCAN", cursor, "MATCH", match, "COUNT", count]);
    return [String(result?.[0] ?? "0"), result?.[1] || []];
  }

  const client = getIORedisClient();
  const [nextCursor, keys] = await client.scan(cursor, "MATCH", match, "COUNT", count);
  return [String(nextCursor), keys];
};

export const acquireDistributedLock = async (
  lockKey,
  lockTimeoutMs = 5000,
  maxWaitMs = 10000,
  retryDelayMs = 50
) => {
  const lockId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const result = await redisSetNxPx(lockKey, lockId, lockTimeoutMs);
    if (result === "OK") {
      return { lockId, lockKey };
    }
    await sleep(retryDelayMs);
  }

  throw new Error("Could not acquire lock within timeout");
};

export const releaseDistributedLock = async (lock) => {
  if (!lock) return;

  const script = `
    if redis.call("get", KEYS[1]) == ARGV[1] then
      return redis.call("del", KEYS[1])
    else
      return 0
    end
  `;

  try {
    await redisEval(script, [lock.lockKey], [lock.lockId]);
  } catch (error) {
    console.error("Error releasing lock:", error.message);
  }
};