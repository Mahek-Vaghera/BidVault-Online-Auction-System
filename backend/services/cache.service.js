import { redisDel, redisGet, redisScan, redisSetEx } from "./redis.service.js";

export const cacheGetJson = async (key) => {
  try {
    const value = await redisGet(key);
    if (!value) return null;
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const cacheSetJson = async (key, value, ttlSeconds = 60) => {
  try {
    await redisSetEx(key, JSON.stringify(value), ttlSeconds);
  } catch (error) {
    // Cache failures should not break API flows.
  }
};

export const cacheDelete = async (key) => {
  try {
    await redisDel(key);
  } catch (error) {
    // no-op
  }
};

export const cacheDeleteByPrefix = async (prefix) => {
  try {
    let cursor = "0";
    do {
      const [nextCursor, keys] = await redisScan(cursor, `${prefix}*`, 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        await redisDel(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    // no-op
  }
};