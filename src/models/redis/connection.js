import Redis from 'ioredis';
import config from '../config/index.js';
import { logger } from '../utils/logger.js';

let redis = null;

export function createRedisClient() {
  if (!redis) {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password || undefined,
      db: config.redis.db,
      retryStrategy: (times) => Math.min(times * 200, 5000),
      maxRetriesPerRequest: 3,
    });

    redis.on('connect', () => logger.info('Redis connected'));
    redis.on('error', (err) => logger.error('Redis error', { error: err.message }));
  }
  return redis;
}

export function getRedis() {
  if (!redis) createRedisClient();
  return redis;
}

// --- 便捷方法 ---

/** 存储短信验证码 (5分钟有效) */
export async function setSmsCode(phone, code) {
  const r = getRedis();
  await r.set(`sms:code:${phone}`, code, 'EX', 300);
}

/** 获取短信验证码 */
export async function getSmsCode(phone) {
  const r = getRedis();
  return r.get(`sms:code:${phone}`);
}

/** 检查短信发送频率 (60秒间隔) */
export async function checkSmsRateLimit(phone) {
  const r = getRedis();
  const key = `sms:rate:${phone}`;
  const exists = await r.get(key);
  if (exists) return false;
  await r.set(key, '1', 'EX', 60);
  return true;
}

/** 设置用户 Token 黑名单 (登出时) */
export async function blacklistToken(token, ttlSeconds) {
  const r = getRedis();
  await r.set(`token:blacklist:${token}`, '1', 'EX', ttlSeconds);
}

/** 检查 Token 是否在黑名单 */
export async function isTokenBlacklisted(token) {
  const r = getRedis();
  return (await r.get(`token:blacklist:${token}`)) !== null;
}

/** 缓存岗位列表 */
export async function cacheJobList(key, data, ttl = 300) {
  const r = getRedis();
  await r.set(`cache:${key}`, JSON.stringify(data), 'EX', ttl);
}

export async function getCachedJobList(key) {
  const r = getRedis();
  const data = await r.get(`cache:${key}`);
  return data ? JSON.parse(data) : null;
}

export async function closeRedis() {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}
